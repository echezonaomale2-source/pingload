const { body } = require('express-validator');
const User = require('../models/User');
const { developmentMode } = require('../config/env');
const { recordSecurityEvent } = require('../services/securityEventService');
const { deliverUserNotification } = require('../services/notificationDeliveryService');
const {
  sendSecurityAlertEmail,
  sendOTP,
  verifyOTP,
  clearEmailVerification,
  OTP_PURPOSES,
} = require('../services/termiiService');

const LOCK_DURATION_MS = 60 * 60 * 1000;
const APP_UNLOCK_MS = 12 * 60 * 60 * 1000;
const WARN_AFTER = 3;
const LOCK_AFTER = 5;

const loginPinValidation = body('pin')
  .matches(/^\d{4,6}$/)
  .withMessage('Login PIN must be 4–6 digits');

const changeLoginPinValidation = [
  body('currentPin').matches(/^\d{4,6}$/).withMessage('Current Login PIN must be 4–6 digits'),
  body('newPin').matches(/^\d{4,6}$/).withMessage('New Login PIN must be 4–6 digits'),
];

const resetLoginPinWithOtpValidation = [
  body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPin').matches(/^\d{4,6}$/).withMessage('New Login PIN must be 4–6 digits'),
];

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
    loginPinLength: user.loginPinLength || null,
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
    "Your Pingload account has been temporarily locked for 1 hour after multiple incorrect PIN attempts. Reset your Login PIN with email verification, or sign in with your password.";

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
    let user = await User.findById(req.user._id).select(
      'hasLoginPin loginPinLength loginPinFailedAttempts loginPinLockedUntil requireLoginPinReset appUnlockedUntil'
    );
    user = await autoUnlockIfExpired(user);
    res.json({ success: true, data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * Initial Login PIN setup only — account must not already have a PIN.
 * Change/Forgot flows must be used once a PIN exists.
 */
const setupLoginPin = async (req, res, next) => {
  try {
    const pin = String(req.body?.pin || '').trim();
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Login PIN must be 4–6 digits',
      });
    }

    let user = await User.findById(req.user._id).select(
      '+loginPin hasLoginPin loginPinLength loginPinLockedUntil requireLoginPinReset'
    );
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    user = await autoUnlockIfExpired(user);

    if (user.hasLoginPin) {
      return res.status(400).json({
        success: false,
        code: 'LOGIN_PIN_ALREADY_SET',
        message: 'Login PIN is already set. Use Change PIN or Forgot PIN to update it.',
        data: getLockStatus(user),
      });
    }

    user.loginPin = pin;
    user.loginPinLength = pin.length;
    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    user.requireLoginPinReset = false;
    grantAppUnlock(user);
    await user.save();

    try {
      await recordSecurityEvent({
        userId: user._id,
        eventType: 'login_pin_unlocked',
        severity: 'low',
        message: 'Login PIN created',
        req,
        ...getClientMeta(req),
      });
    } catch (eventError) {
      console.warn(`[LoginPin] security event skipped: ${eventError.message}`);
    }

    res.json({ success: true, message: 'Login PIN saved', data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

const changeLoginPin = async (req, res, next) => {
  try {
    const currentPin = String(req.body?.currentPin || '').trim();
    const newPin = String(req.body?.newPin || '').trim();

    if (!/^\d{4,6}$/.test(currentPin) || !/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'Login PIN must be 4–6 digits',
      });
    }

    let user = await User.findById(req.user._id).select(
      '+loginPin hasLoginPin loginPinLength loginPinLockedUntil loginPinFailedAttempts requireLoginPinReset'
    );
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    user = await autoUnlockIfExpired(user);

    const statusBefore = getLockStatus(user);
    if (statusBefore.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Login PIN is temporarily locked. Use Forgot PIN after the lock expires, or sign in with password.',
        data: statusBefore,
      });
    }

    if (!user.hasLoginPin) {
      return res.status(400).json({
        success: false,
        code: 'LOGIN_PIN_NOT_SET',
        message: 'No Login PIN set. Create one first.',
        data: statusBefore,
      });
    }

    const valid = await user.compareLoginPin(currentPin);
    if (!valid) {
      user.loginPinFailedAttempts = (user.loginPinFailedAttempts || 0) + 1;
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

      return res.status(locked ? 423 : 400).json({
        success: false,
        message: locked
          ? 'Your account has been temporarily locked after multiple incorrect PIN attempts.'
          : 'Incorrect current Login PIN.',
        data: getLockStatus(user),
      });
    }

    user.loginPin = newPin;
    user.loginPinLength = newPin.length;
    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    user.requireLoginPinReset = false;
    grantAppUnlock(user);
    await user.save();

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'login_pin_changed',
      severity: 'medium',
      message: 'Login PIN changed with current PIN',
      req,
      ...getClientMeta(req),
    });

    res.json({ success: true, message: 'Login PIN changed successfully', data: getLockStatus(user) });
  } catch (error) {
    next(error);
  }
};

