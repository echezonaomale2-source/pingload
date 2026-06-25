const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

const transactionUnsupported = (error) =>
  error.message?.includes('Transaction numbers are only allowed')
  || error.message?.includes('Transaction numbers are only allowed on a replica set');

/**
 * Atomically debits wallet only when balance is sufficient.
 * Uses MongoDB session when available (replica set / transaction support).
 */
const atomicWalletDebit = async ({ userId, amount, session = null }) => {
  const options = session ? { session, new: true } : { new: true };

  const wallet = await Wallet.findOneAndUpdate(
    { userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    options
  );

  if (!wallet) {
    const error = new Error('Insufficient wallet balance');
    error.statusCode = 400;
    throw error;
  }

  await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } }, session ? { session } : {});

  return wallet;
};

/**
 * Atomically credits wallet (refunds, funding credits).
 */
const atomicWalletCredit = async ({ userId, amount, session = null }) => {
  const options = session ? { session, upsert: true, new: true } : { upsert: true, new: true };

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { balance: amount } },
    options
  );

  await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, session ? { session } : {});

  return wallet;
};

/**
 * Runs callback inside a MongoDB transaction when supported; otherwise runs sequentially.
 */
const withWalletTransaction = async (callback) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    session.endSession();
  }
};

const runWithWalletTransaction = async (callback) => {
  try {
    return await withWalletTransaction(callback);
  } catch (error) {
    if (transactionUnsupported(error)) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MongoDB transactions are required for production wallet operations');
      }
      return callback(null);
    }
    throw error;
  }
};

/**
 * Creates a pending debit transaction and atomically debits wallet.
 */
const createDebitWithAtomicWallet = async ({
  userId,
  amount,
  service,
  description,
  metadata = {},
  reference,
}) => {
  const run = async (session) => {
    await atomicWalletDebit({ userId, amount, session });

    const createOptions = session ? { session } : {};
    const created = await Transaction.create([{
      userId,
      transactionType: 'debit',
      service,
      amount,
      status: 'pending',
      reference,
      description,
      metadata,
    }], createOptions);

    return created[0];
  };

  return runWithWalletTransaction(run);
};

const createTransferWithAtomicWallet = async ({
  senderUser,
  recipientUser,
  amount,
  note = '',
  debitReference,
  creditReference,
}) => {
  const run = async (session) => {
    await atomicWalletDebit({ userId: senderUser._id, amount, session });
    await atomicWalletCredit({ userId: recipientUser._id, amount, session });

    const createOptions = session ? { session } : {};
    const [debitTx, creditTx] = await Transaction.create([
      {
        userId: senderUser._id,
        transactionType: 'debit',
        service: 'wallet_transfer',
        amount,
        status: 'successful',
        reference: debitReference,
        description: `Transfer to ${recipientUser.fullName}`,
        metadata: { recipientId: recipientUser._id, note },
      },
      {
        userId: recipientUser._id,
        transactionType: 'credit',
        service: 'wallet_transfer',
        amount,
        status: 'successful',
        reference: creditReference,
        description: `Transfer from ${senderUser.fullName}`,
        metadata: { senderId: senderUser._id, note },
      },
    ], createOptions);

    return { debitTx, creditTx };
  };

  return runWithWalletTransaction(run);
};

const createAdminAdjustmentWithAtomicWallet = async ({
  userId,
  type,
  amount,
  reference,
  description,
  metadata = {},
}) => {
  const run = async (session) => {
    if (type === 'credit') {
      await atomicWalletCredit({ userId, amount, session });
    } else {
      await atomicWalletDebit({ userId, amount, session });
    }

    const createOptions = session ? { session } : {};
    const created = await Transaction.create([{
      userId,
      transactionType: type,
      service: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount,
      status: 'successful',
      reference,
      description,
      metadata,
    }], createOptions);

    return created[0];
  };

  return runWithWalletTransaction(run);
};

/**
 * Creates refund transaction and atomically credits wallet (idempotent).
 */
const createRefundWithAtomicWallet = async ({
  originalTransaction,
  refundReference,
  refundReason,
  source = 'automatic',
}) => {
  const existingRefund = await Transaction.findOne({
    originalTransactionId: originalTransaction._id,
    transactionType: 'refund',
  });

  if (existingRefund) {
    return { refundTransaction: existingRefund, alreadyProcessed: true };
  }

  const run = async (session) => {
    const lockedOriginal = session
      ? await Transaction.findById(originalTransaction._id).session(session)
      : await Transaction.findById(originalTransaction._id);

    if (lockedOriginal?.metadata?.refunded) {
      const linked = lockedOriginal.metadata.refundTransactionId
        ? await Transaction.findById(lockedOriginal.metadata.refundTransactionId)
        : null;
      if (linked) return { refundTransaction: linked, alreadyProcessed: true };
    }

    await atomicWalletCredit({
      userId: originalTransaction.userId,
      amount: originalTransaction.amount,
      session,
    });

    const refundedAt = new Date();
    const createOptions = session ? { session } : {};
    const created = await Transaction.create([{
      userId: originalTransaction.userId,
      transactionType: 'refund',
      service: originalTransaction.service,
      amount: originalTransaction.amount,
      status: 'refunded',
      reference: refundReference,
      description: `Refund for ${originalTransaction.service} purchase`,
      refundAmount: originalTransaction.amount,
      refundReason,
      refundReference,
      originalTransactionReference: originalTransaction.reference,
      originalTransactionId: originalTransaction._id,
      refundedAt,
      metadata: { source, originalService: originalTransaction.service },
    }], createOptions);

    const refundTransaction = created[0];

    lockedOriginal.metadata = {
      ...lockedOriginal.metadata,
      refunded: true,
      refundedAt,
      refundReference,
      refundTransactionId: refundTransaction._id,
      refundReason,
    };
    await lockedOriginal.save(session ? { session } : {});

    return { refundTransaction, alreadyProcessed: false };
  };

  return runWithWalletTransaction(run);
};

module.exports = {
  atomicWalletDebit,
  atomicWalletCredit,
  withWalletTransaction,
  runWithWalletTransaction,
  createDebitWithAtomicWallet,
  createTransferWithAtomicWallet,
  createAdminAdjustmentWithAtomicWallet,
  createRefundWithAtomicWallet,
};
