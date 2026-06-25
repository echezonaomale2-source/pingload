const { logApiFailure } = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  logApiFailure(`${req.method} ${req.originalUrl}`, err, {
    statusCode: err.statusCode || 500,
    userId: req.user?._id ? String(req.user._id) : undefined,
  });

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
