const mongoose = require('mongoose');
const catalog = require('../config/bettingPlatformCatalog');

const bettingPlatformSchema = new mongoose.Schema(
  {
    platformId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    vtpassServiceId: { type: String, default: null, trim: true },
    minAmount: { type: Number, default: 100, min: 0 },
    maxAmount: { type: Number, default: 500000, min: 0 },
    enabled: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bettingPlatformSchema.statics.ensureDefaults = async function ensureDefaults() {
  for (const item of catalog) {
    await this.findOneAndUpdate(
      { platformId: item.platformId },
      {
        $setOnInsert: {
          platformId: item.platformId,
          name: item.name,
          minAmount: item.minAmount,
          maxAmount: item.maxAmount,
          order: item.order,
          enabled: false,
        },
      },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('BettingPlatform', bettingPlatformSchema);
