const express = require('express');
const {
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
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/config', getAuthConfig);
router.post('/send-otp', authLimiter, sendOtpValidation, validate, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtpValidation, validate, verifyOtp);
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/forgot-password', authLimiter, sendOtpValidation, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, resetPassword);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/settings', protect, updateSettings);
router.put('/avatar', protect, updateAvatar);
router.delete('/avatar', protect, removeAvatar);

module.exports = router;
