const mongoose = require('mongoose');

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
    variationCode: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dataPlanSchema.index({ network: 1, variationCode: 1 }, { unique: true });

module.exports = mongoose.model('DataPlan', dataPlanSchema);