const forgotLoginPin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('email phoneNumber hasLoginPin');
    if (!user?.hasLoginPin) {
      return res.status(400).json({
        success: false,
        code: 'LOGIN_PIN_NOT_SET',
        message: 'No Login PIN set. Create one instead.',
      });
    }

    const result = await sendOTP({
      email: user.email,
      phone: user.phoneNumber,
      purpose: OTP_PURPOSES.LOGIN_PIN_RESET,
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        channel: result.channel,
        expiresInSeconds: result.expiresInSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
};

const resetLoginPinWithOtp = async (req, res, next) => {
  try {
    const otp = String(req.body?.otp || '').trim();
    const newPin = String(req.body?.newPin || '').trim();

    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({ success: false, message: 'Login PIN must be 4–6 digits' });
    }

    const user = await User.findById(req.user._id).select(
      '+loginPin email phoneNumber hasLoginPin loginPinLength loginPinFailedAttempts loginPinLockedUntil requireLoginPinReset'
    );

    if (!user?.hasLoginPin) {
      return res.status(400).json({
        success: false,
        code: 'LOGIN_PIN_NOT_SET',
        message: 'No Login PIN set. Create one instead.',
      });
    }

    if (!developmentMode) {
      if (!otp || otp.length !== 6) {
        return res.status(400).json({ success: false, message: 'OTP code is required' });
      }

      const result = await verifyOTP({
        email: user.email,
        phone: user.phoneNumber,
        code: otp,
        purpose: OTP_PURPOSES.LOGIN_PIN_RESET,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
    }

    user.loginPin = newPin;
    user.loginPinLength = newPin.length;
    user.loginPinFailedAttempts = 0;
    user.loginPinLockedUntil = null;
    user.requireLoginPinReset = false;
    grantAppUnlock(user);
    await user.save();

    await clearEmailVerification(user.email, OTP_PURPOSES.LOGIN_PIN_RESET);

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'login_pin_reset',
      severity: 'medium',
      message: 'Login PIN reset via OTP',
      req,
      ...getClientMeta(req),
    });

    res.json({
      success: true,
      message: 'Login PIN reset successfully',
      data: getLockStatus(user),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const verifyLoginPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    let user = await User.findById(req.user._id).select(
      '+loginPin hasLoginPin loginPinLength loginPinFailedAttempts loginPinLockedUntil requireLoginPinReset appUnlockedUntil notificationSettings email'
    );
    user = await autoUnlockIfExpired(user);

    const statusBefore = getLockStatus(user);
    if (statusBefore.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Login PIN is temporarily locked. Please try again later or use Forgot PIN.',
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
        message: 'Please reset your Login PIN with email verification before unlocking.',
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
    let user = await User.findById(req.user._id).select(
      'hasLoginPin biometricEnabled loginPinLockedUntil requireLoginPinReset loginPinFailedAttempts loginPinLength appUnlockedUntil'
    );
    user = await autoUnlockIfExpired(user);

    if (!user.biometricEnabled) {
      return res.status(403).json({ success: false, message: 'Biometric login is not enabled' });
    }

    if (!user.hasLoginPin) {
      return res.status(400).json({ success: false, message: 'Login PIN is not set up' });
    }

    const status = getLockStatus(user);
    if (status.isLocked || status.requireLoginPinReset) {
      return res.status(423).json({
        success: false,
        code: status.requireLoginPinReset ? 'LOGIN_PIN_RESET_REQUIRED' : undefined,
        message: status.requireLoginPinReset
          ? 'Please reset your Login PIN with email verification before unlocking.'
          : 'Login PIN is temporarily locked. Please try again later.',
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
  changeLoginPinValidation,
  resetLoginPinWithOtpValidation,
  getLoginPinStatus,
  setupLoginPin,
  changeLoginPin,
  forgotLoginPin,
  resetLoginPinWithOtp,
  verifyLoginPin,
  confirmBiometricUnlock,
  LOCK_AFTER,
  WARN_AFTER,
};
