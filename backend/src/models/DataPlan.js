const mongoose = require('mongoose');

const dataPlanSchema = new mongoose.Schema(
  {
    network: { type: String, enum: ['mtn', 'airtel', 'glo', '9mobile'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    dataSize: { type: String, required: true, trim: true },
    validity: { type: String, required: true, trim: true },
    variationCode: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DataPlan', dataPlanSchema);
