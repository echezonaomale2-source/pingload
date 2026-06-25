const Admin = require('../models/Admin');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const KycDocument = require('../models/KycDocument');
const Referral = require('../models/Referral');
const SystemSettings = require('../models/SystemSettings');
const SupportTicket = require('../models/SupportTicket');
const { deliverUserNotification, deliverBulkNotification } = require('../services/notificationDeliveryService');
const { signToken } = require('../config/jwt');
const adjustWallet = require('../utils/adjustWallet');
const { buildSafeRegex, parsePagination } = require('../utils/safeQuery');

// POST /admin/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken({ id: admin._id, role: admin.role, tokenType: 'admin' });
    res.json({
      success: true,
      data: {
        token,
        admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, data: req.admin });
};

// GET /admin/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTransactions,
      todayTransactions,
      successfulTransactions,
      pendingTransactions,
      failedTransactions,
      revenueAgg,
      walletAgg,
      recentTransactions,
      serviceAgg,
      monthlyRevenue,
      totalRefunds,
      refundAmountTodayAgg,
      totalRefundedAmountAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: 'active' }),
      User.countDocuments({ accountStatus: 'suspended' }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ createdAt: { $gte: todayStart } }),
      Transaction.countDocuments({ status: 'successful' }),
      Transaction.countDocuments({ status: 'pending' }),
      Transaction.countDocuments({ status: 'failed' }),
      Transaction.aggregate([
        { $match: { status: 'successful', transactionType: 'debit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$walletBalance' } } }]),
      Transaction.find()
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(5),
      Transaction.aggregate([
        { $match: { status: 'successful' } },
        { $group: { _id: '$service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { status: 'successful', createdAt: { $gte: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Transaction.countDocuments({ transactionType: 'refund' }),
      Transaction.aggregate([
        { $match: { transactionType: 'refund', refundedAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', '$amount'] } } } },
      ]),
      Transaction.aggregate([
        { $match: { transactionType: 'refund' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', '$amount'] } } } },
      ]),
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueChartData = monthlyRevenue.map((m) => ({
      month: monthNames[m._id.month - 1],
      revenue: m.revenue,
      transactions: m.transactions,
    }));

    const totalServiceCount = serviceAgg.reduce((s, i) => s + i.count, 0) || 1;
    const serviceColors = {
      airtime: '#0057D9', data: '#FF7A00', electricity: '#F59E0B',
      tv: '#8B5CF6', betting: '#EF4444', education: '#10B981',
      wallet_funding: '#06B6D4', admin_credit: '#10B981', admin_debit: '#EF4444',
    };
    const serviceBreakdown = serviceAgg.slice(0, 6).map((s) => ({
      name: s._id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Math.round((s.count / totalServiceCount) * 100),
      color: serviceColors[s._id] || '#6B7280',
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          totalTransactions,
          todayTransactions,
          totalRevenue: revenueAgg[0]?.total || 0,
          walletBalance: walletAgg[0]?.total || 0,
          successfulTransactions,
          pendingTransactions,
          failedTransactions,
          totalRefunds,
          refundAmountToday: refundAmountTodayAgg[0]?.total || 0,
          totalRefundedAmount: totalRefundedAmountAgg[0]?.total || 0,
        },
        revenueChartData,
        serviceBreakdown,
        recentTransactions: recentTransactions.map((t) => ({
          id: t._id,
          userName: t.userId?.fullName || 'Unknown',
          service: t.service,
          amount: t.amount,
          status: t.status,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/users
const getUsers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const pagination = parsePagination({ page, limit });
    const filter = {};
    const regex = buildSafeRegex(search);
    if (regex) {
      filter.$or = [{ fullName: regex }, { email: regex }, { phoneNumber: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -transactionPin')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      User.countDocuments(filter),
    ]);

    const usersWithTxCount = await Promise.all(
      users.map(async (u) => {
        const txCount = await Transaction.countDocuments({ userId: u._id });
        return {
          id: u._id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phoneNumber,
          walletBalance: u.walletBalance,
          status: u.accountStatus,
          kycStatus: u.kycStatus,
          joinedAt: u.createdAt,
          transactions: txCount,
        };
      })
    );

    res.json({
      success: true,
      data: usersWithTxCount,
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

// GET /admin/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -transactionPin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [txCount, transactions] = await Promise.all([
      Transaction.countDocuments({ userId: user._id }),
      Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
    ]);

    res.json({
      success: true,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        walletBalance: user.walletBalance,
        status: user.accountStatus,
        kycStatus: user.kycStatus,
        joinedAt: user.createdAt,
        transactions: txCount,
        recentTransactions: transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/users/:id/status
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: status }, { new: true })
      .select('-passwordHash -transactionPin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// POST /admin/users/:id/wallet
const adjustUserWallet = async (req, res, next) => {
  try {
    const { type, amount, note } = req.body;
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be credit or debit' });
    }
    const result = await adjustWallet(req.params.id, { type, amount: parseFloat(amount), note, adminName: req.admin.name });
    res.json({ success: true, message: `Wallet ${type} successful`, data: result });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

// DELETE /admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await Promise.all([
      Wallet.deleteOne({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      KycDocument.deleteMany({ userId: user._id }),
    ]);
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /admin/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { search = '', service = 'all', status = 'all', page = 1, limit = 20 } = req.query;
    const pagination = parsePagination({ page, limit });
    const filter = {};
    if (service !== 'all') filter.service = service;
    if (status !== 'all') filter.status = status;

    const regex = buildSafeRegex(search);
    if (regex) {
      const users = await User.find({
        $or: [
          { fullName: regex },
          { email: regex },
        ],
      }).select('_id');
      const userIds = users.map((u) => u._id);
      filter.$or = [
        { reference: regex },
        ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions.map((t) => ({
        id: t._id,
        userId: t.userId?._id,
        userName: t.userId?.fullName || 'Unknown',
        service: t.service,
        amount: t.amount,
        status: t.status,
        reference: t.reference,
        transactionType: t.transactionType,
        description: t.description,
        createdAt: t.createdAt,
      })),
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

// GET /admin/transactions/:id
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('userId', 'fullName email phoneNumber');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// GET /admin/wallets/history
const getWalletHistory = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const pagination = parsePagination({ page, limit });
    const filter = { service: { $in: ['admin_credit', 'admin_debit', 'wallet_funding'] } };

    const transactions = await Transaction.find(filter)
      .populate('userId', 'fullName')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);

    const total = await Transaction.countDocuments(filter);

    let data = transactions.map((t) => ({
      id: t._id,
      userId: t.userId?._id,
      userName: t.userId?.fullName || 'Unknown',
      type: t.transactionType,
      amount: t.amount,
      balance: null,
      note: t.description,
      createdAt: t.createdAt,
    }));

    if (search) {
      const q = search.toLowerCase();
      data = data.filter((d) => d.userName.toLowerCase().includes(q) || String(d.id).includes(q));
    }

    res.json({
      success: true,
      data,
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

// POST /admin/wallets/adjust
const walletAdjust = async (req, res, next) => {
  try {
    const { userId, type, amount, note } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    const result = await adjustWallet(userId, { type, amount: parseFloat(amount), note, adminName: req.admin.name });
    res.json({ success: true, message: `Wallet ${type} successful`, data: result });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

// GET /admin/services
const getServices = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({ success: true, data: settings.services });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/services/:id
const toggleService = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    const service = settings.services.find((s) => s.id === req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    service.enabled = req.body.enabled !== undefined ? req.body.enabled : !service.enabled;
    await settings.save();
    res.json({ success: true, data: settings.services });
  } catch (error) {
    next(error);
  }
};

// GET /admin/notifications
const getAdminNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ type: 'system' })
      .populate('userId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(100);

    const grouped = {};
    notifications.forEach((n) => {
      const key = `${n.title}|${n.message}|${n.createdAt.toISOString().slice(0, 16)}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: n._id,
          title: n.title,
          message: n.message,
          recipient: n.metadata?.broadcast ? 'All Users' : n.userId?.fullName || 'User',
          sentAt: n.createdAt,
          status: 'sent',
        };
      }
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
};

// POST /admin/notifications
const sendNotification = async (req, res, next) => {
  try {
    const { title, message, recipient = 'all', userId, screen = 'Notifications' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let deliveryResult;

    if (recipient === 'all') {
      const users = await User.find({ accountStatus: 'active' }).select('_id');
      deliveryResult = await deliverBulkNotification({
        userIds: users.map((u) => u._id),
        title,
        message,
        type: 'system',
        screen,
        metadata: { broadcast: true, screen },
      });
    } else if (userId) {
      deliveryResult = await deliverUserNotification({
        userId,
        title,
        message,
        type: 'system',
        screen,
        metadata: { screen },
      });
    } else {
      return res.status(400).json({ success: false, message: 'userId required for specific recipient' });
    }

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        push: deliveryResult?.pushResult || null,
        count: deliveryResult?.notifications?.length || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/referrals
const getReferrals = async (req, res, next) => {
  try {
    const referrals = await Referral.find()
      .populate('referrerId', 'fullName')
      .populate('referredUserId', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: referrals.map((r) => ({
        id: r._id,
        referrer: r.referrerId?.fullName || 'Unknown',
        referrerId: r.referrerId?._id,
        referred: r.referredUserId?.fullName || 'Unknown',
        referredId: r.referredUserId?._id,
        earnings: r.earnings,
        status: r.status === 'credited' ? 'completed' : 'pending',
        date: r.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/referrals/top
const getTopReferrers = async (req, res, next) => {
  try {
    const top = await Referral.aggregate([
      { $group: { _id: '$referrerId', referrals: { $sum: 1 }, earnings: { $sum: '$earnings' } } },
      { $sort: { referrals: -1 } },
      { $limit: 5 },
    ]);

    const result = await Promise.all(
      top.map(async (t, i) => {
        const user = await User.findById(t._id).select('fullName');
        return { rank: i + 1, name: user?.fullName || 'Unknown', referrals: t.referrals, earnings: t.earnings };
      })
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /admin/support/tickets
const getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tickets.map((t) => ({
        id: t._id,
        ticketId: `TKT-${String(t._id).slice(-4).toUpperCase()}`,
        user: t.userId?.fullName || 'Unknown',
        userId: t.userId?._id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        messages: t.messages.length,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/support/tickets/:id
const getSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('userId', 'fullName email');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// POST /admin/support/tickets/:id/reply
const replyTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.messages.push({ sender: req.admin.name, role: 'admin', message });
    if (ticket.status === 'open') ticket.status = 'resolved';
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/support/tickets/:id/close
const closeTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// GET /admin/settings
const getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: {
        maintenanceMode: settings.maintenanceMode,
        otpRequired: settings.otpRequired,
        minWalletFund: settings.minWalletFund,
        maxWalletFund: settings.maxWalletFund,
        referralBonus: settings.referralBonus,
        supportEmail: settings.supportEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/settings
const updateSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    const allowed = ['maintenanceMode', 'otpRequired', 'minWalletFund', 'maxWalletFund', 'referralBonus', 'supportEmail'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    });
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/settings/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select('+passwordHash');
    if (!(await admin.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    admin.passwordHash = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  adjustUserWallet,
  getTransactions,
  getTransactionById,
  getWalletHistory,
  walletAdjust,
  getServices,
  toggleService,
  getAdminNotifications,
  sendNotification,
  getReferrals,
  getTopReferrers,
  getSupportTickets,
  getSupportTicket,
  replyTicket,
  closeTicket,
  getSettings,
  updateSettings,
  changePassword,
};
