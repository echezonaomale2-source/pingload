const { body } = require('express-validator');
const KycDocument = require('../models/KycDocument');
const User = require('../models/User');
const Notification = require('../models/Notification');

const submitValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('idType').isIn(['nin', 'passport', 'drivers_license', 'voters_card']).withMessage('Invalid ID type'),
  body('idNumber').trim().notEmpty().withMessage('ID number is required'),
  body('idFrontImage').notEmpty().withMessage('ID front image is required'),
  body('selfieImage').notEmpty().withMessage('Selfie image is required'),
];

const validateImage = (image, label) => {
  if (!image?.startsWith('data:image/')) {
    return `${label} must be a valid image`;
  }
  if (image.length > 800000) {
    return `${label} is too large`;
  }
  return null;
};

// GET /kyc/status
const getKycStatus = async (req, res, next) => {
  try {
    const doc = await KycDocument.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: {
        kycStatus: req.user.kycStatus,
        submission: doc
          ? {
              id: doc._id,
              status: doc.status,
              adminNote: doc.adminNote,
              submittedAt: doc.createdAt,
              reviewedAt: doc.reviewedAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /kyc/submit
const submitKyc = async (req, res, next) => {
  try {
    const { fullName, dateOfBirth, address, idType, idNumber, idFrontImage, idBackImage, selfieImage } = req.body;

    for (const [img, label] of [
      [idFrontImage, 'ID front image'],
      [idBackImage, 'ID back image'],
      [selfieImage, 'Selfie image'],
    ]) {
      if (!img) continue;
      const err = validateImage(img, label);
      if (err) return res.status(400).json({ success: false, message: err });
    }

    const pending = await KycDocument.findOne({ userId: req.user._id, status: 'pending' });
    if (pending) {
      return res.status(400).json({ success: false, message: 'You already have a pending KYC submission' });
    }

    if (req.user.kycStatus === 'verified') {
      return res.status(400).json({ success: false, message: 'Your KYC is already verified' });
    }

    const doc = await KycDocument.create({
      userId: req.user._id,
      fullName,
      dateOfBirth,
      address,
      idType,
      idNumber,
      idFrontImage,
      idBackImage: idBackImage || null,
      selfieImage,
      status: 'pending',
    });

    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });

    res.status(201).json({ success: true, message: 'KYC documents submitted successfully', data: doc });
  } catch (error) {
    next(error);
  }
};

// GET /kyc/admin — list all submissions
const adminListKyc = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const docs = await KycDocument.find(filter)
      .populate('userId', 'fullName email phoneNumber kycStatus')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: docs.map((d) => ({
        id: d._id,
        userId: d.userId?._id,
        userName: d.userId?.fullName,
        email: d.userId?.email,
        phone: d.userId?.phoneNumber,
        fullName: d.fullName,
        idType: d.idType,
        idNumber: d.idNumber,
        status: d.status,
        adminNote: d.adminNote,
        submittedAt: d.createdAt,
        reviewedAt: d.reviewedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /kyc/admin/:id
const adminGetKyc = async (req, res, next) => {
  try {
    const doc = await KycDocument.findById(req.params.id).populate('userId', 'fullName email phoneNumber kycStatus');
    if (!doc) return res.status(404).json({ success: false, message: 'KYC submission not found' });

    res.json({
      success: true,
      data: {
        id: doc._id,
        userId: doc.userId?._id,
        userName: doc.userId?.fullName,
        email: doc.userId?.email,
        phone: doc.userId?.phoneNumber,
        fullName: doc.fullName,
        dateOfBirth: doc.dateOfBirth,
        address: doc.address,
        idType: doc.idType,
        idNumber: doc.idNumber,
        idFrontImage: doc.idFrontImage,
        idBackImage: doc.idBackImage,
        selfieImage: doc.selfieImage,
        status: doc.status,
        adminNote: doc.adminNote,
        submittedAt: doc.createdAt,
        reviewedAt: doc.reviewedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /kyc/admin/:id/review
const adminReviewKyc = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be verified or rejected' });
    }

    const doc = await KycDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'KYC submission not found' });

    doc.status = status;
    doc.adminNote = adminNote || '';
    doc.reviewedBy = req.admin._id;
    doc.reviewedAt = new Date();
    await doc.save();

    await User.findByIdAndUpdate(doc.userId, { kycStatus: status });

    await Notification.create({
      userId: doc.userId,
      title: status === 'verified' ? 'KYC Approved' : 'KYC Rejected',
      message: status === 'verified'
        ? 'Your identity verification has been approved. You now have full access to Pingload services.'
        : `Your KYC submission was rejected.${adminNote ? ` Reason: ${adminNote}` : ' Please resubmit with correct documents.'}`,
      type: 'security',
      metadata: { kycDocumentId: doc._id, status },
    });

    res.json({ success: true, message: `KYC ${status}`, data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitValidation,
  getKycStatus,
  submitKyc,
  adminListKyc,
  adminGetKyc,
  adminReviewKyc,
};
