const express = require('express');
const { getTransactions, getTransactionById } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getTransactions);
router.get('/:id', getTransactionById);

module.exports = router;
