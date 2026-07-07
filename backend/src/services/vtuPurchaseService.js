const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { deliverUserNotification } = require('./notificationDeliveryService');
const { getPurchasePushMeta } = require('../utils/purchaseNotification');
const vtuProvider = require('./vtuProviderService');
const { executeProviderCallWithFailover } = require('./vtuFailoverService');
const { processRefund, buildRefundReason } = require('./refundService');
const { createDebitWithAtomicWallet } = require('./walletTransactionService');
const generateReference = require('../utils/generateReference');
const applyServicePricing = require('../utils/applyServicePricing');
const { logWallet, logClubkonnect, logVtpass, logApiFailure } = require('../utils/logger');

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

const logProviderError = (providerName, level, message, meta = {}) => {
  if (providerName === 'vtpass') logVtpass(level, message, meta);
  else logClubkonnect(level, message, meta);
};

const buildPurchaseFailureMessage = (description, metadata = {}) => {
  const label = description.split(':')[0];
  const reason = vtuProvider.extractProviderFailureReason(
    metadata.providerResponse || metadata.vtpassResponse,
    metadata.vtuProvider
  )
    || metadata.error
    || buildRefundReason(metadata);
  if (reason && reason !== 'Purchase failed at service provider') {
    return `${label} failed: ${reason}. Amount refunded.`;
  }
  return `${label} failed. Amount refunded.`;
};

const safeFinalizeTransaction = async (transaction, success, metadata = {}) => {
  try {
    return await finalizeTransaction(transaction, success, metadata);
  } catch (error) {
    logApiFailure('vtu:finalize', error, {
      reference: transaction.reference,
      service: transaction.service,
      success,
      providerStatus: metadata.providerResponse?.status || metadata.vtpassResponse?.code,
    });
    return { transaction, refundResult: null, finalizeError: error.message };
  }
};

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
  const providerRequestId = metadata.providerRequestId || vtuProvider.generateRequestId();

  const transaction = await createDebitWithAtomicWallet({
    userId,
    amount,
    service,
    description,
    reference,
    metadata: {
      ...metadata,
      providerRequestId,
      vtpassRequestId: metadata.vtpassRequestId || providerRequestId,
    },
  });

  logWallet('info', 'Wallet debited for VTU purchase', {
    userId: String(userId),
    amount,
    reference,
    service,
    providerRequestId,
    vtuProvider: metadata.vtuProvider,
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
    try {
      refundResult = await processRefund({
        originalTransaction: transaction,
        reason: buildRefundReason(metadata),
        source: 'automatic',
      });
    } catch (refundError) {
      logApiFailure('vtu:refund', refundError, {
        reference: transaction.reference,
        service: transaction.service,
      });
    }
  }

  if (success) {
    const pushMeta = getPurchasePushMeta(transaction.service, transaction.description);
    await deliverUserNotification({
      userId: transaction.userId,
      title: pushMeta.title,
      message: pushMeta.message,
      type: pushMeta.type,
      screen: pushMeta.screen,
      metadata: {
        transactionId: transaction._id,
        service: transaction.service,
        reference: transaction.reference,
      },
    }).catch((err) => {
      logApiFailure('vtu:purchase-push', err, { reference: transaction.reference });
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
      failureReason: buildRefundReason(metadata),
    });
    logProviderError(metadata.vtuProvider || 'clubkonnect', 'error', 'VTU provider rejected purchase', {
      reference: transaction.reference,
      service: transaction.service,
      response: metadata.providerResponse || metadata.vtpassResponse,
      error: metadata.error,
    });
  }

  return { transaction, refundResult };
};

const markTransactionPending = async (transaction, metadata = {}) => {
  transaction.metadata = { ...transaction.metadata, ...metadata };
  await transaction.save();
  return transaction;
};

const executeVtuPurchase = async ({
  userId,
  service,
  amount,
  description,
  metadata = {},
  providerCall,
  providerName: explicitProvider,
  applyPricing = true,
  pricingServiceId = service,
}) => {
  const providerName = explicitProvider || metadata.vtuProvider || await vtuProvider.getRoutedProviderName(service);
  vtuProvider.assertProviderConfigured(providerName);

  const chargedAmount = applyPricing
    ? await applyServicePricing(pricingServiceId, amount)
    : amount;

  const providerRequestId = vtuProvider.generateRequestId();

  const transaction = await processWalletDebit(userId, chargedAmount, service, description, {
    ...metadata,
    originalAmount: amount,
    chargedAmount,
    providerRequestId,
    vtuProvider: providerName,
  });

  try {
    const { result, providerName: usedProvider, failovered } = await executeProviderCallWithFailover({
      service,
      primaryProvider: providerName,
      transactionReference: transaction.reference,
      providerCall: (name) => providerCall(providerRequestId, name),
    });

    const outcome = vtuProvider.resolvePurchaseOutcome(result, usedProvider);
    const purchaseDetails = vtuProvider.extractPurchaseDetails(result, service, usedProvider);
    const finalizeMetadata = {
      providerResponse: result,
      vtuProvider: usedProvider,
      providerOrderId: purchaseDetails.providerOrderId,
      purchaseDetails,
      ...(failovered ? { providerFailover: true, primaryProvider: providerName } : {}),
    };
    if (usedProvider === 'vtpass') {
      finalizeMetadata.vtpassResponse = result;
    }

    if (outcome.outcome === 'pending') {
      const pendingTx = await markTransactionPending(transaction, finalizeMetadata);
      return {
        success: true,
        pending: true,
        transaction: pendingTx,
        purchaseDetails,
        refundTransaction: null,
        message: `${description.split(':')[0]} submitted and is being processed`,
        refunded: false,
      };
    }

    const success = outcome.outcome === 'success';

    if (!success) {
      logProviderError(usedProvider, 'error', 'VTU provider purchase returned failure', {
        service,
        response: result,
        requestId: providerRequestId,
      });
    }

    const { transaction: updatedTx, refundResult, finalizeError } = await safeFinalizeTransaction(
      transaction,
      success,
      finalizeMetadata,
    );

    if (finalizeError) {
      return {
        success: false,
        transaction: updatedTx,
        purchaseDetails,
        refundTransaction: refundResult?.refundTransaction || null,
        message: 'Purchase could not be finalized. If your wallet was debited, it will be refunded shortly.',
        refunded: updatedTx.status !== 'pending',
      };
    }

    const failureMessage = success
      ? `${description.split(':')[0]} completed successfully`
      : buildPurchaseFailureMessage(description, finalizeMetadata);

    return {
      success,
      transaction: updatedTx,
      purchaseDetails,
      refundTransaction: refundResult?.refundTransaction || null,
      message: failureMessage,
      refunded: !success,
    };
  } catch (providerError) {
    logProviderError(providerName, 'error', 'VTU provider purchase threw', {
      service,
      message: providerError.message,
      response: providerError.providerResponse || providerError.vtpassResponse,
    });

    const finalizeMetadata = {
      error: providerError.message,
      providerResponse: providerError.providerResponse || providerError.vtpassResponse,
      vtuProvider: providerName,
    };
    if (providerName === 'vtpass') {
      finalizeMetadata.vtpassResponse = finalizeMetadata.providerResponse;
    }

    const { transaction: updatedTx, refundResult } = await safeFinalizeTransaction(
      transaction,
      false,
      finalizeMetadata,
    );
    const error = new Error(buildPurchaseFailureMessage(description, finalizeMetadata));
    error.statusCode = providerError.statusCode === 502 ? 502 : 400;
    error.data = formatTransactionPayload(updatedTx, {
      refunded: true,
      error: providerError.message,
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
