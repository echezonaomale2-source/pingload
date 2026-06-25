const { body } = require('express-validator');
const User = require('../models/User');

const pinValidation = [
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
];

const changePinValidation = [
  body('currentPin').matches(/^\d{4}$/).withMessage('Current PIN must be 4 digits'),
  body('newPin').matches(/^\d{4}$/).withMessage('New PIN must be 4 digits'),
];

// GET /pin/status
const getPinStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('hasTransactionPin');
    res.json({ success: true, data: { hasTransactionPin: user?.hasTransactionPin || false } });
  } catch (error) {
    next(error);
  }
};

// POST /pin/create
const createPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('+transactionPin hasTransactionPin');

    if (user.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'Transaction PIN already set. Use change PIN instead.' });
    }

    user.transactionPin = pin;
    await user.save();

    res.json({ success: true, message: 'Transaction PIN created successfully' });
  } catch (error) {
    next(error);
  }
};

// PUT /pin/change
const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await User.findById(req.user._id).select('+transactionPin hasTransactionPin');

    if (!user.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'No transaction PIN set. Create one first.' });
    }

    const valid = await user.comparePin(currentPin);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current PIN is incorrect' });
    }

    user.transactionPin = newPin;
    await user.save();

    res.json({ success: true, message: 'Transaction PIN changed successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /pin/verify
const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('+transactionPin hasTransactionPin');

    if (!user.hasTransactionPin) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set' });
    }

    const valid = await user.comparePin(pin);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Incorrect transaction PIN' });
    }

    res.json({ success: true, message: 'PIN verified' });
  } catch (error) {
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
