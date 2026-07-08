const mongoose = require('mongoose');

const tvPlanSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['dstv', 'gotv', 'startimes'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['entry', 'standard', 'premium', 'other'],
      default: 'standard',
      index: true,
    },
    variationCode: { type: String, required: true, trim: true },
    vtpassVariationCode: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    vtuProvider: {
      type: String,
      enum: ['clubkonnect', 'vtpass'],
      default: 'vtpass',
      index: true,
    },
  },
  { timestamps: true }
);

tvPlanSchema.index({ provider: 1, vtuProvider: 1, variationCode: 1 }, { unique: true });

tvPlanSchema.statics.ensureDefaults = async function ensureDefaults() {
  const count = await this.countDocuments();
  if (count > 0) return;

  await this.insertMany([
    { provider: 'dstv', name: 'DStv Padi', variationCode: 'dstv-padi', amount: 2950, order: 1 },
    { provider: 'dstv', name: 'DStv Yanga', variationCode: 'dstv-yanga', amount: 4200, order: 2 },
    { provider: 'dstv', name: 'DStv Confam', variationCode: 'dstv-confam', amount: 7400, order: 3 },
    { provider: 'dstv', name: 'DStv Compact', variationCode: 'dstv-compact', amount: 12400, order: 4 },
    { provider: 'gotv', name: 'GOtv Smallie', variationCode: 'gotv-smallie', amount: 1575, order: 1 },
    { provider: 'gotv', name: 'GOtv Jinja', variationCode: 'gotv-jinja', amount: 3300, order: 2 },
    { provider: 'gotv', name: 'GOtv Jolli', variationCode: 'gotv-jolli', amount: 4850, order: 3 },
    { provider: 'gotv', name: 'GOtv Max', variationCode: 'gotv-max', amount: 7200, order: 4 },
    { provider: 'startimes', name: 'Nova', variationCode: 'nova', amount: 1200, order: 1 },
    { provider: 'startimes', name: 'Basic', variationCode: 'basic', amount: 2500, order: 2 },
    { provider: 'startimes', name: 'Smart', variationCode: 'smart', amount: 3500, order: 3 },
    { provider: 'startimes', name: 'Classic', variationCode: 'classic', amount: 4500, order: 4 },
  ]);
};

module.exports = mongoose.model('TvPlan', tvPlanSchema);
