const crypto = require('crypto');

const generateReference = (prefix = 'PLD') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = generateReference;
