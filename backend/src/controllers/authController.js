const { body } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Referral = require('../models/Referral');
const {
  sendOTP,
  verifyOTP,
  isEmailOtpVerified,
  clearEmailVerification,
  OTP_PURPOSES,
} = require('../services/termiiService');
const generateReferralCode = require('../utils/generateReferralCode');
const { signToken } = require('../config/jwt');
const { referralBonus, developmentMode, termii } = require('../config/env');

const sendOtpValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^(\+?234|0)[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
  body('purpose').optional().isIn(['registration', 'password_reset']).withMessage('Invalid OTP purpose'),
];

const verifyOtpValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('phone').optional().matches(/^(\+?234|0)[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
  body('purpose').optional().isIn(['registration', 'password_reset']).withMessage('Invalid OTP purpose'),
];

const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const getAuthConfig = (_req, res) => {
  res.json({
    success: true,
    data: {
      developmentMode,
      otpRequired: !developmentMode,
      otpChannel: termii.otpChannel,
      termiiConfigured: Boolean(termii.apiKey && termii.apiKey !== 'dev-placeholder'),
    },
  });
};

const sendOtp = async (req, res, next) => {
  try {
    const { email, phone, purpose = OTP_PURPOSES.REGISTRATION } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    if (purpose === OTP_PURPOSES.REGISTRATION) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    if (purpose === OTP_PURPOSES.PASSWORD_RESET) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'No account found with this email' });
      }
    }

    const result = await sendOTP({
      email: normalizedEmail,
      phone: phone || undefined,
      purpose,
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        channel: result.channel,
        expiresInSeconds: result.expiresInSeconds,
        purpose,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, phone, purpose = OTP_PURPOSES.REGISTRATION } = req.body;
    const result = await verifyOTP({
      email: email.trim().toLowerCase(),
      phone,
      code: otp,
      purpose,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ success: true, message: result.message, data: { verified: true, purpose } });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber, password, referralCode } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    if (!developmentMode && !isEmailOtpVerified(normalizedEmail, OTP_PURPOSES.REGISTRATION)) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email with OTP before registering',
      });
    }

    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    }

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phoneNumber,
      passwordHash: password,
      referralCode: generateReferralCode(fullName),
      referredBy: referrer?._id || null,
      isEmailVerified: true,
    });

    await Wallet.create({ userId: user._id, balance: 0 });

    if (referrer) {
      await Referral.create({
        referrerId: referrer._id,
        referredUserId: user._id,
        earnings: referralBonus,
        status: 'pending',
      });
    }

    const token = signToken({ id: user._id, tokenType: 'user' });
    clearEmailVerification(normalizedEmail, OTP_PURPOSES.REGISTRATION);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          referralCode: user.referralCode,
          walletBalance: user.walletBalance,
          kycStatus: user.kycStatus,
          isEmailVerified: user.isEmailVerified,
          darkMode: user.darkMode,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash hasTransactionPin accountStatus');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    const token = signToken({ id: user._id, tokenType: 'user' });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          referralCode: user.referralCode,
          walletBalance: user.walletBalance,
          kycStatus: user.kycStatus,
          isEmailVerified: user.isEmailVerified,
          darkMode: user.darkMode,
          avatar: user.avatar,
          accountStatus: user.accountStatus,
          hasTransactionPin: user.hasTransactionPin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    const result = await sendOTP({
      email: normalizedEmail,
      phone: user.phoneNumber,
      purpose: OTP_PURPOSES.PASSWORD_RESET,
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        channel: result.channel,
        expiresInSeconds: result.expiresInSeconds,
        purpose: OTP_PURPOSES.PASSWORD_RESET,
      },
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!developmentMode) {
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP code is required' });
      }

      const result = await verifyOTP({
        email: normalizedEmail,
        phone: user.phoneNumber,
        code: otp,
        purpose: OTP_PURPOSES.PASSWORD_RESET,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
    }

    user.passwordHash = newPassword;
    await user.save();
    clearEmailVerification(normalizedEmail, OTP_PURPOSES.PASSWORD_RESET);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phoneNumber } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phoneNumber },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { darkMode, useSystemTheme, biometricEnabled, notificationSettings } = req.body;
    const updates = {};

    if (darkMode !== undefined) updates.darkMode = darkMode;
    if (useSystemTheme !== undefined) updates.useSystemTheme = useSystemTheme;
    if (biometricEnabled !== undefined) updates.biometricEnabled = biometricEnabled;
    if (notificationSettings !== undefined) updates.notificationSettings = notificationSettings;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ success: false, message: 'Avatar image is required' });
    }

    if (!avatar.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Invalid image format' });
    }

    if (avatar.length > 500000) {
      return res.status(400).json({ success: false, message: 'Image is too large. Max size is ~350KB' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true }).select('-passwordHash');

    res.json({ success: true, message: 'Avatar updated', data: user });
  } catch (error) {
    next(error);
  }
};

const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: null }, { new: true }).select('-passwordHash');
    res.json({ success: true, message: 'Avatar removed', data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthConfig,
  sendOtp,
  verifyOtp,
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  updateSettings,
  updateAvatar,
  removeAvatar,
  sendOtpValidation,
  verifyOtpValidation,
  registerValidation,
  loginValidation,
  resetPasswordValidation,
};
