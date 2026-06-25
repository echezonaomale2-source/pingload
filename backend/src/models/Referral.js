const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    earnings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'credited'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', referralSchema);
