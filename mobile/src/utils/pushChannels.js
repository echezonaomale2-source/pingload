const TYPE_TO_CHANNEL = {
  transaction: 'transactions',
  security: 'security',
  promotion: 'promotions',
  promotions: 'promotions',
  system: 'default',
  otp: 'security',
  support: 'default',
};

const getPushChannelId = (typeOrChannel = 'default') => TYPE_TO_CHANNEL[typeOrChannel] || typeOrChannel || 'default';

export { TYPE_TO_CHANNEL, getPushChannelId };
