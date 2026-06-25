const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
    },
    provider: {
      type: String,
      enum: ['fcm', 'apns'],
      default: 'fcm',
    },
    deviceName: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
