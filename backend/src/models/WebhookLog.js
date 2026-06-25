const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'paystack', index: true },
    event: { type: String, required: true, index: true },
    eventKey: { type: String, required: true, unique: true },
    reference: { type: String, index: true, sparse: true },
    status: {
      type: String,
      enum: ['received', 'processed', 'ignored', 'failed', 'duplicate'],
      default: 'received',
    },
    httpStatus: { type: Number },
    resultMessage: { type: String },
    payloadSummary: {
      amount: Number,
      currency: String,
      customerEmail: String,
      transferCode: String,
    },
    error: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

webhookLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
