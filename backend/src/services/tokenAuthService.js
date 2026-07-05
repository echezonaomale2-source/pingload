const crypto = require('crypto');
const RevokedToken = require('../models/RevokedToken');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const revokeToken = async (token, decoded) => {
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  await RevokedToken.findOneAndUpdate(
    { tokenHash: hashToken(token) },
    {
      tokenHash: hashToken(token),
      subjectId: String(decoded.id),
      tokenType: decoded.tokenType || 'user',
      jti: decoded.jti || null,
      expiresAt,
      revokedAt: new Date(),
    },
    { upsert: true, new: true }
  );
};

const isTokenRevoked = async (token) => {
  const doc = await RevokedToken.findOne({ tokenHash: hashToken(token) }).select('_id').lean();
  return Boolean(doc);
};

const assertTokenSessionValid = (decoded, accountVersion = 0) => {
  const tokenVersion = decoded.tokenVersion ?? 0;
  const currentVersion = accountVersion ?? 0;
  return tokenVersion === currentVersion;
};

module.exports = {
  hashToken,
  revokeToken,
  isTokenRevoked,
  assertTokenSessionValid,
};
