const express = require('express');
const {
  getBalance,
  getPaystackConfig,
  fundWallet,
  verifyFunding,
  getWalletHistory,
  transferFunds,
  fundValidation,
  transferValidation,
} = require('../controllers/walletController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');

const router = express.Router();

router.use(protect);

router.get('/balance', getBalance);
router.get('/payment-config', getPaystackConfig);
router.post('/fund', idempotency('wallet:fund'), fundValidation, validate, fundWallet);
router.post('/transfer', idempotency('wallet:transfer'), transferValidation, validate, transferFunds);
router.get('/verify/:reference', verifyFunding);
router.get('/history', getWalletHistory);

module.exports = router;
