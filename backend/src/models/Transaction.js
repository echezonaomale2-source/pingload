const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['credit', 'debit', 'refund'],
      required: true,
    },
    service: {
      type: String,
      enum: [
        'wallet_funding',
        'airtime',
        'data',
        'electricity',
        'tv',
        'education',
        'betting',
        'bulk_sms',
        'referral_bonus',
        'admin_credit',
        'admin_debit',
        'wallet_transfer',
        'refund',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded'],
      default: 'pending',
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    description: {
      type: String,
      default: '',
    },
    refundAmount: { type: Number, min: 0 },
    refundReason: { type: String, default: '' },
    refundReference: { type: String, index: true },
    originalTransactionReference: { type: String, index: true },
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    refundedAt: { type: Date },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ service: 1, status: 1, createdAt: -1 });
transactionSchema.index({ transactionType: 1, refundedAt: -1 });
transactionSchema.index({ 'metadata.vtpassRequestId': 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
