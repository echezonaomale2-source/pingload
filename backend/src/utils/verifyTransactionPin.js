const User = require('../models/User');

const verifyTransactionPin = async (userId, pin) => {
  if (!pin || !/^\d{4}$/.test(pin)) {
    const error = new Error('A valid 4-digit transaction PIN is required');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('+transactionPin hasTransactionPin');
  if (!user?.hasTransactionPin) {
    const error = new Error('Please set up your transaction PIN in Security settings');
    error.statusCode = 400;
    throw error;
  }

  const valid = await user.comparePin(pin);
  if (!valid) {
    const error = new Error('Incorrect transaction PIN');
    error.statusCode = 401;
    throw error;
  }

  return true;
};

module.exports = verifyTransactionPin;
