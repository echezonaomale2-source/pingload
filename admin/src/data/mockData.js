// Dummy data — replace with API calls later

export const dashboardStats = {
  totalUsers: 12847,
  totalTransactions: 89432,
  totalRevenue: 45892000,
  walletBalance: 12450000,
  successfulTransactions: 82104,
  pendingTransactions: 3421,
  failedTransactions: 3907,
};

export const revenueChartData = [
  { month: 'Jan', revenue: 3200000, transactions: 6200 },
  { month: 'Feb', revenue: 3800000, transactions: 7100 },
  { month: 'Mar', revenue: 4100000, transactions: 7800 },
  { month: 'Apr', revenue: 3900000, transactions: 7400 },
  { month: 'May', revenue: 4500000, transactions: 8200 },
  { month: 'Jun', revenue: 4800000, transactions: 8900 },
  { month: 'Jul', revenue: 5200000, transactions: 9400 },
];

export const serviceBreakdown = [
  { name: 'Airtime', value: 28, color: '#0057D9' },
  { name: 'Data', value: 32, color: '#FF7A00' },
  { name: 'Electricity', value: 14, color: '#F59E0B' },
  { name: 'TV', value: 10, color: '#8B5CF6' },
  { name: 'Betting', value: 9, color: '#EF4444' },
  { name: 'Education', value: 7, color: '#10B981' },
];

export const users = [
  { id: 'U001', fullName: 'Ada Okonkwo', email: 'ada@email.com', phone: '08031234567', walletBalance: 45000, status: 'active', kycStatus: 'verified', joinedAt: '2025-11-12', transactions: 142 },
  { id: 'U002', fullName: 'Chidi Eze', email: 'chidi@email.com', phone: '08098765432', walletBalance: 12800, status: 'active', kycStatus: 'verified', joinedAt: '2025-12-03', transactions: 89 },
  { id: 'U003', fullName: 'Fatima Bello', email: 'fatima@email.com', phone: '08123456789', walletBalance: 0, status: 'suspended', kycStatus: 'pending', joinedAt: '2026-01-15', transactions: 12 },
  { id: 'U004', fullName: 'Emeka Nwosu', email: 'emeka@email.com', phone: '07012345678', walletBalance: 92000, status: 'active', kycStatus: 'verified', joinedAt: '2025-10-20', transactions: 256 },
  { id: 'U005', fullName: 'Grace Adeyemi', email: 'grace@email.com', phone: '09087654321', walletBalance: 5600, status: 'active', kycStatus: 'unverified', joinedAt: '2026-02-01', transactions: 34 },
  { id: 'U006', fullName: 'Ibrahim Musa', email: 'ibrahim@email.com', phone: '08156789012', walletBalance: 210000, status: 'active', kycStatus: 'verified', joinedAt: '2025-09-08', transactions: 412 },
  { id: 'U007', fullName: 'Ngozi Okafor', email: 'ngozi@email.com', phone: '08034567890', walletBalance: 3400, status: 'suspended', kycStatus: 'verified', joinedAt: '2025-08-22', transactions: 67 },
  { id: 'U008', fullName: 'Tunde Bakare', email: 'tunde@email.com', phone: '07098761234', walletBalance: 78500, status: 'active', kycStatus: 'verified', joinedAt: '2026-01-28', transactions: 98 },
];

