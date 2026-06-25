const User = require('../models/User');
const generateReference = require('./generateReference');
const { createAdminAdjustmentWithAtomicWallet } = require('../services/walletTransactionService');

const adjustWallet = async (userId, { type, amount, note, adminName }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (amount <= 0) {
    const error = new Error('Amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const reference = generateReference('ADM');

  const transaction = await createAdminAdjustmentWithAtomicWallet({
    userId,
    type,
    amount,
    reference,
    description: note || `Admin ${type} by ${adminName || 'admin'}`,
    metadata: { adminAdjustment: true, note },
  });

  const updatedUser = await User.findById(userId).select('-passwordHash -transactionPin');
  return { user: updatedUser, transaction };
};

module.exports = adjustWallet;
