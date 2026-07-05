const User = require('../models/User');

const requireAppUnlock = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('appUnlockedUntil hasLoginPin');
    if (!user?.hasLoginPin) return next();

    const unlockedUntil = user.appUnlockedUntil ? new Date(user.appUnlockedUntil).getTime() : 0;
    if (unlockedUntil > Date.now()) return next();

    return res.status(403).json({
      success: false,
      code: 'APP_LOCKED',
      message: 'Unlock the app with your login PIN to continue',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = requireAppUnlock;
