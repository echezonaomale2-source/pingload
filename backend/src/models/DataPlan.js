const mongoose = require('mongoose');
const { normalizeDataPlanRecord } = require('../utils/dataPlanFields');

const dataPlanSchema = new mongoose.Schema(
  {
    network: { type: String, enum: ['mtn', 'airtel', 'glo', '9mobile'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    dataSize: { type: String, required: true, trim: true },
    validity: { type: String, required: true, trim: true },
    validityCategory: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'other'],
      default: 'other',
      index: true,
    },
    category: { type: String, trim: true, default: '' },
    providerPlanCode: { type: String, required: true, trim: true },
    providerVariationCode: { type: String, trim: true, default: '' },
    providerProductCode: { type: String, trim: true, default: '' },
    /** @deprecated Legacy fields kept for backward compatibility */
    variationCode: { type: String, trim: true, default: '' },
    planCode: { type: String, trim: true, default: '' },
    vtpassVariationCode: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
    vtuProvider: {
      type: String,
      enum: ['vtpass'],
      default: 'vtpass',
      required: true,
      index: true,
    },
  },
  { timestamps: true, autoIndex: false }
);

dataPlanSchema.index({ vtuProvider: 1, providerPlanCode: 1 }, { unique: true });
dataPlanSchema.index({ network: 1, vtuProvider: 1, enabled: 1 });

const applyNormalizedFields = (doc) => {
  const normalized = normalizeDataPlanRecord(doc.toObject ? doc.toObject() : doc);
  Object.assign(doc, normalized);
};

dataPlanSchema.pre('validate', function preValidate(next) {
  applyNormalizedFields(this);
  if (!this.providerPlanCode || !String(this.providerPlanCode).trim()) {
    this.invalidate('providerPlanCode', 'Provider plan code is required');
  }
  if (!this.vtuProvider) {
    this.invalidate('vtuProvider', 'VTU provider is required');
  }
  next();
});

dataPlanSchema.pre('save', function preSave(next) {
  applyNormalizedFields(this);
  next();
});

module.exports = mongoose.model('DataPlan', dataPlanSchema);
