const crypto = require('crypto');

const generateReferralCode = (fullName) => {
  const namePart = fullName.replace(/\s/g, '').substring(0, 4).toUpperCase();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${namePart}${randomPart}`;
};

module.exports = generateReferralCode;
