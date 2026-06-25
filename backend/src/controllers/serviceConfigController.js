const { body } = require('express-validator');
const ServicePrice = require('../models/ServicePrice');
const DataPlan = require('../models/DataPlan');
const EducationProduct = require('../models/EducationProduct');
const SystemSettings = require('../models/SystemSettings');
const { buildSafeRegex, parsePagination } = require('../utils/safeQuery');

const priceValidation = [
  body('discountPercent').optional().isFloat({ min: 0, max: 100 }),
  body('markupPercent').optional().isFloat({ min: 0 }),
  body('minAmount').optional().isFloat({ min: 0 }),
  body('maxAmount').optional().isFloat({ min: 0 }),
];

const planValidation = [
  body('network').isIn(['mtn', 'airtel', 'glo', '9mobile']).withMessage('Invalid network'),
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('dataSize').trim().notEmpty().withMessage('Data size is required'),
  body('validity').trim().notEmpty().withMessage('Validity is required'),
  body('variationCode').trim().notEmpty().withMessage('Variation code is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
];

const educationProductValidation = [
  body('examType').isIn(['waec', 'neco', 'jamb']).withMessage('Invalid exam type'),
  body('productCode').trim().notEmpty().withMessage('Product code is required'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('vtpassServiceId').trim().notEmpty().withMessage('VTpass service ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
];

// GET /services/status — public enabled services
const getPublicServiceStatus = async (_req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    const enabled = (settings.services || []).reduce((acc, service) => {
      acc[service.id] = service.enabled !== false;
      return acc;
    }, {});
    res.json({ success: true, data: enabled });
  } catch (error) {
    next(error);
  }
};

const getAppConfig = async (_req, res, next) => {
  try {
    const serviceConfig = require('../config/serviceConfig');
    res.json({ success: true, data: serviceConfig.getAppConfig() });
  } catch (error) {
    next(error);
  }
};

// GET /services/prices — public
const getServicePrices = async (_req, res, next) => {
  try {
    await ServicePrice.ensureDefaults();
    const prices = await ServicePrice.find({ enabled: true }).sort({ serviceId: 1 });
    res.json({ success: true, data: prices });
  } catch (error) {
    next(error);
  }
};

// GET /services/prices/admin
const adminGetPrices = async (_req, res, next) => {
  try {
    await ServicePrice.ensureDefaults();
    const prices = await ServicePrice.find().sort({ serviceId: 1 });
    res.json({ success: true, data: prices });
  } catch (error) {
    next(error);
  }
};

// PATCH /services/prices/admin/:serviceId
const adminUpdatePrice = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const price = await ServicePrice.findOneAndUpdate({ serviceId }, req.body, { new: true, runValidators: true });
    if (!price) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: price });
  } catch (error) {
    next(error);
  }
};

// GET /services/data-plans/:network — public enabled plans
const getDataPlans = async (req, res, next) => {
  try {
    const { network } = req.params;
    const plans = await DataPlan.find({ network, enabled: true }).sort({ order: 1, amount: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

// GET /services/data-plans/admin
const adminListDataPlans = async (req, res, next) => {
  try {
    const { network } = req.query;
    const filter = network ? { network } : {};
    const plans = await DataPlan.find(filter).sort({ network: 1, order: 1, amount: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

// POST /services/data-plans/admin
const adminCreateDataPlan = async (req, res, next) => {
  try {
    const plan = await DataPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// PATCH /services/data-plans/admin/:id
const adminUpdateDataPlan = async (req, res, next) => {
  try {
    const plan = await DataPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Data plan not found' });
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// DELETE /services/data-plans/admin/:id
const adminDeleteDataPlan = async (req, res, next) => {
  try {
    const plan = await DataPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Data plan not found' });
    res.json({ success: true, message: 'Data plan deleted' });
  } catch (error) {
    next(error);
  }
};

const adminListEducationProducts = async (req, res, next) => {
  try {
    await EducationProduct.ensureDefaults();
    const { examType } = req.query;
    const filter = examType ? { examType } : {};
    const products = await EducationProduct.find(filter).sort({ order: 1, amount: 1 });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const adminCreateEducationProduct = async (req, res, next) => {
  try {
    const product = await EducationProduct.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const adminUpdateEducationProduct = async (req, res, next) => {
  try {
    const product = await EducationProduct.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Education product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const adminDeleteEducationProduct = async (req, res, next) => {
  try {
    const product = await EducationProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Education product not found' });
    res.json({ success: true, message: 'Education product deleted' });
  } catch (error) {
    next(error);
  }
};

const adminEducationPurchases = async (req, res, next) => {
  try {
    const Transaction = require('../models/Transaction');
    const { search = '', page = 1, limit = 20 } = req.query;
    const pagination = parsePagination({ page, limit });
    const filter = { service: 'education', status: 'successful' };
    const regex = buildSafeRegex(search);

    if (regex) {
      filter.$or = [
        { reference: regex },
        { description: regex },
        { 'metadata.productName': regex },
      ];
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions.map((t) => ({
        id: t._id,
        reference: t.reference,
        userName: t.userId?.fullName || 'Unknown',
        userEmail: t.userId?.email || '',
        productName: t.metadata?.productName || t.description,
        examType: t.metadata?.examType,
        amount: t.amount,
        quantity: t.metadata?.quantity || 1,
        pins: t.metadata?.purchaseDetails?.pins || [],
        purchasedCode: t.metadata?.purchaseDetails?.purchasedCode || null,
        createdAt: t.createdAt,
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  priceValidation,
  planValidation,
  educationProductValidation,
  getServicePrices,
  getPublicServiceStatus,
  getAppConfig,
  adminGetPrices,
  adminUpdatePrice,
  getDataPlans,
  adminListDataPlans,
  adminCreateDataPlan,
  adminUpdateDataPlan,
  adminDeleteDataPlan,
  adminListEducationProducts,
  adminCreateEducationProduct,
  adminUpdateEducationProduct,
  adminDeleteEducationProduct,
  adminEducationPurchases,
};
