export const formatCurrency = (amount) => {
  if (amount == null) return '₦0.00';
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('+234')) return phone;
  if (phone.startsWith('0')) return `+234${phone.slice(1)}`;
  return phone;
};

export const getStatusColor = (status, transactionType) => {
  if (transactionType === 'refund' || status === 'refunded') return '#10B981';
  const map = {
    successful: '#10B981',
    pending: '#F59E0B',
    failed: '#EF4444',
    refunded: '#10B981',
  };
  return map[status] || '#6B7280';
};

export const getStatusLabel = (status, transactionType) => {
  if (transactionType === 'refund' || status === 'refunded') return 'Refunded';
  return status || '';
};

export const getTransactionTitle = (transaction) => {
  if (transaction.transactionType === 'refund') {
    return transaction.description || `Refund for ${getServiceLabel(transaction.service)} Purchase`;
  }
  return getServiceLabel(transaction.service);
};

export const getServiceLabel = (service) => {
  const map = {
    wallet_funding: 'Wallet Funding',
    airtime: 'Airtime',
    data: 'Data',
    electricity: 'Electricity',
    tv: 'TV Subscription',
    education: 'Education',
    betting: 'Betting',
    bulk_sms: 'Bulk SMS',
    referral_bonus: 'Referral Bonus',
    wallet_transfer: 'Wallet Transfer',
    admin_credit: 'Admin Credit',
    admin_debit: 'Admin Debit',
    refund: 'Refund',
  };
  return map[service] || service;
};
