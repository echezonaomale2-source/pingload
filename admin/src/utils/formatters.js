const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
};

const SERVICE_LABELS = {
  airtime: 'Airtime',
  data: 'Data',
  electricity: 'Electricity',
  tv: 'TV',
  betting: 'Betting',
  education: 'Education',
  wallet_funding: 'Wallet Funding',
  admin_credit: 'Admin Credit',
  admin_debit: 'Admin Debit',
  referral_bonus: 'Referral Bonus',
  bulk_sms: 'Bulk SMS',
  wallet_transfer: 'Wallet Transfer',
  refund: 'Refund',
};

export { formatCurrency, formatDate, SERVICE_LABELS };
