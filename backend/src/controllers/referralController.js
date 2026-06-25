const User = require('../models/User');
const Referral = require('../models/Referral');

// GET /referrals
const getReferralStats = async (req, res, next) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user._id })
      .populate('referredUserId', 'fullName email createdAt')
      .sort({ createdAt: -1 });

    const totalEarnings = referrals.reduce((sum, r) => sum + r.earnings, 0);
    const totalReferrals = referrals.length;

    res.json({
      success: true,
      data: {
        referralCode: req.user.referralCode,
        referralLink: `https://pingload.top/register?ref=${req.user.referralCode}`,
        totalReferrals,
        totalEarnings,
        referrals,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReferralStats };
