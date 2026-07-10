const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { parsePagination } = require('../utils/safeQuery');

// GET /transactions
const getTransactions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { userId: req.user._id };

    if (status === 'refunded') {
      filter.transactionType = 'refund';
    } else if (status && status !== 'all') {
      filter.status = status;
      filter.transactionType = { $ne: 'refund' };
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
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
      originalTransaction = await Transaction.findOne({
        _id: transaction.originalTransactionId,
        userId: req.user._id,
      }).select('reference service amount status description createdAt');
    } else if (transaction.metadata?.refundTransactionId) {
      linkedRefund = await Transaction.findOne({
        _id: transaction.metadata.refundTransactionId,
        userId: req.user._id,
      }).select('reference amount refundReason refundedAt status description createdAt');
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
