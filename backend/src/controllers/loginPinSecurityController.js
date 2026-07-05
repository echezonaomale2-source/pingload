const { body } = require('express-validator');
const User = require('../models/User');
const { recordSecurityEvent } = require('../services/securityEventService');
const { deliverUserNotification } = require('../services/notificationDeliveryService');
const { sendSecurityAlertEmail } = require('../services/termiiService');

const LOCK_DURATION_MS = 60 * 60 * 1000;
const APP_UNLOCK_MS = 12 * 60 * 60 * 1000;
const WARN_AFTER = 3;
const LOCK_AFTER = 5;

const loginPinValidation = body('pin')
  .matches(/^\d{4,6}$/)
  .withMessage('Login PIN must be 4–6 digits');

const getClientMeta = (req) => ({
  deviceInfo: req.body?.deviceInfo || req.headers['x-device-info'] || null,
  location: req.body?.location || null,
});

const getLockStatus = (user) => {
  const now = Date.now();
  const lockedUntil = user.loginPinLockedUntil ? new Date(user.loginPinLockedUntil).getTime() : 0;
  const isLocked = lockedUntil > now;

  return {
    hasLoginPin: Boolean(user.hasLoginPin),
    failedAttempts: user.loginPinFailedAttempts || 0,
    isLocked,
    lockedUntil: isLocked ? new Date(lockedUntil).toISOString() : null,
    remainingSeconds: isLocked ? Math.ceil((lockedUntil - now) / 1000) : 0,
    warnAtAttempt: WARN_AFTER,
    lockAtAttempt: LOCK_AFTER,
    requireLoginPinReset: Boolean(user.requireLoginPinReset),
    appUnlocked: Boolean(user.appUnlockedUntil && new Date(user.appUnlockedUntil) > new Date()),
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

const grantAppUnlock = (user) => {
  user.appUnlockedUntil = new Date(Date.now() + APP_UNLOCK_MS);
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
    await sendSecurityAlertEmail(user.email, title, message);
  }
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

const setupLoginPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    let user = await User.findById(req.user._id).select('+loginPin hasLoginPin loginPinLockedUntil requireLoginPinReset');
    user = await autoUnlockIfExpired(user);

    const statusBefore = getLockStatus(user);
    if (statusBefore.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Login PIN is temporarily locked. Please try again later.',
        data: statusBefore,
      });
    }

    user.loginPin = pin;
    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    user.requireLoginPinReset = false;
    grantAppUnlock(user);
    await user.save();

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'login_pin_unlocked',
      severity: 'low',
      message: 'Login PIN set or reset',
      req,
      ...getClientMeta(req),
    });

    res.json({ success: true, message: 'Login PIN saved', data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

const verifyLoginPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    let user = await User.findById(req.user._id).select('+loginPin hasLoginPin');
    user = await autoUnlockIfExpired(user);

    const statusBefore = getLockStatus(user);
    if (statusBefore.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Login PIN is temporarily locked. Please try again later.',
        data: statusBefore,
      });
    }

    if (!user.hasLoginPin) {
      return res.status(400).json({
        success: false,
        code: 'LOGIN_PIN_NOT_SET',
        message: 'Please set up your login PIN first',
        data: statusBefore,
      });
    }

    if (user.requireLoginPinReset) {
      return res.status(403).json({
        success: false,
        code: 'LOGIN_PIN_RESET_REQUIRED',
        message: 'Please set a new login PIN in Security settings before unlocking.',
        data: statusBefore,
      });
    }

    const valid = await user.compareLoginPin(pin);
    if (!valid) {
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
        user.appUnlockedUntil = null;
        locked = true;
        await user.save();
        await notifyAccountLocked(user, req);
      } else {
        await user.save();
      }

      const status = getLockStatus(user);
      return res.status(locked ? 423 : 400).json({
        success: false,
        message: locked
          ? 'Your account has been temporarily locked for 1 hour after multiple incorrect PIN attempts.'
          : status.failedAttempts === WARN_AFTER
            ? 'Warning: One more incorrect PIN attempt may temporarily lock your account.'
            : 'Incorrect PIN.',
        data: status,
      });
    }

    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    grantAppUnlock(user);
    await user.save();

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'login_pin_unlocked',
      severity: 'low',
      message: 'Login PIN verified',
      req,
      ...getClientMeta(req),
    });

    res.json({ success: true, data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

const confirmBiometricUnlock = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    user = await autoUnlockIfExpired(user);

    if (!user.biometricEnabled) {
      return res.status(403).json({ success: false, message: 'Biometric login is not enabled' });
    }

    if (!user.hasLoginPin) {
      return res.status(400).json({ success: false, message: 'Login PIN is not set up' });
    }

    const status = getLockStatus(user);
    if (status.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Login PIN is temporarily locked. Please try again later.',
        data: status,
      });
    }

    grantAppUnlock(user);
    await user.save();

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'login_pin_unlocked',
      severity: 'low',
      message: 'Biometric app unlock',
      req,
      ...getClientMeta(req),
      metadata: { method: 'biometric' },
    });

    res.json({ success: true, data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginPinValidation,
  getLoginPinStatus,
  setupLoginPin,
  verifyLoginPin,
  confirmBiometricUnlock,
  LOCK_AFTER,
  WARN_AFTER,
};
