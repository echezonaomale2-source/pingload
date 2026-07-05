const User = require('../models/User');
const { recordSecurityEvent } = require('../services/securityEventService');

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 60 * 1000;

const verifyTransactionPin = async (userId, pin, req = null) => {
  if (!pin || !/^\d{4}$/.test(pin)) {
    const error = new Error('A valid 4-digit transaction PIN is required');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select(
    '+transactionPin hasTransactionPin transactionPinFailedAttempts transactionPinLockedUntil'
  );

  if (!user?.hasTransactionPin) {
    const error = new Error('Please set up your transaction PIN in Security settings');
    error.statusCode = 400;
    throw error;
  }

  const lockedUntil = user.transactionPinLockedUntil
    ? new Date(user.transactionPinLockedUntil).getTime()
    : 0;
  if (lockedUntil > Date.now()) {
    const error = new Error('Transaction PIN is temporarily locked. Please try again later.');
    error.statusCode = 423;
    throw error;
  }

  if (lockedUntil && lockedUntil <= Date.now()) {
    user.transactionPinFailedAttempts = 0;
    user.transactionPinLockedUntil = null;
  }

  const valid = await user.comparePin(pin);
  if (!valid) {
    user.transactionPinFailedAttempts = (user.transactionPinFailedAttempts || 0) + 1;
    if (user.transactionPinFailedAttempts >= MAX_ATTEMPTS) {
      user.transactionPinLockedUntil = new Date(Date.now() + LOCK_MS);
    }
    await user.save();

    await recordSecurityEvent({
      userId: user._id,
      eventType: 'transaction_pin_failed',
      severity: user.transactionPinFailedAttempts >= MAX_ATTEMPTS ? 'high' : 'medium',
      message: `Failed transaction PIN attempt (${user.transactionPinFailedAttempts}/${MAX_ATTEMPTS})`,
      req,
      metadata: { attempt: user.transactionPinFailedAttempts },
    }).catch(() => {});

    const error = new Error(
      user.transactionPinFailedAttempts >= MAX_ATTEMPTS
        ? 'Too many incorrect PIN attempts. Transaction PIN locked for 30 minutes.'
        : 'Incorrect transaction PIN'
    );
    error.statusCode = user.transactionPinFailedAttempts >= MAX_ATTEMPTS ? 423 : 400;
    throw error;
  }

  if (user.transactionPinFailedAttempts || user.transactionPinLockedUntil) {
    user.transactionPinFailedAttempts = 0;
    user.transactionPinLockedUntil = null;
    await user.save();
  }

  return true;
};

module.exports = verifyTransactionPin;
