const express = require('express');
const {
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
} = require('../controllers/authController');
const {
  getLoginPinStatus,
  setupLoginPin,
  changeLoginPin,
  forgotLoginPin,
  resetLoginPinWithOtp,
  verifyLoginPin,
  confirmBiometricUnlock,
  loginPinValidation,
  changeLoginPinValidation,
  resetLoginPinWithOtpValidation,
} = require('../controllers/loginPinSecurityController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter, loginPinLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/config', getAuthConfig);
router.post('/send-otp', authLimiter, sendOtpValidation, validate, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtpValidation, validate, verifyOtp);
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/logout', protect, logout);
router.post('/forgot-password', authLimiter, sendOtpValidation, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, resetPassword);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, validate, updateProfile);
router.put('/change-password', protect, changePasswordValidation, validate, changePassword);
router.put('/settings', protect, updateSettings);
router.put('/avatar', protect, updateAvatar);
router.delete('/avatar', protect, removeAvatar);
router.delete('/account', protect, authLimiter, deleteAccountValidation, validate, deleteAccount);

router.get('/login-pin/status', protect, getLoginPinStatus);
// Authenticated PIN setup must not share the public login rate limiter —
// users often hit setup immediately after several login attempts.
router.post('/login-pin/setup', protect, loginPinLimiter, loginPinValidation, validate, setupLoginPin);
router.put('/login-pin/change', protect, loginPinLimiter, changeLoginPinValidation, validate, changeLoginPin);
router.post('/login-pin/forgot', protect, loginPinLimiter, forgotLoginPin);
router.post('/login-pin/reset-with-otp', protect, loginPinLimiter, resetLoginPinWithOtpValidation, validate, resetLoginPinWithOtp);
router.post('/login-pin/verify', protect, loginPinLimiter, loginPinValidation, validate, verifyLoginPin);
router.post('/login-pin/biometric-unlock', protect, loginPinLimiter, confirmBiometricUnlock);

module.exports = router;
