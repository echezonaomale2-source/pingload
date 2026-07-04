const SERVICE_PUSH_META = {
  airtime: { title: 'Airtime Purchased', screen: 'TransactionDetails' },
  data: { title: 'Data Purchased', screen: 'TransactionDetails' },
  electricity: { title: 'Electricity Paid', screen: 'TransactionDetails' },
  tv: { title: 'TV Subscription Paid', screen: 'TransactionDetails' },
  education: { title: 'Education PIN Purchased', screen: 'TransactionDetails' },
  betting: { title: 'Betting Wallet Funded', screen: 'TransactionDetails' },
  wallet_transfer: { title: 'Transfer Completed', screen: 'TransactionDetails' },
};

const getPurchasePushMeta = (service, description = '') => {
  const meta = SERVICE_PUSH_META[service] || {
    title: 'Transaction Successful',
    screen: 'TransactionDetails',
  };
  return {
    title: meta.title,
    screen: meta.screen,
    message: description || meta.title,
    type: 'transaction',
  };
};

module.exports = { SERVICE_PUSH_META, getPurchasePushMeta };
