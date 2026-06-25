const express = require('express');
const { body } = require('express-validator');
const {
  login,
  getMe,
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  adjustUserWallet,
  getTransactions,
  getTransactionById,
  getWalletHistory,
  walletAdjust,
  getServices,
  toggleService,
  getAdminNotifications,
  sendNotification,
  getReferrals,
  getTopReferrers,
  getSupportTickets,
  getSupportTicket,
  replyTicket,
  closeTicket,
  getSettings,
  updateSettings,
  changePassword,
} = require('../controllers/adminController');
const {
  adminListKyc,
  adminGetKyc,
  adminReviewKyc,
} = require('../controllers/kycController');
const {
  adminListFaqs,
  adminCreateFaq,
  adminUpdateFaq,
  adminDeleteFaq,
  faqValidation,
} = require('../controllers/faqController');
const {
  adminGetPrices,
  adminUpdatePrice,
  adminListDataPlans,
  adminCreateDataPlan,
  adminUpdateDataPlan,
  adminDeleteDataPlan,
  adminListEducationProducts,
  adminCreateEducationProduct,
  adminUpdateEducationProduct,
  adminDeleteEducationProduct,
  adminEducationPurchases,
  priceValidation,
  planValidation,
  educationProductValidation,
} = require('../controllers/serviceConfigController');
const { getRefunds, getRefundById } = require('../controllers/refundController');
const { protectAdmin } = require('../middleware/adminAuth');
const { adminAuthLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

const adminLoginValidation = [
  body('email').isEmail().withMessage('Valid admin email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const walletAdjustmentValidation = [
  body('type').isIn(['credit', 'debit']).withMessage('Type must be credit or debit'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note is too long'),
];

const walletAdjustValidation = [
  body('userId').isMongoId().withMessage('Valid userId is required'),
  ...walletAdjustmentValidation,
];

router.post('/auth/login', adminAuthLimiter, adminLoginValidation, validate, login);
router.get('/auth/me', protectAdmin, getMe);

router.get('/dashboard/stats', protectAdmin, getDashboardStats);

router.get('/users', protectAdmin, getUsers);
router.get('/users/:id', protectAdmin, getUserById);
router.patch('/users/:id/status', protectAdmin, updateUserStatus);
router.delete('/users/:id', protectAdmin, deleteUser);
router.post('/users/:id/wallet', protectAdmin, walletAdjustmentValidation, validate, adjustUserWallet);

router.get('/transactions', protectAdmin, getTransactions);
router.get('/transactions/:id', protectAdmin, getTransactionById);

router.get('/refunds', protectAdmin, getRefunds);
router.get('/refunds/:id', protectAdmin, getRefundById);

router.get('/wallets/history', protectAdmin, getWalletHistory);
router.post('/wallets/adjust', protectAdmin, walletAdjustValidation, validate, walletAdjust);

router.get('/services', protectAdmin, getServices);
router.patch('/services/:id', protectAdmin, toggleService);

router.get('/services/prices', protectAdmin, adminGetPrices);
router.patch('/services/prices/:serviceId', protectAdmin, priceValidation, validate, adminUpdatePrice);

router.get('/data-plans', protectAdmin, adminListDataPlans);
router.post('/data-plans', protectAdmin, planValidation, validate, adminCreateDataPlan);
router.patch('/data-plans/:id', protectAdmin, adminUpdateDataPlan);
router.delete('/data-plans/:id', protectAdmin, adminDeleteDataPlan);

router.get('/education-products', protectAdmin, adminListEducationProducts);
router.post('/education-products', protectAdmin, educationProductValidation, validate, adminCreateEducationProduct);
router.patch('/education-products/:id', protectAdmin, adminUpdateEducationProduct);
router.delete('/education-products/:id', protectAdmin, adminDeleteEducationProduct);
router.get('/education/purchases', protectAdmin, adminEducationPurchases);

router.get('/kyc', protectAdmin, adminListKyc);
router.get('/kyc/:id', protectAdmin, adminGetKyc);
router.patch('/kyc/:id/review', protectAdmin, adminReviewKyc);

router.get('/faqs', protectAdmin, adminListFaqs);
router.post('/faqs', protectAdmin, faqValidation, validate, adminCreateFaq);
router.patch('/faqs/:id', protectAdmin, adminUpdateFaq);
router.delete('/faqs/:id', protectAdmin, adminDeleteFaq);

router.get('/notifications', protectAdmin, getAdminNotifications);
router.post('/notifications', protectAdmin, sendNotification);

router.get('/referrals', protectAdmin, getReferrals);
router.get('/referrals/top', protectAdmin, getTopReferrers);

router.get('/support/tickets', protectAdmin, getSupportTickets);
router.get('/support/tickets/:id', protectAdmin, getSupportTicket);
router.post('/support/tickets/:id/reply', protectAdmin, replyTicket);
router.patch('/support/tickets/:id/close', protectAdmin, closeTicket);

router.get('/settings', protectAdmin, getSettings);
router.patch('/settings', protectAdmin, updateSettings);
router.patch('/settings/password', protectAdmin, changePassword);

module.exports = router;
