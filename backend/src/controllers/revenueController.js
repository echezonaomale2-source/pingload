const Transaction = require('../models/Transaction');
const DataPlan = require('../models/DataPlan');

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = (date = new Date()) => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
};

const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1);

const sumRevenue = async (match) => {
  const result = await Transaction.aggregate([
    { $match: { ...match, status: 'successful', transactionType: 'debit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

const revenueByService = async (match) => {
  const rows = await Transaction.aggregate([
    { $match: { ...match, status: 'successful', transactionType: 'debit' } },
    { $group: { _id: '$service', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
  ]);
  return rows.map((row) => ({
    service: row._id,
    revenue: row.revenue,
    count: row.count,
  }));
};

const estimateCommission = async (match) => {
  const dataTxns = await Transaction.find({
    ...match,
    status: 'successful',
    transactionType: 'debit',
    service: 'data',
  }).select('amount metadata.variationCode metadata.network');

  if (!dataTxns.length) return 0;

  const plans = await DataPlan.find({ enabled: true }).select('network variationCode commissionPercent amount');
  const planMap = new Map(plans.map((p) => [`${p.network}:${p.variationCode}`, p]));

  return dataTxns.reduce((sum, txn) => {
    const key = `${txn.metadata?.network}:${txn.metadata?.variationCode}`;
    const plan = planMap.get(key);
    if (!plan?.commissionPercent) return sum;
    return sum + (txn.amount * plan.commissionPercent) / 100;
  }, 0);
};

const getRevenueDashboard = async (_req, res, next) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const [
      totalRevenue,
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueYear,
      serviceBreakdown,
      commissionTotal,
      monthlyTrend,
    ] = await Promise.all([
      sumRevenue({}),
      sumRevenue({ createdAt: { $gte: todayStart } }),
      sumRevenue({ createdAt: { $gte: weekStart } }),
      sumRevenue({ createdAt: { $gte: monthStart } }),
      sumRevenue({ createdAt: { $gte: yearStart } }),
      revenueByService({ createdAt: { $gte: monthStart } }),
      estimateCommission({ createdAt: { $gte: monthStart } }),
      Transaction.aggregate([
        { $match: { status: 'successful', transactionType: 'debit', createdAt: { $gte: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    res.json({
      success: true,
      data: {
        totals: {
          totalRevenue,
          totalCommission: commissionTotal,
          revenueToday,
          revenueWeek,
          revenueMonth,
          revenueYear,
        },
        serviceBreakdown,
        monthlyTrend: monthlyTrend.map((m) => ({
          month: monthNames[m._id.month - 1],
          revenue: m.revenue,
          transactions: m.transactions,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRevenueDashboard };
