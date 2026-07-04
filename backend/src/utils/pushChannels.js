const TYPE_TO_CHANNEL = {
  transaction: 'transactions',
  security: 'security',
  promotion: 'promotions',
  promotions: 'promotions',
  system: 'default',
  otp: 'security',
  support: 'default',
};

const getPushChannelId = (type = 'system') => TYPE_TO_CHANNEL[type] || 'default';

module.exports = { TYPE_TO_CHANNEL, getPushChannelId };