export const transactions = [
  { id: 'TXN-98234', userId: 'U001', userName: 'Ada Okonkwo', service: 'airtime', amount: 1000, status: 'successful', reference: 'PL-98234-AIR', createdAt: '2026-06-19T10:32:00' },
  { id: 'TXN-98233', userId: 'U004', userName: 'Emeka Nwosu', service: 'data', amount: 2500, status: 'successful', reference: 'PL-98233-DAT', createdAt: '2026-06-19T10:28:00' },
  { id: 'TXN-98232', userId: 'U002', userName: 'Chidi Eze', service: 'electricity', amount: 5000, status: 'pending', reference: 'PL-98232-ELE', createdAt: '2026-06-19T10:15:00' },
  { id: 'TXN-98231', userId: 'U006', userName: 'Ibrahim Musa', service: 'betting', amount: 10000, status: 'successful', reference: 'PL-98231-BET', createdAt: '2026-06-19T09:58:00' },
  { id: 'TXN-98230', userId: 'U005', userName: 'Grace Adeyemi', service: 'tv', amount: 7400, status: 'failed', reference: 'PL-98230-TV', createdAt: '2026-06-19T09:42:00' },
  { id: 'TXN-98229', userId: 'U008', userName: 'Tunde Bakare', service: 'education', amount: 3500, status: 'successful', reference: 'PL-98229-EDU', createdAt: '2026-06-19T09:30:00' },
  { id: 'TXN-98228', userId: 'U001', userName: 'Ada Okonkwo', service: 'wallet_credit', amount: 20000, status: 'successful', reference: 'PL-98228-WAL', createdAt: '2026-06-19T08:55:00' },
  { id: 'TXN-98227', userId: 'U003', userName: 'Fatima Bello', service: 'airtime', amount: 500, status: 'failed', reference: 'PL-98227-AIR', createdAt: '2026-06-19T08:40:00' },
  { id: 'TXN-98226', userId: 'U004', userName: 'Emeka Nwosu', service: 'data', amount: 1500, status: 'successful', reference: 'PL-98226-DAT', createdAt: '2026-06-18T22:10:00' },
  { id: 'TXN-98225', userId: 'U006', userName: 'Ibrahim Musa', service: 'electricity', amount: 8000, status: 'successful', reference: 'PL-98225-ELE', createdAt: '2026-06-18T21:45:00' },
];

export const walletHistory = [
  { id: 'WH-001', userId: 'U001', userName: 'Ada Okonkwo', type: 'credit', amount: 20000, balance: 45000, note: 'Admin credit', createdAt: '2026-06-19T08:55:00' },
  { id: 'WH-002', userId: 'U004', userName: 'Emeka Nwosu', type: 'debit', amount: 5000, balance: 92000, note: 'Admin debit', createdAt: '2026-06-18T14:20:00' },
  { id: 'WH-003', userId: 'U006', userName: 'Ibrahim Musa', type: 'credit', amount: 50000, balance: 210000, note: 'Promo bonus', createdAt: '2026-06-17T11:00:00' },
  { id: 'WH-004', userId: 'U002', userName: 'Chidi Eze', type: 'credit', amount: 10000, balance: 12800, note: 'Refund', createdAt: '2026-06-16T09:30:00' },
  { id: 'WH-005', userId: 'U007', userName: 'Ngozi Okafor', type: 'debit', amount: 2000, balance: 3400, note: 'Chargeback', createdAt: '2026-06-15T16:45:00' },
];

export const services = [
  { id: 'airtime', name: 'Airtime', enabled: true, description: 'MTN, Airtel, Glo, 9mobile airtime top-up' },
  { id: 'data', name: 'Data Subscription', enabled: true, description: 'Data bundles for all networks' },
  { id: 'electricity', name: 'Electricity', enabled: true, description: 'Electricity bill payments' },
  { id: 'tv', name: 'TV Subscription', enabled: true, description: 'DStv, GOtv, StarTimes' },
  { id: 'betting', name: 'Betting', enabled: true, description: 'Bet9ja, SportyBet, BetKing, 1xBet' },
  { id: 'education', name: 'Education Pins', enabled: false, description: 'WAEC, NECO, JAMB pins' },
];

