const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getKycStatus, submitKyc, submitValidation } = require('../controllers/kycController');

const router = express.Router();

router.get('/status', protect, getKycStatus);
router.post('/submit', protect, submitValidation, validate, submitKyc);

module.exports = router;
