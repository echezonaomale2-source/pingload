const { body } = require('express-validator');
const User = require('../models/User');
const verifyTransactionPin = require('../utils/verifyTransactionPin');
const { developmentMode } = require('../config/env');
const {
  sendOTP,
  verifyOTP,
  clearEmailVerification,
  OTP_PURPOSES,
} = require('../services/termiiService');
const { recordSecurityEvent } = require('../services/securityEventService');

const pinValidation = [
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
];

const changePinValidation = [
  body('currentPin').matches(/^\d{4}$/).withMessage('Current PIN must be 4 digits'),
  body('newPin').matches(/^\d{4}$/).withMessage('New PIN must be 4 digits'),
];

const resetWithOtpValidation = [
  body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPin').matches(/^\d{4}$/).withMessage('New PIN must be 4 digits'),
];

const getPinStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('hasTransactionPin transactionPinLockedUntil transactionPinFailedAttempts');
    res.json({
      success: true,
      data: {
        hasTransactionPin: user?.hasTransactionPin || false,
        isLocked: Boolean(user?.transactionPinLockedUntil && new Date(user.transactionPinLockedUntil) > new Date()),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('+transactionPin hasTransactionPin');

    if (user.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'Transaction PIN already set. Use change PIN instead.' });
    }

    user.transactionPin = pin;
    user.transactionPinFailedAttempts = 0;
    user.transactionPinLockedUntil = null;
    await user.save();

    res.json({ success: true, message: 'Transaction PIN created successfully' });
  } catch (error) {
    next(error);
  }
};

const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await User.findById(req.user._id).select('+transactionPin hasTransactionPin');

    if (!user.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'No transaction PIN set. Create one first.' });
    }

    await verifyTransactionPin(req.user._id, currentPin, req);

    user.transactionPin = newPin;
    user.transactionPinFailedAttempts = 0;
    user.transactionPinLockedUntil = null;
    await user.save();

    res.json({ success: true, message: 'Transaction PIN changed successfully' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('hasTransactionPin');
    if (!user.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set' });
    }

    await verifyTransactionPin(req.user._id, pin, req);
    res.json({ success: true, message: 'PIN verified' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const forgotTransactionPin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('email phoneNumber hasTransactionPin');
    if (!user?.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'No transaction PIN set. Create one instead.' });
    }

    const result = await sendOTP({
      email: user.email,
      phone: user.phoneNumber,
      purpose: OTP_PURPOSES.TRANSACTION_PIN_RESET,
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

const resetTransactionPinWithOtp = async (req, res, next) => {
  try {
    const { otp, newPin } = req.body;
    const user = await User.findById(req.user._id).select('+transactionPin email phoneNumber hasTransactionPin');

    if (!user?.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'No transaction PIN set. Create one instead.' });
    }

    if (!developmentMode) {
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP code is required' });
      }

      const result = await verifyOTP({
        email: user.email,
        phone: user.phoneNumber,
        code: otp,
        purpose: OTP_PURPOSES.TRANSACTION_PIN_RESET,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
    }

    user.transactionPin = newPin;
    user.transactionPinFailedAttempts = 0;
    user.transactionPinLockedUntil = null;
    await user.save();

    await clearEmailVerification(user.email, OTP_PURPOSES.TRANSACTION_PIN_RESET);

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'transaction_pin_reset',
      severity: 'medium',
      message: 'Transaction PIN reset via OTP',
      req,
    });

    res.json({ success: true, message: 'Transaction PIN reset successfully' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  pinValidation,
  changePinValidation,
  resetWithOtpValidation,
  getPinStatus,
  createPin,
  changePin,
  verifyPin,
  forgotTransactionPin,
  resetTransactionPinWithOtp,
};
