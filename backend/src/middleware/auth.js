const User = require('../models/User');
const { verifyToken } = require('../config/jwt');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = verifyToken(token);
    if (decoded.tokenType !== 'user') {
      return res.status(401).json({ success: false, message: 'User access required' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash -transactionPin');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };
