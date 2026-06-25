const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const vtpass = require('./vtpassService');
const { processRefund, buildRefundReason } = require('./refundService');
const { createDebitWithAtomicWallet } = require('./walletTransactionService');
const generateReference = require('../utils/generateReference');
const applyServicePricing = require('../utils/applyServicePricing');
const { logWallet } = require('../utils/logger');

const formatTransactionPayload = (transaction, extra = {}) => ({
  reference: transaction.reference,
  amount: transaction.amount,
  status: transaction.status,
  service: transaction.service,
  description: transaction.description,
  transactionId: transaction._id,
  createdAt: transaction.createdAt,
  refundReference: transaction.metadata?.refundReference || null,
  refundReason: transaction.metadata?.refundReason || null,
  ...extra,
});

const validateWalletBalance = async (userId, amount) => {
  const wallet = await Wallet.findOne({ userId });
  const user = await User.findById(userId);
  const balance = wallet?.balance ?? user?.walletBalance ?? 0;

  if (balance < amount) {
    const error = new Error('Insufficient wallet balance');
    error.statusCode = 400;
    throw error;
  }

  return balance;
};

const processWalletDebit = async (userId, amount, service, description, metadata = {}) => {
  await validateWalletBalance(userId, amount);

  const reference = generateReference('VTU');
  const vtpassRequestId = metadata.vtpassRequestId || vtpass.generateRequestId();

  const transaction = await createDebitWithAtomicWallet({
    userId,
    amount,
    service,
    description,
    reference,
    metadata: { ...metadata, vtpassRequestId },
  });

  logWallet('info', 'Wallet debited for VTU purchase', {
    userId: String(userId),
    amount,
    reference,
    service,
    vtpassRequestId,
  });

  return transaction;
};

const finalizeTransaction = async (transaction, success, metadata = {}) => {
  const wasPending = transaction.status === 'pending';
  transaction.status = success ? 'successful' : 'failed';
  transaction.metadata = { ...transaction.metadata, ...metadata };
  await transaction.save();

  let refundResult = null;

  if (!success && wasPending) {
    refundResult = await processRefund({
      originalTransaction: transaction,
      reason: buildRefundReason(metadata),
      source: 'automatic',
    });
  }

  if (success) {
    await Notification.create({
      userId: transaction.userId,
      title: 'Transaction Successful',
      message: transaction.description,
      type: 'transaction',
    });
    logWallet('info', 'VTU purchase successful', {
      userId: String(transaction.userId),
      amount: transaction.amount,
      reference: transaction.reference,
      service: transaction.service,
    });
  } else if (wasPending) {
    logWallet('warn', 'VTU purchase failed', {
      userId: String(transaction.userId),
      amount: transaction.amount,
      reference: transaction.reference,
      service: transaction.service,
      refundReference: refundResult?.refundTransaction?.reference,
    });
  }

  return { transaction, refundResult };
};

const executeVtuPurchase = async ({
  userId,
  service,
  amount,
  description,
  metadata = {},
  vtpassCall,
  applyPricing = true,
  pricingServiceId = service,
}) => {
  vtpass.assertVtpassConfigured();

  const chargedAmount = applyPricing
    ? await applyServicePricing(pricingServiceId, amount)
    : amount;

  const vtpassRequestId = vtpass.generateRequestId();

  const transaction = await processWalletDebit(userId, chargedAmount, service, description, {
    ...metadata,
    originalAmount: amount,
    chargedAmount,
    vtpassRequestId,
  });

  try {
    const result = await vtpassCall(vtpassRequestId);
    const success = vtpass.isVtpassSuccess(result);
    const purchaseDetails = vtpass.extractPurchaseDetails(result, service);

    const { transaction: updatedTx, refundResult } = await finalizeTransaction(transaction, success, {
      vtpassResponse: result,
      purchaseDetails,
    });

    return {
      success,
      transaction: updatedTx,
      purchaseDetails,
      refundTransaction: refundResult?.refundTransaction || null,
      message: success
        ? `${description.split(':')[0]} completed successfully`
        : `${description.split(':')[0]} failed. Amount refunded.`,
      refunded: !success,
    };
  } catch (vtpassError) {
    const { transaction: updatedTx, refundResult } = await finalizeTransaction(transaction, false, {
      error: vtpassError.message,
    });
    const error = new Error(
      vtpassError.message || `${description.split(':')[0]} failed. Amount refunded.`
    );
    error.statusCode = vtpassError.statusCode === 502 ? 502 : 400;
    error.data = formatTransactionPayload(updatedTx, {
      refunded: true,
      error: vtpassError.message,
      refundReference: refundResult?.refundTransaction?.reference,
    });
    throw error;
  }
};

module.exports = {
  validateWalletBalance,
  processWalletDebit,
  finalizeTransaction,
  executeVtuPurchase,
  formatTransactionPayload,
};
