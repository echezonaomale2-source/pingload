const mongoose = require('mongoose');

const vtuProviderConfigSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      enum: ['clubkonnect', 'vtpass'],
      required: true,
      unique: true,
      index: true,
    },
    displayName: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    lastSyncAt: { type: Date, default: null },
    lastHealthCheckAt: { type: Date, default: null },
    healthStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'down', 'unknown'],
      default: 'unknown',
    },
    lastHealthMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

vtuProviderConfigSchema.statics.ensureDefaults = async function ensureDefaults() {
  const defaults = [
    { providerId: 'clubkonnect', displayName: 'Clubkonnect', enabled: true },
    { providerId: 'vtpass', displayName: 'VTpass', enabled: true },
  ];
  for (const item of defaults) {
    await this.findOneAndUpdate(
      { providerId: item.providerId },
      { $setOnInsert: item },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('VtuProviderConfig', vtuProviderConfigSchema);