export const notifications = [
  { id: 'N001', title: 'System Maintenance', message: 'Scheduled maintenance on June 20, 2026 from 2–4 AM.', recipient: 'All Users', sentAt: '2026-06-18T10:00:00', status: 'sent' },
  { id: 'N002', title: 'New Data Promo', message: 'Get 20% bonus on all MTN data plans this weekend!', recipient: 'All Users', sentAt: '2026-06-17T14:30:00', status: 'sent' },
  { id: 'N003', title: 'Wallet Credited', message: 'Your wallet has been credited with ₦20,000.', recipient: 'Ada Okonkwo', sentAt: '2026-06-19T08:56:00', status: 'sent' },
  { id: 'N004', title: 'KYC Reminder', message: 'Please complete your KYC verification.', recipient: 'Grace Adeyemi', sentAt: '2026-06-16T09:00:00', status: 'sent' },
];

export const referrals = [
  { id: 'R001', referrer: 'Emeka Nwosu', referrerId: 'U004', referred: 'Grace Adeyemi', referredId: 'U005', earnings: 500, status: 'completed', date: '2026-02-01' },
  { id: 'R002', referrer: 'Ada Okonkwo', referrerId: 'U001', referred: 'Chidi Eze', referredId: 'U002', earnings: 500, status: 'completed', date: '2025-12-03' },
  { id: 'R003', referrer: 'Ibrahim Musa', referrerId: 'U006', referred: 'Tunde Bakare', referredId: 'U008', earnings: 500, status: 'completed', date: '2026-01-28' },
  { id: 'R004', referrer: 'Emeka Nwosu', referrerId: 'U004', referred: 'Fatima Bello', referredId: 'U003', earnings: 0, status: 'pending', date: '2026-01-15' },
];

export const topReferrers = [
  { rank: 1, name: 'Emeka Nwosu', referrals: 24, earnings: 12000 },
  { rank: 2, name: 'Ibrahim Musa', referrals: 18, earnings: 9000 },
  { rank: 3, name: 'Ada Okonkwo', referrals: 15, earnings: 7500 },
  { rank: 4, name: 'Tunde Bakare', referrals: 11, earnings: 5500 },
  { rank: 5, name: 'Chidi Eze', referrals: 8, earnings: 4000 },
];

export const supportTickets = [
  { id: 'TKT-1042', user: 'Grace Adeyemi', userId: 'U005', subject: 'Failed TV subscription payment', status: 'open', priority: 'high', createdAt: '2026-06-19T09:50:00', messages: 2 },
  { id: 'TKT-1041', user: 'Fatima Bello', userId: 'U003', subject: 'Account suspended incorrectly', status: 'open', priority: 'medium', createdAt: '2026-06-18T16:20:00', messages: 4 },
  { id: 'TKT-1040', user: 'Chidi Eze', userId: 'U002', subject: 'Data not received after purchase', status: 'resolved', priority: 'high', createdAt: '2026-06-17T11:30:00', messages: 6 },
  { id: 'TKT-1039', user: 'Ngozi Okafor', userId: 'U007', subject: 'Wallet debit dispute', status: 'closed', priority: 'low', createdAt: '2026-06-15T08:00:00', messages: 8 },
];

export const ticketMessages = {
  'TKT-1042': [
    { id: 1, sender: 'Grace Adeyemi', role: 'user', message: 'I paid for DStv Compact but my subscription was not renewed.', time: '2026-06-19T09:50:00' },
    { id: 2, sender: 'Admin', role: 'admin', message: 'We are looking into this. Please share your transaction reference.', time: '2026-06-19T10:05:00' },
  ],
};

export const systemSettings = {
  maintenanceMode: false,
  minWalletFund: 100,
  maxWalletFund: 500000,
  referralBonus: 500,
  otpRequired: true,
  supportEmail: 'support@pingload.com',
};

export const SERVICE_LABELS = {
  airtime: 'Airtime',
  data: 'Data',
  electricity: 'Electricity',
  tv: 'TV',
  betting: 'Betting',
  education: 'Education',
  wallet_credit: 'Wallet Credit',
  wallet_debit: 'Wallet Debit',
  bulk_sms: 'Bulk SMS',
};

export const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  successful: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  open: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
  sent: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  verified: 'bg-emerald-100 text-emerald-700',
  unverified: 'bg-slate-100 text-slate-600',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
