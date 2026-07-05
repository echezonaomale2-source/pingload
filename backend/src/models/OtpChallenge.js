const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    code: { type: String, default: null },
    pinId: { type: String, default: null },
    channel: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    purpose: { type: String, required: true, index: true },
    verified: { type: Boolean, default: false, index: true },
    destination: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
