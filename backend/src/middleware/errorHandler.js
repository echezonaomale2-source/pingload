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

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
  }

  // Surface upstream provider (axios) errors that bubbled up uncaught, so the
  // client gets the real cause instead of a generic 500.
  if (err.isAxiosError || err.response) {
    const upstreamMessage = err.response?.data?.message;
    const status = err.response?.status >= 400 && err.response?.status < 600
      ? err.response.status
      : 502;
    return res.status(status).json({
      success: false,
      message: upstreamMessage || err.message || 'Upstream service error',
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
