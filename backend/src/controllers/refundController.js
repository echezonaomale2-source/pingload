const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { buildSafeRegex, parsePagination } = require('../utils/safeQuery');

const formatRefundRow = (t) => ({
  id: t._id,
  userId: t.userId?._id,
  userName: t.userId?.fullName || 'Unknown',
  userEmail: t.userId?.email || '',
  service: t.service,
  amount: t.amount,
  refundAmount: t.refundAmount || t.amount,
  status: t.status,
  reference: t.reference,
  refundReference: t.refundReference || t.reference,
  refundReason: t.refundReason || '',
  originalTransactionReference: t.originalTransactionReference || '',
  originalTransactionId: t.originalTransactionId,
  refundedAt: t.refundedAt || t.createdAt,
  description: t.description,
  createdAt: t.createdAt,
});

// GET /admin/refunds
const getRefunds = async (req, res, next) => {
  try {
    const {
      search = '',
      userId = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pagination = parsePagination({ page, limit });
    const filter = { transactionType: 'refund' };

    if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.refundedAt = {};
      if (startDate) filter.refundedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.refundedAt.$lte = end;
      }
    }

    const regex = buildSafeRegex(search);
    if (regex) {
      const users = await User.find({
        $or: [
          { fullName: regex },
          { email: regex },
          { phoneNumber: regex },
        ],
      }).select('_id');
      const userIds = users.map((u) => u._id);

      filter.$or = [
        { reference: regex },
        { refundReference: regex },
        { originalTransactionReference: regex },
        { refundReason: regex },
        ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const [refunds, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'fullName email phoneNumber')
        .populate('originalTransactionId', 'reference service amount status description createdAt')
        .sort({ refundedAt: -1, createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: refunds.map(formatRefundRow),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/refunds/:id
const getRefundById = async (req, res, next) => {
  try {
    const refund = await Transaction.findOne({
      _id: req.params.id,
      transactionType: 'refund',
    })
      .populate('userId', 'fullName email phoneNumber')
      .populate('originalTransactionId');

    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    res.json({ success: true, data: refund });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRefunds, getRefundById };
