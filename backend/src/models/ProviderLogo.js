const mongoose = require('mongoose');
const { DEFAULT_LOGO_URLS, DEFAULT_PROVIDERS } = require('../config/providerLogoDefaults');

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
  for (const item of DEFAULT_PROVIDERS) {
    const logoUrl = DEFAULT_LOGO_URLS[item.providerId] || null;
    await this.updateOne(
      { providerId: item.providerId },
      {
        $set: { name: item.name, category: item.category, order: item.order },
        $setOnInsert: { providerId: item.providerId, logoUrl, enabled: true },
      },
      { upsert: true }
    );
    if (logoUrl) {
      await this.updateOne(
        { providerId: item.providerId, logoUrl: null, logoData: null },
        { $set: { logoUrl } }
      );
    }
  }
};

module.exports = mongoose.model('ProviderLogo', providerLogoSchema);
