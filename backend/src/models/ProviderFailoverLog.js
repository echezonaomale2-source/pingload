const mongoose = require('mongoose');

const providerFailoverLogSchema = new mongoose.Schema(
  {
    service: { type: String, required: true, index: true },
    primaryProvider: { type: String, enum: ['vtpass'], required: true },
    fallbackProvider: { type: String, enum: ['vtpass'], required: true },
    success: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
    transactionReference: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProviderFailoverLog', providerFailoverLogSchema);
