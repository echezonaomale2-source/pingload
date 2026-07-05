const Referral = require('../models/Referral');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { atomicWalletCredit, runWithWalletTransaction } = require('./walletTransactionService');
const { deliverUserNotification } = require('./notificationDeliveryService');
const { referralBonus } = require('../config/env');
const { logApiFailure } = require('../utils/logger');

const tryCreditReferralBonus = async (referredUserId) => {
  try {
    const referral = await Referral.findOne({ referredUserId, status: 'pending' });
    if (!referral) return { credited: false };

    const credited = await runWithWalletTransaction(async (session) => {
      const locked = await Referral.findOneAndUpdate(
        { _id: referral._id, status: 'pending' },
        { $set: { status: 'credited' } },
        { new: true, session }
      );
      if (!locked) return null;

      const amount = locked.earnings || referralBonus;
      await atomicWalletCredit({ userId: locked.referrerId, amount, session });

      await Transaction.create([{
        userId: locked.referrerId,
        amount,
        service: 'referral_bonus',
        transactionType: 'credit',
        status: 'successful',
        description: 'Referral bonus',
        reference: `REF-${locked._id}`,
        metadata: { referredUserId: String(referredUserId) },
      }], { session, ordered: true });

      return { referrerId: locked.referrerId, amount };
    });

    if (!credited) return { credited: false };

    const referred = await User.findById(referredUserId).select('fullName');
    await deliverUserNotification({
      userId: credited.referrerId,
      title: 'Referral Bonus',
      message: `You earned ₦${credited.amount.toLocaleString()} for referring ${referred?.fullName || 'a friend'}!`,
      type: 'transaction',
      screen: 'Wallet',
    });

    return { credited: true, ...credited };
  } catch (error) {
    logApiFailure('referral:credit', error, { referredUserId: String(referredUserId) });
    return { credited: false, error: error.message };
  }
};

module.exports = { tryCreditReferralBonus };
