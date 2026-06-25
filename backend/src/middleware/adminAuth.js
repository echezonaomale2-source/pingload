const Admin = require('../models/Admin');
const { verifyToken } = require('../config/jwt');

const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = verifyToken(token);
    if (decoded.tokenType !== 'admin') {
      return res.status(401).json({ success: false, message: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    if (!['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ success: false, message: 'Admin role is not authorized' });
    }

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

module.exports = { protectAdmin };
