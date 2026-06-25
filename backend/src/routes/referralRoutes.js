const express = require('express');
const { getReferralStats } = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getReferralStats);

module.exports = router;
