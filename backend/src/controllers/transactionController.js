const Transaction = require('../models/Transaction');
const User = require('../models/User');

// GET /transactions
const getTransactions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (status === 'refunded') {
      filter.transactionType = 'refund';
    } else if (status && status !== 'all') {
      filter.status = status;
      filter.transactionType = { $ne: 'refund' };
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /transactions/:id
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    let linkedRefund = null;
    let originalTransaction = null;

    if (transaction.transactionType === 'refund' && transaction.originalTransactionId) {
      originalTransaction = await Transaction.findById(transaction.originalTransactionId).select(
        'reference service amount status description createdAt'
      );
    } else if (transaction.metadata?.refundTransactionId) {
      linkedRefund = await Transaction.findById(transaction.metadata.refundTransactionId).select(
        'reference amount refundReason refundedAt status description createdAt'
      );
    }

    res.json({
      success: true,
      data: {
        ...transaction.toObject(),
        linkedRefund,
        originalTransaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTransactions, getTransactionById };
