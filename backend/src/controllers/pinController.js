const { body } = require('express-validator');
const User = require('../models/User');
const verifyTransactionPin = require('../utils/verifyTransactionPin');

const pinValidation = [
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
];

const changePinValidation = [
  body('currentPin').matches(/^\d{4}$/).withMessage('Current PIN must be 4 digits'),
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

module.exports = {
  pinValidation,
  changePinValidation,
  getPinStatus,
  createPin,
  changePin,
  verifyPin,
};
