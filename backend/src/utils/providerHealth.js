const VtuProviderConfig = require('../models/VtuProviderConfig');

const sanitizeHealthMessage = (message) => {
  if (!message) return 'Connection failed';
  const text = String(message).replace(/\s+/g, ' ').trim();
  if (/<!DOCTYPE html|<html/i.test(text)) {
    return 'Provider returned an HTML error page — verify credentials and IP whitelist';
  }
  return text.length > 240 ? `${text.slice(0, 240)}...` : text;
};

const persistProviderHealth = async (providerId, result = {}) => {
  const now = new Date();
  const healthStatus = result.ok
    ? 'healthy'
    : result.configured
      ? 'down'
      : 'unknown';
  const message = result.ok
    ? 'Connection successful'
    : sanitizeHealthMessage(result.reason || 'Connection failed');

  await VtuProviderConfig.findOneAndUpdate(
    { providerId },
    {
      $set: {
        lastHealthCheckAt: now,
        healthStatus,
        lastHealthMessage: message,
      },
    },
    { upsert: true }
  );

  return { healthStatus, message, lastHealthCheckAt: now };
};

module.exports = { persistProviderHealth };
