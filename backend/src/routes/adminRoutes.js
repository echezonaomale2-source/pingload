const express = require('express');
const { body } = require('express-validator');
const {
  login,
  logout,
  getMe,
  adminSearch,
  getAdminInbox,
  getAdminInboxUnreadCount,
  markAdminInboxRead,
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
  adminListElectricityPlans,
  adminCreateElectricityPlan,
  adminUpdateElectricityPlan,
  adminDeleteElectricityPlan,
  adminListTvPlans,
  adminCreateTvPlan,
  adminUpdateTvPlan,
  adminDeleteTvPlan,
  adminListEducationProducts,
  adminCreateEducationProduct,
  adminUpdateEducationProduct,
  adminDeleteEducationProduct,
  adminEducationPurchases,
  priceValidation,
  planValidation,
  electricityPlanValidation,
  tvPlanValidation,
  educationProductValidation,
} = require('../controllers/serviceConfigController');
const { getRevenueDashboard } = require('../controllers/revenueController');
const { listSecurityEvents } = require('../controllers/securityEventController');
const {
  adminListProviderLogos,
  adminUpdateProviderLogo,
  adminDeleteProviderLogo,
} = require('../controllers/providerLogoController');
const { getRefunds, getRefundById } = require('../controllers/refundController');
const {
  adminListBettingPlatforms,
  adminUpdateBettingPlatform,
  adminSyncBettingPlatforms,
} = require('../controllers/bettingPlatformAdminController');
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
router.post('/auth/logout', protectAdmin, logout);
router.get('/auth/me', protectAdmin, getMe);

router.get('/search', protectAdmin, adminSearch);
router.get('/inbox', protectAdmin, getAdminInbox);
router.get('/inbox/unread-count', protectAdmin, getAdminInboxUnreadCount);
router.patch('/inbox/read', protectAdmin, markAdminInboxRead);

router.get('/dashboard/stats', protectAdmin, getDashboardStats);
router.get('/dashboard/revenue', protectAdmin, getRevenueDashboard);

router.get('/security-events', protectAdmin, listSecurityEvents);

router.get('/provider-logos', protectAdmin, adminListProviderLogos);
router.patch('/provider-logos/:id', protectAdmin, adminUpdateProviderLogo);
router.delete('/provider-logos/:id', protectAdmin, adminDeleteProviderLogo);

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

router.get('/electricity-plans', protectAdmin, adminListElectricityPlans);
router.post('/electricity-plans', protectAdmin, electricityPlanValidation, validate, adminCreateElectricityPlan);
router.patch('/electricity-plans/:id', protectAdmin, adminUpdateElectricityPlan);
router.delete('/electricity-plans/:id', protectAdmin, adminDeleteElectricityPlan);

router.get('/tv-plans', protectAdmin, adminListTvPlans);
router.post('/tv-plans', protectAdmin, tvPlanValidation, validate, adminCreateTvPlan);
router.patch('/tv-plans/:id', protectAdmin, adminUpdateTvPlan);
router.delete('/tv-plans/:id', protectAdmin, adminDeleteTvPlan);

router.get('/education-products', protectAdmin, adminListEducationProducts);
router.post('/education-products', protectAdmin, educationProductValidation, validate, adminCreateEducationProduct);
router.patch('/education-products/:id', protectAdmin, adminUpdateEducationProduct);
router.delete('/education-products/:id', protectAdmin, adminDeleteEducationProduct);
router.get('/education/purchases', protectAdmin, adminEducationPurchases);

router.get('/betting-platforms', protectAdmin, adminListBettingPlatforms);
router.patch('/betting-platforms/:id', protectAdmin, adminUpdateBettingPlatform);
router.post('/betting-platforms/sync', protectAdmin, adminSyncBettingPlatforms);

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
