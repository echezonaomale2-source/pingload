const { body } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const {
  initializeFunding,
  verifyFundingPayment,
  getPaymentConfig,
} = require('../services/walletFundingService');
const { createTransferWithAtomicWallet } = require('../services/walletTransactionService');
const generateReference = require('../utils/generateReference');
const verifyTransactionPin = require('../utils/verifyTransactionPin');

const fundValidation = [
  body('amount').isFloat({ min: 100 }).withMessage('Minimum funding amount is ₦100'),
];

const transferValidation = [
  body('recipient').trim().notEmpty().withMessage('Recipient email or phone is required'),
  body('amount').isFloat({ min: 100 }).withMessage('Minimum transfer amount is ₦100'),
  body('pin').matches(/^\d{4}$/).withMessage('Transaction PIN is required'),
];

const getBalance = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        balance: wallet?.balance || user.walletBalance || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPaystackConfig = async (_req, res, next) => {
  try {
    res.json({ success: true, data: getPaymentConfig() });
  } catch (error) {
    next(error);
  }
};

const fundWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const data = await initializeFunding(req.user, amount);

    res.json({
      success: true,
      message: 'Payment initialized',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const verifyFunding = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const result = await verifyFundingPayment(reference, req.user._id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: result.alreadyProcessed ? 'Already verified' : 'Wallet funded successfully',
      data: {
        amount: result.amount,
        reference: result.reference,
        alreadyProcessed: result.alreadyProcessed,
      },
    });
  } catch (error) {
    if (error.statusCode === 402) {
      return res.status(402).json({
        success: false,
        code: 'PAYMENT_PENDING',
        message: error.message,
      });
    }
    next(error);
  }
};

const transferFunds = async (req, res, next) => {
  try {
    const { recipient, amount, pin, note } = req.body;
    const transferAmount = Number(amount);
    await verifyTransactionPin(req.user._id, pin);

    const recipientUser = await User.findOne({
      $or: [{ email: recipient.toLowerCase() }, { phoneNumber: recipient }],
      accountStatus: 'active',
    });

    if (!recipientUser) {
      return res.status(404).json({ success: false, message: 'Recipient not found or account inactive' });
    }

    if (recipientUser._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot transfer to yourself' });
    }

    const debitRef = generateReference('XFR');
    const creditRef = generateReference('RCV');

    const { debitTx, creditTx } = await createTransferWithAtomicWallet({
      senderUser: req.user,
      recipientUser,
      amount: transferAmount,
      note: note || '',
      debitReference: debitRef,
      creditReference: creditRef,
    });

    await Promise.allSettled([
      Notification.create({
        userId: req.user._id,
        title: 'Transfer Sent',
        message: `You sent ₦${transferAmount.toLocaleString()} to ${recipientUser.fullName}`,
        type: 'transaction',
      }),
      Notification.create({
        userId: recipientUser._id,
        title: 'Transfer Received',
        message: `You received ₦${transferAmount.toLocaleString()} from ${req.user.fullName}`,
        type: 'transaction',
      }),
    ]);

    res.json({
      success: true,
      message: 'Transfer successful',
      data: { debitTx, creditTx, recipient: { id: recipientUser._id, fullName: recipientUser.fullName } },
    });
  } catch (error) {
    next(error);
  }
};

const getWalletHistory = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      service: 'wallet_funding',
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBalance,
  getPaystackConfig,
  fundWallet,
  verifyFunding,
  getWalletHistory,
  transferFunds,
  fundValidation,
  transferValidation,
};
