const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    idType: { type: String, enum: ['nin', 'passport', 'drivers_license', 'voters_card'], required: true },
    idNumber: { type: String, required: true, trim: true },
    idFrontImage: { type: String, required: true },
    idBackImage: { type: String, default: null },
    selfieImage: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    adminNote: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KycDocument', kycDocumentSchema);
