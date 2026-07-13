const { body } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Referral = require('../models/Referral');
const Notification = require('../models/Notification');
const KycDocument = require('../models/KycDocument');
const Transaction = require('../models/Transaction');
const {
  sendOTP,
  verifyOTP,
  isEmailOtpVerified,
  clearEmailVerification,
  OTP_PURPOSES,
} = require('../services/termiiService');
const generateReferralCode = require('../utils/generateReferralCode');
const { signToken, verifyToken } = require('../config/jwt');
const { revokeToken } = require('../services/tokenAuthService');
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
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const updateProfileValidation = [
  body('fullName').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Full name must be 2-80 characters'),
  body('phoneNumber').optional().matches(/^(\+?234|0)[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const deleteAccountValidation = [
  body('password').notEmpty().withMessage('Password is required to delete your account'),
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

    console.log('[OTP][controller] send_otp_success', {
      email: normalizedEmail,
      purpose,
      channel: result.channel,
      expiresInSeconds: result.expiresInSeconds,
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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    console.log('[OTP][controller] verify_otp_request', {
      email: normalizedEmail,
      phone: phone ? 'provided' : null,
      purpose,
      otpLength: String(otp || '').trim().length,
    });
    const result = await verifyOTP({
      email: normalizedEmail,
      phone,
      code: otp,
      purpose,
    });
    console.log('[OTP][controller] verify_otp_result', {
      email: normalizedEmail,
      purpose,
      success: result.success,
      message: result.message,
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

    const otpVerified = developmentMode
      || (await isEmailOtpVerified(normalizedEmail, OTP_PURPOSES.REGISTRATION));
    console.log('[OTP][controller] register_otp_gate', {
      email: normalizedEmail,
      developmentMode,
      otpVerified,
    });
    if (!otpVerified) {
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
    console.log('[OTP][controller] user_created', {
      email: normalizedEmail,
      userId: String(user._id),
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

    const token = signToken({ id: user._id, tokenType: 'user', tokenVersion: user.tokenVersion ?? 0 });
    await clearEmailVerification(normalizedEmail, OTP_PURPOSES.REGISTRATION);

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
          hasLoginPin: Boolean(user.hasLoginPin),
          loginPinLength: user.loginPinLength || null,
          hasTransactionPin: Boolean(user.hasTransactionPin),
          requireLoginPinReset: Boolean(user.requireLoginPinReset),
          biometricEnabled: Boolean(user.biometricEnabled),
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
    const normalizedEmail = email.trim().toLowerCase();

    // tokenVersion MUST be selected — an inclusive .select() otherwise omits it and
    // JWTs get signed as version 0 while the DB may already be >0 after prior logouts.
    const user = await User.findOne({ email: normalizedEmail })
      .select('+passwordHash hasTransactionPin hasLoginPin loginPinLength accountStatus tokenVersion requireLoginPinReset biometricEnabled');
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

    user.appUnlockedUntil = null;
    await user.save();

    const tokenVersion = Number.isFinite(user.tokenVersion) ? user.tokenVersion : 0;
    const token = signToken({ id: user._id, tokenType: 'user', tokenVersion });

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
          hasLoginPin: Boolean(user.hasLoginPin),
          loginPinLength: user.loginPinLength || null,
          requireLoginPinReset: Boolean(user.requireLoginPinReset),
          biometricEnabled: user.biometricEnabled,
          notificationSettings: user.notificationSettings,
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
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await clearEmailVerification(normalizedEmail, OTP_PURPOSES.PASSWORD_RESET);

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
    const updates = {};
    if (req.body.fullName !== undefined) updates.fullName = String(req.body.fullName).trim();
    if (req.body.phoneNumber !== undefined) updates.phoneNumber = String(req.body.phoneNumber).trim();

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No profile fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
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
    user.tokenVersion = (user.tokenVersion || 0) + 1;
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

const MAX_AVATAR_LENGTH = 500000;
const AVATAR_MIME_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

const updateAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({ success: false, message: 'Avatar image is required' });
    }

    if (!AVATAR_MIME_RE.test(avatar)) {
      return res.status(400).json({ success: false, message: 'Invalid image format. Use JPEG, PNG, or WebP.' });
    }

    if (avatar.length > MAX_AVATAR_LENGTH) {
      return res.status(400).json({ success: false, message: 'Image is too large. Please choose a smaller photo.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

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

const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordValid = await user.comparePassword(req.body.password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const wallet = await Wallet.findOne({ userId: user._id });
    const balance = wallet?.balance ?? user.walletBalance ?? 0;
    if (balance > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please spend or transfer your wallet balance before deleting your account.',
        code: 'WALLET_BALANCE_REMAINING',
      });
    }

    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;
    if (token) {
      try {
        const decoded = verifyToken(token);
        await revokeToken(token, decoded);
      } catch {
        // Token may already be invalid.
      }
    }

    await Promise.all([
      Wallet.deleteOne({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      KycDocument.deleteMany({ userId: user._id }),
      Referral.deleteMany({ $or: [{ referrerId: user._id }, { referredUserId: user._id }] }),
    ]);

    await Transaction.updateMany(
      { userId: user._id },
      { $set: { 'metadata.accountDeleted': true, 'metadata.accountDeletedAt': new Date() } }
    );

    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (token) {
      try {
        const decoded = verifyToken(token);
        // Bump version first so any in-flight requests with this JWT fail closed,
        // then revoke the concrete token hash.
        await User.findByIdAndUpdate(decoded.id, { $inc: { tokenVersion: 1 } });
        await revokeToken(token, decoded);
      } catch {
        // Token may already be invalid; still clear local session on client.
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
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
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  updateSettings,
  updateAvatar,
  removeAvatar,
  deleteAccount,
  sendOtpValidation,
  verifyOtpValidation,
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  updateProfileValidation,
  changePasswordValidation,
  deleteAccountValidation,
};
