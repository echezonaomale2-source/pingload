const { body } = require('express-validator');
const ServicePrice = require('../models/ServicePrice');
const DataPlan = require('../models/DataPlan');
const ElectricityPlan = require('../models/ElectricityPlan');
const TvPlan = require('../models/TvPlan');
const EducationProduct = require('../models/EducationProduct');
const SystemSettings = require('../models/SystemSettings');
const { groupByValidityCategory, inferValidityCategory } = require('../utils/validityCategory');
const { groupTvPlans } = require('../utils/tvCategory');
const {
  listEnabledPlatforms,
  mapPublicPlatform,
} = require('../services/bettingPlatformService');

const isDuplicateKeyError = (error) => error?.code === 11000;

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
  body('commissionPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission must be 0-100'),
  body('validityCategory').optional().isIn(['daily', 'weekly', 'monthly', 'yearly', 'other']),
  body('category').optional().trim(),
  body('order').optional().isInt({ min: 0 }),
  body('enabled').optional().isBoolean(),
];

const electricityPlanValidation = [
  body('providerId').trim().notEmpty().withMessage('Provider ID is required')
    .matches(/^[a-z0-9_-]+$/i).withMessage('Provider ID must be alphanumeric'),
  body('name').trim().notEmpty().withMessage('Provider name is required'),
  body('vtpassServiceId').trim().notEmpty().withMessage('VTpass service ID is required'),
  body('minAmount').optional().isFloat({ min: 0 }),
  body('maxAmount').optional().isFloat({ min: 0 }),
  body('order').optional().isInt({ min: 0 }),
  body('enabled').optional().isBoolean(),
];

const tvPlanValidation = [
  body('provider').isIn(['dstv', 'gotv', 'startimes']).withMessage('Invalid TV provider'),
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('variationCode').trim().notEmpty().withMessage('Variation code is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('category').optional().isIn(['entry', 'standard', 'premium', 'other']),
  body('order').optional().isInt({ min: 0 }),
  body('enabled').optional().isBoolean(),
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

const mapDataPlan = (p) => ({
  variation_code: p.variationCode,
  name: p.name,
  variation_amount: String(p.amount),
  dataSize: p.dataSize,
  validity: p.validity,
  validityCategory: p.validityCategory || inferValidityCategory(p.validity),
  category: p.category || '',
  commissionPercent: p.commissionPercent || 0,
  order: p.order || 0,
});

// GET /services/data-plans/:network — public enabled plans
const getDataPlans = async (req, res, next) => {
  try {
    const { network } = req.params;
    const plans = await DataPlan.find({ network, enabled: true }).sort({ order: 1, amount: 1 });
    const mapped = plans.map(mapDataPlan);
    res.json({
      success: true,
      data: mapped,
      groups: groupByValidityCategory(mapped, (p) => p.validity),
    });
  } catch (error) {
    next(error);
  }
};

// GET /services/electricity-plans — public enabled providers
const getElectricityPlans = async (_req, res, next) => {
  try {
    await ElectricityPlan.ensureDefaults();
    const plans = await ElectricityPlan.find({ enabled: true }).sort({ order: 1, name: 1 });
    res.json({
      success: true,
      data: plans.map((p) => ({
        id: p.providerId,
        name: p.name,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        order: p.order,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /services/betting-platforms — public enabled betting providers
const getBettingPlatforms = async (_req, res, next) => {
  try {
    const platforms = await listEnabledPlatforms();
    res.json({
      success: true,
      data: platforms.map(mapPublicPlatform),
    });
  } catch (error) {
    next(error);
  }
};

// GET /services/tv-plans/:provider — public enabled packages
const getTvPlans = async (req, res, next) => {
  try {
    await TvPlan.ensureDefaults();
    const { provider } = req.params;
    const plans = await TvPlan.find({ provider, enabled: true }).sort({ order: 1, amount: 1 });
    const mapped = plans.map((p) => ({
      code: p.variationCode,
      name: p.name,
      amount: p.amount,
      category: p.category || 'standard',
      order: p.order,
    }));
    res.json({
      success: true,
      data: mapped,
      groups: groupTvPlans(mapped),
    });
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
    const payload = {
      ...req.body,
      validityCategory: req.body.validityCategory || inferValidityCategory(req.body.validity),
    };
    const plan = await DataPlan.create(payload);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'A data plan with this network and variation code already exists' });
    }
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
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'A data plan with this network and variation code already exists' });
    }
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

const adminListElectricityPlans = async (_req, res, next) => {
  try {
    await ElectricityPlan.ensureDefaults();
    const plans = await ElectricityPlan.find().sort({ order: 1, name: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

const adminCreateElectricityPlan = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      providerId: String(req.body.providerId).toLowerCase().trim(),
    };
    const plan = await ElectricityPlan.create(payload);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'An electricity provider with this ID already exists' });
    }
    next(error);
  }
};

const adminUpdateElectricityPlan = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.providerId) {
      updates.providerId = String(updates.providerId).toLowerCase().trim();
    }
    const plan = await ElectricityPlan.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!plan) return res.status(404).json({ success: false, message: 'Electricity plan not found' });
    res.json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'An electricity provider with this ID already exists' });
    }
    next(error);
  }
};

const adminDeleteElectricityPlan = async (req, res, next) => {
  try {
    const plan = await ElectricityPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Electricity plan not found' });
    res.json({ success: true, message: 'Electricity plan deleted' });
  } catch (error) {
    next(error);
  }
};

const adminListTvPlans = async (req, res, next) => {
  try {
    await TvPlan.ensureDefaults();
    const { provider } = req.query;
    const filter = provider ? { provider } : {};
    const plans = await TvPlan.find(filter).sort({ provider: 1, order: 1, amount: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

const adminCreateTvPlan = async (req, res, next) => {
  try {
    const plan = await TvPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'A TV plan with this provider and variation code already exists' });
    }
    next(error);
  }
};

const adminUpdateTvPlan = async (req, res, next) => {
  try {
    const plan = await TvPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'TV plan not found' });
    res.json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'A TV plan with this provider and variation code already exists' });
    }
    next(error);
  }
};

const adminDeleteTvPlan = async (req, res, next) => {
  try {
    const plan = await TvPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'TV plan not found' });
    res.json({ success: true, message: 'TV plan deleted' });
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
  electricityPlanValidation,
  tvPlanValidation,
  educationProductValidation,
  getServicePrices,
  getPublicServiceStatus,
  getAppConfig,
  adminGetPrices,
  adminUpdatePrice,
  getDataPlans,
  getElectricityPlans,
  getBettingPlatforms,
  getTvPlans,
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
};
