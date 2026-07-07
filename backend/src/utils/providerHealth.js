const VtuProviderConfig = require('../models/VtuProviderConfig');

const persistProviderHealth = async (providerId, result = {}) => {
  const now = new Date();
  const healthStatus = result.ok
    ? 'healthy'
    : result.configured
      ? 'down'
      : 'unknown';
  const message = result.ok
    ? 'Connection successful'
    : result.reason || 'Connection failed';

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
