const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  getPinStatus,
  createPin,
  changePin,
  verifyPin,
  pinValidation,
  changePinValidation,
} = require('../controllers/pinController');

const router = express.Router();

router.get('/status', protect, getPinStatus);
router.post('/create', protect, authLimiter, pinValidation, validate, createPin);
router.put('/change', protect, authLimiter, changePinValidation, validate, changePin);
router.post('/verify', protect, authLimiter, pinValidation, validate, verifyPin);

module.exports = router;
