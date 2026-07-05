const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    subjectId: { type: String, required: true, index: true },
    tokenType: { type: String, enum: ['user', 'admin'], required: true },
    jti: { type: String, default: null, index: true, sparse: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
