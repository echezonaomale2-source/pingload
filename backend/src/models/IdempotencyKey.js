const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    route: { type: String, required: true },
    statusCode: { type: Number, default: 200 },
    response: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

idempotencyKeySchema.index({ key: 1, userId: 1 }, { unique: true });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
