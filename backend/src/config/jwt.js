const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('./env');

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object;

const signToken = (idOrPayload) => {
  const payload = isPlainObject(idOrPayload)
    ? { ...idOrPayload, ...(idOrPayload.id != null ? { id: String(idOrPayload.id) } : {}) }
    : { id: String(idOrPayload) };

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

const verifyToken = (token) => jwt.verify(token, jwtSecret);

module.exports = { signToken, verifyToken };
