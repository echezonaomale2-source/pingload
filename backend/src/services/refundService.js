const Transaction = require('../models/Transaction');
const generateReference = require('../utils/generateReference');
const { createRefundWithAtomicWallet } = require('./walletTransactionService');
const { deliverUserNotification } = require('./notificationDeliveryService');
const { logWallet } = require('../utils/logger');

const SERVICE_LABELS = {
  airtime: 'Airtime',
  data: 'Data',
  electricity: 'Electricity',
  tv: 'TV Subscription',
  education: 'Education',
  betting: 'Betting',
  bulk_sms: 'Bulk SMS',
};

const formatRefundDescription = (service) =>
  `Refund for ${SERVICE_LABELS[service] || service} Purchase`;

/**
 * Credits wallet and creates a linked refund transaction record.
 * Idempotent — safe to call more than once for the same original transaction.
 */
const processRefund = async ({
  originalTransaction,
  reason,
  source = 'automatic',
}) => {
  if (!originalTransaction) {
    throw new Error('Original transaction is required for refund');
  }

  const refundAmount = originalTransaction.amount;
  const refundReference = generateReference('REFUND');
  const refundReason = reason || 'Purchase failed at service provider';

  const { refundTransaction, alreadyProcessed } = await createRefundWithAtomicWallet({
    originalTransaction,
    refundReference,
    refundReason,
    source,
  });

  if (alreadyProcessed) {
    return { refundTransaction, alreadyProcessed: true };
  }

  await deliverUserNotification({
    userId: originalTransaction.userId,
    title: 'Refund Processed',
    message: `Your wallet has been refunded ₦${refundAmount.toLocaleString('en-NG')} for transaction ${originalTransaction.reference}.`,
    type: 'transaction',
    screen: 'TransactionDetails',
    metadata: {
      refundTransactionId: refundTransaction._id,
      originalTransactionId: originalTransaction._id,
      refundReference,
      originalTransactionReference: originalTransaction.reference,
      transactionId: refundTransaction._id,
      reference: refundReference,
    },
  });

  logWallet('info', 'Refund processed', {
    userId: String(originalTransaction.userId),
    amount: refundAmount,
    originalReference: originalTransaction.reference,
    refundReference,
    reason: refundReason,
    source,
  });

  return { refundTransaction, alreadyProcessed: false };
};

const buildRefundReason = (metadata = {}) => {
  if (metadata.error) return metadata.error;
  if (metadata.vtpassResponse?.response_description) return metadata.vtpassResponse.response_description;
  if (metadata.failureReason) return metadata.failureReason;
  return 'Purchase failed at service provider';
};

module.exports = {
  processRefund,
  buildRefundReason,
  formatRefundDescription,
};
