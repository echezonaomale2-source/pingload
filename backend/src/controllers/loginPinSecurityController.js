const User = require('../models/User');
const { recordSecurityEvent } = require('../services/securityEventService');
const { deliverUserNotification } = require('../services/notificationDeliveryService');
const { sendSecurityAlertEmail } = require('../services/termiiService');

const LOCK_DURATION_MS = 60 * 60 * 1000;
const WARN_AFTER = 3;
const LOCK_AFTER = 5;

const getClientMeta = (req) => ({
  deviceInfo: req.body?.deviceInfo || req.headers['x-device-info'] || null,
  location: req.body?.location || null,
});

const getLockStatus = (user) => {
  const now = Date.now();
  const lockedUntil = user.loginPinLockedUntil ? new Date(user.loginPinLockedUntil).getTime() : 0;
  const isLocked = lockedUntil > now;

  return {
    failedAttempts: user.loginPinFailedAttempts || 0,
    isLocked,
    lockedUntil: isLocked ? new Date(lockedUntil).toISOString() : null,
    remainingSeconds: isLocked ? Math.ceil((lockedUntil - now) / 1000) : 0,
    warnAtAttempt: WARN_AFTER,
    lockAtAttempt: LOCK_AFTER,
    requireLoginPinReset: Boolean(user.requireLoginPinReset),
  };
};

const autoUnlockIfExpired = async (user) => {
  if (!user.loginPinLockedUntil) return user;
  if (new Date(user.loginPinLockedUntil).getTime() <= Date.now()) {
    user.loginPinLockedUntil = null;
    user.loginPinFailedAttempts = 0;
    await user.save();
  }
  return user;
};

const getLoginPinStatus = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    user = await autoUnlockIfExpired(user);
    res.json({ success: true, data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

const notifyAccountLocked = async (user, req) => {
  const title = 'Security Alert';
  const message =
    "Your Pingload account has been temporarily locked for 1 hour after multiple incorrect PIN attempts. If this wasn't you, change your password after regaining access or contact Pingload Support immediately.";

  await recordSecurityEvent({
    userId: user._id,
    eventType: 'login_pin_locked',
    severity: 'critical',
    message: 'Login PIN locked for 1 hour after 5 failed attempts',
    req,
    ...getClientMeta(req),
    metadata: { failedAttempts: LOCK_AFTER },
  });

  await deliverUserNotification({
    userId: user._id,
    title,
    message,
    type: 'security',
    screen: 'Security',
    push: user.notificationSettings?.security !== false,
    metadata: { event: 'login_pin_locked' },
  });

  if (user.email) {
    await sendSecurityAlertEmail(
      user.email,
      title,
      message
    );
  }
};

const recordLoginPinFailure = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    user = await autoUnlockIfExpired(user);

    const statusBefore = getLockStatus(user);
    if (statusBefore.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Login PIN is temporarily locked. Please try again later.',
        data: statusBefore,
      });
    }

    user.loginPinFailedAttempts = (user.loginPinFailedAttempts || 0) + 1;

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'login_pin_failed',
      severity: user.loginPinFailedAttempts >= WARN_AFTER ? 'high' : 'medium',
      message: `Failed login PIN attempt (${user.loginPinFailedAttempts}/${LOCK_AFTER})`,
      req,
      ...getClientMeta(req),
      metadata: { attempt: user.loginPinFailedAttempts },
    });

    let locked = false;
    if (user.loginPinFailedAttempts >= LOCK_AFTER) {
      user.loginPinLockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.requireLoginPinReset = true;
      locked = true;
      await user.save();
      await notifyAccountLocked(user, req);
    } else {
      await user.save();
    }

    const status = getLockStatus(user);
    const response = {
      success: false,
      message: locked
        ? 'Your account has been temporarily locked for 1 hour after multiple incorrect PIN attempts.'
        : status.failedAttempts === WARN_AFTER
          ? 'Warning: One more incorrect PIN attempt may temporarily lock your account.'
          : 'Incorrect PIN.',
      data: status,
    };

    return res.status(locked ? 423 : 401).json(response);
  } catch (error) {
    next(error);
  }
};

const recordLoginPinSuccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    await user.save();

    res.json({ success: true, data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

const clearLoginPinResetRequirement = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.requireLoginPinReset = false;
    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    await user.save();
    res.json({ success: true, data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLoginPinStatus,
  recordLoginPinFailure,
  recordLoginPinSuccess,
  clearLoginPinResetRequirement,
  LOCK_AFTER,
  WARN_AFTER,
};
