const SecurityEvent = require('../models/SecurityEvent');

const recordSecurityEvent = async ({
  userId,
  eventType,
  message,
  severity = 'medium',
  req,
  deviceInfo,
  location,
  metadata = {},
}) => {
  const ipAddress = req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null;
  const userAgent = req?.headers?.['user-agent'] || null;

  return SecurityEvent.create({
    userId: userId || null,
    eventType,
    message,
    severity,
    ipAddress,
    userAgent,
    deviceInfo: deviceInfo || null,
    location: location || null,
    metadata,
  });
};

module.exports = { recordSecurityEvent };
