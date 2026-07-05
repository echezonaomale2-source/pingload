const Admin = require('../models/Admin');
const { verifyToken } = require('../config/jwt');
const { isTokenRevoked, assertTokenSessionValid } = require('../services/tokenAuthService');

const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (await isTokenRevoked(token)) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const decoded = verifyToken(token);
    if (decoded.tokenType !== 'admin') {
      return res.status(401).json({ success: false, message: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    if (!assertTokenSessionValid(decoded, admin.tokenVersion)) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (!['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ success: false, message: 'Admin role is not authorized' });
    }

    req.admin = admin;
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

module.exports = { protectAdmin };
