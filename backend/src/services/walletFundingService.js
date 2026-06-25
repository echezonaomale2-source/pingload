const Transaction = require('../models/Transaction');
const SystemSettings = require('../models/SystemSettings');
const { deliverUserNotification } = require('./notificationDeliveryService');
const { initializeTransaction, verifyTransaction } = require('./paystackService');
const { atomicWalletCredit, runWithWalletTransaction } = require('./walletTransactionService');
const generateReference = require('../utils/generateReference');
const { buildPaystackCallbackUrl } = require('../utils/paystackUrls');
const { paystack, frontendUrl } = require('../config/env');
const { logWallet } = require('../utils/logger');

const assertPaystackConfigured = () => {
  if (!paystack.secretKey) {
    const error = new Error('Paystack is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
};

const amountToKobo = (amount) => Math.round(Number(amount) * 100);

const amountsMatch = (expectedNaira, paidNaira) =>
  amountToKobo(expectedNaira) === amountToKobo(paidNaira);

const assertFundingAmountWithinLimits = async (amount) => {
  const settings = await SystemSettings.getSettings();
  const fundingAmount = Number(amount);

  if (fundingAmount < settings.minWalletFund) {
    const error = new Error(`Minimum funding amount is ₦${settings.minWalletFund.toLocaleString()}`);
    error.statusCode = 400;
    throw error;
  }

  if (fundingAmount > settings.maxWalletFund) {
    const error = new Error(`Maximum funding amount is ₦${settings.maxWalletFund.toLocaleString()}`);
    error.statusCode = 400;
    throw error;
  }

  return fundingAmount;
};

const markFundingFailed = async (reference, reason) => {
  await Transaction.findOneAndUpdate(
    { reference, status: 'pending', service: 'wallet_funding' },
    {
      $set: {
        status: 'failed',
        'metadata.failureReason': reason,
        'metadata.failedAt': new Date(),
      },
    }
  );
  logWallet('warn', 'Wallet funding failed', { reference, reason, service: 'wallet_funding' });
};

/**
 * Atomically marks a pending funding transaction successful and credits the wallet.
 * Only one caller (verify API or webhook) can win the pending -> successful transition.
 */
const creditWalletFromFunding = async ({
  reference,
  amountInNaira,
  verifiedVia,
  paystackMetadata = {},
  userId = null,
}) => {
  const filter = { reference, status: 'pending', service: 'wallet_funding' };
  if (userId) filter.userId = userId;

  const result = await runWithWalletTransaction(async (session) => {
    const findOptions = session ? { session } : {};
    const pending = await Transaction.findOne(filter, null, findOptions);

    if (!pending) return null;

    if (!amountsMatch(pending.amount, amountInNaira)) {
      const failedTx = await Transaction.findOneAndUpdate(
        filter,
        {
          $set: {
            status: 'failed',
            'metadata.failureReason': 'Paystack amount mismatch',
            'metadata.failedAt': new Date(),
            'metadata.amountMismatch': {
              expectedAmount: pending.amount,
              paidAmount: amountInNaira,
              expectedKobo: amountToKobo(pending.amount),
              paidKobo: amountToKobo(amountInNaira),
            },
            'metadata.verifiedVia': verifiedVia,
            'metadata.paystack': paystackMetadata,
          },
        },
        { new: true, ...findOptions }
      );

      logWallet('warn', 'Wallet funding amount mismatch', {
        reference,
        expectedAmount: pending.amount,
        paidAmount: amountInNaira,
        verifiedVia,
        service: 'wallet_funding',
      });

      return {
        success: false,
        alreadyProcessed: false,
        statusCode: 400,
        message: 'Payment amount mismatch. Please contact support.',
        amount: pending.amount,
        reference,
        transaction: failedTx,
      };
    }

    const transaction = await Transaction.findOneAndUpdate(
      filter,
      {
        $set: {
          status: 'successful',
          'metadata.verifiedVia': verifiedVia,
          'metadata.paystack': paystackMetadata,
          'metadata.creditedAt': new Date(),
        },
      },
      { new: true, ...findOptions }
    );

    if (!transaction) return null;

    await atomicWalletCredit({
      userId: transaction.userId,
      amount: transaction.amount,
      session,
    });

    return {
      success: true,
      alreadyProcessed: false,
      amount: transaction.amount,
      reference,
      transaction,
    };
  });

  if (!result) {
    const existing = await Transaction.findOne({ reference, service: 'wallet_funding' });
    if (existing?.status === 'successful') {
      return {
        success: true,
        alreadyProcessed: true,
        amount: existing.amount,
        reference,
        transaction: existing,
      };
    }

    return {
      success: false,
      alreadyProcessed: false,
      message: existing ? 'Payment already failed or invalid' : 'Transaction not found',
    };
  }

  if (!result.success) {
    return result;
  }

  await deliverUserNotification({
    userId: result.transaction.userId,
    title: 'Wallet Funded',
    message: `Your wallet has been credited with ₦${result.amount.toLocaleString()}`,
    type: 'transaction',
    screen: 'TransactionDetails',
    metadata: {
      transactionId: result.transaction._id,
      reference,
    },
  }).catch((error) => {
    logWallet('warn', 'Wallet funding notification failed', {
      reference,
      error: error.message,
      service: 'wallet_funding',
    });
  });

  logWallet('info', 'Wallet credited via Paystack', {
    userId: String(result.transaction.userId),
    amount: result.amount,
    reference,
    verifiedVia,
    service: 'wallet_funding',
  });

  return result;
};

const initializeFunding = async (user, amount) => {
  assertPaystackConfigured();

  const fundingAmount = await assertFundingAmountWithinLimits(amount);
  const reference = generateReference('FUND');

  await Transaction.create({
    userId: user._id,
    transactionType: 'credit',
    service: 'wallet_funding',
    amount: fundingAmount,
    status: 'pending',
    reference,
    description: `Wallet funding of ₦${fundingAmount}`,
    metadata: { initiatedAt: new Date(), provider: 'paystack' },
  });

  try {
    const paystackData = await initializeTransaction({
      email: user.email,
      amount: fundingAmount,
      reference,
      callbackUrl: buildPaystackCallbackUrl(frontendUrl, reference),
      metadata: { userId: String(user._id), purpose: 'wallet_funding' },
    });

    return {
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      reference,
      publicKey: paystack.publicKey,
    };
  } catch (error) {
    await markFundingFailed(reference, error.message);
    throw error;
  }
};

const verifyFundingPayment = async (reference, userId) => {
  assertPaystackConfigured();

  const transaction = await Transaction.findOne({
    reference,
    userId,
    service: 'wallet_funding',
  });

  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  if (transaction.status === 'successful') {
    return {
      success: true,
      alreadyProcessed: true,
      amount: transaction.amount,
      reference,
      transaction,
    };
  }

  if (transaction.status === 'failed') {
    const paystackData = await verifyTransaction(reference);
    const paystackStatus = (paystackData.status || '').toLowerCase();

    if (paystackStatus === 'success') {
      const amountInNaira = paystackData.amount / 100;
      return creditWalletFromFunding({
        reference,
        amountInNaira,
        verifiedVia: 'api',
        userId,
        paystackMetadata: {
          gateway_response: paystackData.gateway_response,
          paid_at: paystackData.paid_at,
          channel: paystackData.channel,
        },
      });
    }

    if (['pending', 'processing', 'queued', 'abandoned', 'ongoing'].includes(paystackStatus)) {
      await Transaction.findOneAndUpdate(
        { reference, userId, service: 'wallet_funding', status: 'failed' },
        { $set: { status: 'pending' }, $unset: { 'metadata.failureReason': '', 'metadata.failedAt': '' } }
      );
      const error = new Error(
        paystackData.gateway_response || 'Payment not completed yet. Finish payment on Paystack, then verify again.'
      );
      error.statusCode = 402;
      error.code = 'PAYMENT_PENDING';
      error.paystackStatus = paystackStatus;
      throw error;
    }

    const error = new Error('Payment failed or was cancelled');
    error.statusCode = 400;
    throw error;
  }

  const paystackData = await verifyTransaction(reference);
  const paystackStatus = (paystackData.status || '').toLowerCase();

  if (paystackStatus === 'success') {
    const amountInNaira = paystackData.amount / 100;

    return creditWalletFromFunding({
      reference,
      amountInNaira,
      verifiedVia: 'api',
      userId,
      paystackMetadata: {
        gateway_response: paystackData.gateway_response,
        paid_at: paystackData.paid_at,
        channel: paystackData.channel,
      },
    });
  }

  if (['pending', 'processing', 'queued', 'abandoned', 'ongoing'].includes(paystackStatus)) {
    const error = new Error(
      paystackData.gateway_response || 'Payment not completed yet. Finish payment on Paystack, then verify again.'
    );
    error.statusCode = 402;
    error.code = 'PAYMENT_PENDING';
    error.paystackStatus = paystackStatus;
    throw error;
  }

  await markFundingFailed(reference, `Paystack status: ${paystackStatus}`);
  const error = new Error(paystackData.gateway_response || 'Payment verification failed');
  error.statusCode = 400;
  throw error;
};

const processPaystackWebhook = async ({ event, data }) => {
  const reference = data?.reference || data?.transfer_code;

  if (event === 'charge.failed') {
    if (data?.reference) {
      await markFundingFailed(data.reference, data.gateway_response || 'Payment failed');
    }
    return { success: true, message: 'Payment marked as failed' };
  }

  if (event === 'charge.success') {
    if (!data?.reference) {
      return { success: false, message: 'Missing payment reference', statusCode: 400 };
    }

    const existing = await Transaction.findOne({ reference: data.reference, service: 'wallet_funding' });
    if (!existing) {
      return { success: false, message: 'Transaction not found', statusCode: 404 };
    }

    if (existing.status === 'successful') {
      return { success: true, message: 'Already processed', alreadyProcessed: true };
    }

    const amountInNaira = data.amount / 100;

    return creditWalletFromFunding({
      reference: data.reference,
      amountInNaira,
      verifiedVia: 'webhook',
      paystackMetadata: {
        customer_email: data.customer?.email,
        channel: data.channel,
        paid_at: data.paid_at,
        gateway_response: data.gateway_response,
        paystackId: data.id,
      },
    });
  }

  if (event === 'transfer.success') {
    if (!reference) {
      return { success: true, message: 'Transfer event logged (no reference)' };
    }

    const tx = await Transaction.findOneAndUpdate(
      { reference, status: 'pending' },
      {
        $set: {
          status: 'successful',
          'metadata.transferStatus': 'success',
          'metadata.transferCompletedAt': new Date(),
          'metadata.paystackTransfer': {
            transfer_code: data.transfer_code,
            amount: data.amount ? data.amount / 100 : null,
            recipient: data.recipient,
          },
        },
      },
      { new: true }
    );

    if (tx) {
      logWallet('info', 'Paystack transfer succeeded', { reference, service: tx.service });
      return { success: true, message: 'Transfer marked successful' };
    }

    return { success: true, message: 'Transfer success acknowledged (no pending transaction)' };
  }

  if (event === 'transfer.failed') {
    if (!reference) {
      return { success: true, message: 'Transfer failure logged (no reference)' };
    }

    await Transaction.findOneAndUpdate(
      { reference, status: 'pending' },
      {
        $set: {
          status: 'failed',
          'metadata.transferStatus': 'failed',
          'metadata.failureReason': data.reason || 'Transfer failed',
          'metadata.failedAt': new Date(),
        },
      }
    );

    logWallet('warn', 'Paystack transfer failed', { reference, reason: data.reason });
    return { success: true, message: 'Transfer marked as failed' };
  }

  return { success: true, message: `Event ignored: ${event}` };
};

const getPaymentConfig = () => ({
  provider: 'paystack',
  publicKey: paystack.publicKey || null,
  minAmount: 100,
  currency: 'NGN',
  configured: Boolean(paystack.secretKey && paystack.publicKey),
  mode: paystack.mode || 'test',
  isTestMode: paystack.isTestMode ?? true,
});

module.exports = {
  initializeFunding,
  verifyFundingPayment,
  processPaystackWebhook,
  creditWalletFromFunding,
  getPaymentConfig,
  assertFundingAmountWithinLimits,
  amountsMatch,
};
