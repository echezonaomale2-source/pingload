const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    eventType: {
      type: String,
      enum: [
        'login_pin_failed',
        'login_pin_locked',
        'login_pin_unlocked',
        'login_failed',
        'password_reset',
        'password_changed',
        'transaction_pin_reset',
        'otp_failed',
        'device_changed',
        'suspicious_activity',
        'account_suspended',
      ],
      required: true,
      index: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    message: { type: String, required: true, trim: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    deviceInfo: { type: String, default: null },
    location: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    adminReadAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ eventType: 1, createdAt: -1 });
securityEventSchema.index({ adminReadAt: 1, createdAt: -1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
