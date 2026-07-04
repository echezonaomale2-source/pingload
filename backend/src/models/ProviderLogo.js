const mongoose = require('mongoose');

const providerLogoSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['network', 'tv', 'electricity', 'education', 'betting', 'other'],
      default: 'other',
    },
    logoUrl: { type: String, default: null },
    logoData: { type: String, default: null },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

providerLogoSchema.statics.ensureDefaults = async function ensureDefaults() {
  const defaults = [
    { providerId: 'mtn', name: 'MTN', category: 'network', order: 1 },
    { providerId: 'airtel', name: 'Airtel', category: 'network', order: 2 },
    { providerId: 'glo', name: 'Glo', category: 'network', order: 3 },
    { providerId: '9mobile', name: '9mobile', category: 'network', order: 4 },
    { providerId: 'dstv', name: 'DStv', category: 'tv', order: 1 },
    { providerId: 'gotv', name: 'GOtv', category: 'tv', order: 2 },
    { providerId: 'startimes', name: 'StarTimes', category: 'tv', order: 3 },
    { providerId: 'waec', name: 'WAEC', category: 'education', order: 1 },
    { providerId: 'neco', name: 'NECO', category: 'education', order: 2 },
    { providerId: 'jamb', name: 'JAMB', category: 'education', order: 3 },
    { providerId: 'bet9ja', name: 'Bet9ja', category: 'betting', order: 1 },
    { providerId: 'sportybet', name: 'SportyBet', category: 'betting', order: 2 },
    { providerId: 'betking', name: 'BetKing', category: 'betting', order: 3 },
    { providerId: '1xbet', name: '1xBet', category: 'betting', order: 4 },
  ];

  for (const item of defaults) {
    await this.updateOne({ providerId: item.providerId }, { $setOnInsert: item }, { upsert: true });
  }
};

module.exports = mongoose.model('ProviderLogo', providerLogoSchema);
