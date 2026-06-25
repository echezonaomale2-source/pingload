const IdempotencyKey = require('../models/IdempotencyKey');

const PROCESSING = { status: 'processing' };

const idempotency = (routeName) => async (req, res, next) => {
  const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!key || !req.user?._id) return next();

  try {
    const existing = await IdempotencyKey.findOne({ key, userId: req.user._id, route: routeName });
    if (existing && existing.response?.status !== 'processing') {
      return res.status(existing.statusCode).json(existing.response);
    }

    if (!existing) {
      try {
        await IdempotencyKey.create({
          key,
          userId: req.user._id,
          route: routeName,
          statusCode: 102,
          response: PROCESSING,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      } catch (error) {
        if (error.code === 11000) {
          const duplicate = await IdempotencyKey.findOne({ key, userId: req.user._id, route: routeName });
          if (duplicate?.response?.status !== 'processing') {
            return res.status(duplicate.statusCode).json(duplicate.response);
          }
          return res.status(409).json({ success: false, message: 'Duplicate request in progress' });
        }
        throw error;
      }
    } else {
      return res.status(409).json({ success: false, message: 'Duplicate request in progress' });
    }

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      await IdempotencyKey.findOneAndUpdate(
        { key, userId: req.user._id, route: routeName },
        {
          statusCode: res.statusCode || 200,
          response: body,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
      ).catch(() => {});

      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = idempotency;
