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
const vtuProvider = require('../services/vtuProviderService');
const serviceConfig = require('../config/serviceConfig');
const {
  resolveVariationCode,
  assignVariationCodeForProvider,
  assignServiceIdForProvider,
  buildProviderCatalogQuery,
  buildMultiProviderCatalogQuery,
  tagWithVtuProvider,
} = require('../utils/resolveProviderFields');
const {
  mapDataPlanForPublicApi,
  buildDataPlanSyncUpdate,
  pickEditableDataPlanFields,
  normalizeDataPlanRecord,
} = require('../utils/dataPlanFields');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');
const { normalizeProvider } = require('../utils/migrateVtuSettings');

const DATA_NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];
const TV_PROVIDERS = ['dstv', 'gotv', 'startimes'];

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
  body('providerServiceId').trim().notEmpty().withMessage('Provider service ID is required'),
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
  body('providerServiceId').trim().notEmpty().withMessage('Provider service ID is required'),
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
    const settings = await SystemSettings.getSettings();
    const providerStatus = await vtuProvider.getProviderStatus();
    res.json({
      success: true,
      data: {
        ...serviceConfig.getAppConfig(),
        vtuProvider: providerStatus.active,
        serviceRouting: providerStatus.serviceRouting,
        catalogVersion: settings.catalogVersion || 1,
        providerStatus,
      },
    });
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

const mapDataPlan = (p) => mapDataPlanForPublicApi(p, inferValidityCategory);

// GET /services/data-plans/:network — public enabled plans
const getDataPlans = async (req, res, next) => {
  try {
    const { network } = req.params;
    const catalogProviders = await vtuProvider.getCatalogProviders('data');
    const plans = await DataPlan.find(
      buildMultiProviderCatalogQuery({ network, enabled: true }, catalogProviders)
    ).sort({ order: 1, amount: 1 });
    const mapped = plans.map(mapDataPlan);
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: mapped,
      groups: groupByValidityCategory(mapped, (p) => p.validity),
      catalogProviders,
      catalogVersion: settings.catalogVersion || 1,
    });
  } catch (error) {
    next(error);
  }
};

// GET /services/electricity-plans — public enabled providers
const getElectricityPlans = async (_req, res, next) => {
  try {
    await ElectricityPlan.ensureDefaults();
    const routedProvider = await vtuProvider.getRoutedProviderName('electricity');
    const plans = await ElectricityPlan.find(
      buildProviderCatalogQuery({ enabled: true }, routedProvider)
    ).sort({ order: 1, name: 1 });
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: plans.map((p) => ({
        id: p.providerId,
        name: p.name,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        order: p.order,
        vtuProvider: p.vtuProvider || routedProvider,
      })),
      vtuProvider: routedProvider,
      catalogVersion: settings.catalogVersion || 1,
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
    const routedProvider = await vtuProvider.getRoutedProviderName('tv');
    const plans = await TvPlan.find(
      buildProviderCatalogQuery({ provider, enabled: true }, routedProvider)
    ).sort({ order: 1, amount: 1 });
    const mapped = plans.map((p) => {
      const planProvider = p.vtuProvider || routedProvider;
      return {
        code: resolveVariationCode(p, planProvider),
        name: p.name,
        amount: p.amount,
        category: p.category || 'standard',
        order: p.order,
        vtuProvider: planProvider,
        planId: String(p._id),
      };
    });
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: mapped,
      groups: groupTvPlans(mapped),
      vtuProvider: routedProvider,
      catalogVersion: settings.catalogVersion || 1,
    });
  } catch (error) {
    next(error);
  }
};

const resolveAdminProviderFilter = async (req) => {
  const requested = req.query.provider || req.body?.vtuProvider;
  if (requested) return normalizeProvider(requested);
  return null;
};

const buildAdminCatalogQuery = async (baseFilter, providerFilter, serviceId) => {
  if (providerFilter) return buildProviderCatalogQuery(baseFilter, providerFilter);
  if (serviceId === 'data') {
    const catalogProviders = await vtuProvider.getCatalogProviders('data');
    return buildMultiProviderCatalogQuery(baseFilter, catalogProviders);
  }
  const routedProvider = await vtuProvider.getRoutedProviderName(serviceId);
  return buildProviderCatalogQuery(baseFilter, routedProvider);
};

const adminListDataPlans = async (req, res, next) => {
  try {
    const { network } = req.query;
    const providerFilter = await resolveAdminProviderFilter(req);
    const baseFilter = network ? { network } : {};
    const plans = await DataPlan.find(
      await buildAdminCatalogQuery(baseFilter, providerFilter, 'data')
    ).sort({ network: 1, vtuProvider: 1, order: 1, amount: 1 });
    res.json({ success: true, data: plans, providerFilter });
  } catch (error) {
    next(error);
  }
};

// POST /services/data-plans/admin
const adminCreateDataPlan = async (req, res, next) => {
  try {
    const selectedProvider = normalizeProvider(req.body.vtuProvider || req.body.provider);
    const payload = normalizeDataPlanRecord(tagWithVtuProvider(assignVariationCodeForProvider({
      ...req.body,
      validityCategory: req.body.validityCategory || inferValidityCategory(req.body.validity),
    }, selectedProvider), selectedProvider), selectedProvider);
    const plan = await DataPlan.create(payload);
    await bumpCatalogVersion();
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'A data plan with this provider and plan code already exists' });
    }
    next(error);
  }
};

// PATCH /services/data-plans/admin/:id
const adminUpdateDataPlan = async (req, res, next) => {
  try {
    const existing = await DataPlan.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Data plan not found' });

    const payload = pickEditableDataPlanFields(req.body);
    const plan = await DataPlan.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    await bumpCatalogVersion();
    res.json({ success: true, data: plan });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'A data plan with this provider and plan code already exists' });
    }
    next(error);
  }
};

// DELETE /services/data-plans/admin/:id
const adminDeleteDataPlan = async (req, res, next) => {
  try {
    const plan = await DataPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Data plan not found' });
    await bumpCatalogVersion();
    res.json({ success: true, message: 'Data plan deleted' });
  } catch (error) {
    next(error);
  }
};

const adminListElectricityPlans = async (req, res, next) => {
  try {
    await ElectricityPlan.ensureDefaults();
    const providerFilter = await resolveAdminProviderFilter(req);
    const plans = await ElectricityPlan.find(
      await buildAdminCatalogQuery({}, providerFilter, 'electricity')
    ).select('+vtpassServiceId').sort({ order: 1, name: 1 });
    res.json({ success: true, data: plans, providerFilter });
  } catch (error) {
    next(error);
  }
};

const adminCreateElectricityPlan = async (req, res, next) => {
  try {
    const selectedProvider = normalizeProvider(
      req.body.vtuProvider || await vtuProvider.getSelectedProviderName()
    );
    const payload = tagWithVtuProvider(assignServiceIdForProvider({
      ...req.body,
      providerId: String(req.body.providerId).toLowerCase().trim(),
    }, selectedProvider), selectedProvider);
    const plan = await ElectricityPlan.create(payload);
    await bumpCatalogVersion();
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
    const selectedProvider = normalizeProvider(
      req.body.vtuProvider || await vtuProvider.getSelectedProviderName()
    );
    const updates = tagWithVtuProvider(assignServiceIdForProvider({ ...req.body }, selectedProvider), selectedProvider);
    if (updates.providerId) {
      updates.providerId = String(updates.providerId).toLowerCase().trim();
    }
    const plan = await ElectricityPlan.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('+vtpassServiceId');
    if (!plan) return res.status(404).json({ success: false, message: 'Electricity plan not found' });
    await bumpCatalogVersion();
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
    await bumpCatalogVersion();
    res.json({ success: true, message: 'Electricity plan deleted' });
  } catch (error) {
    next(error);
  }
};

const adminListTvPlans = async (req, res, next) => {
  try {
    await TvPlan.ensureDefaults();
    const { provider } = req.query;
    const providerFilter = await resolveAdminProviderFilter(req);
    const baseFilter = provider ? { provider } : {};
    const plans = await TvPlan.find(
      await buildAdminCatalogQuery(baseFilter, providerFilter, 'tv')
    ).sort({ provider: 1, vtuProvider: 1, order: 1, amount: 1 });
    res.json({ success: true, data: plans, providerFilter });
  } catch (error) {
    next(error);
  }
};

const adminCreateTvPlan = async (req, res, next) => {
  try {
    const selectedProvider = normalizeProvider(
      req.body.vtuProvider || await vtuProvider.getSelectedProviderName()
    );
    const payload = tagWithVtuProvider(assignVariationCodeForProvider(req.body, selectedProvider), selectedProvider);
    const plan = await TvPlan.create(payload);
    await bumpCatalogVersion();
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
    const selectedProvider = normalizeProvider(
      req.body.vtuProvider || await vtuProvider.getSelectedProviderName()
    );
    const payload = tagWithVtuProvider(assignVariationCodeForProvider(req.body, selectedProvider), selectedProvider);
    const plan = await TvPlan.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'TV plan not found' });
    await bumpCatalogVersion();
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
    await bumpCatalogVersion();
    res.json({ success: true, message: 'TV plan deleted' });
  } catch (error) {
    next(error);
  }
};

const adminListEducationProducts = async (req, res, next) => {
  try {
    await EducationProduct.ensureDefaults();
    const { examType } = req.query;
    const providerFilter = await resolveAdminProviderFilter(req);
    const filter = examType ? { examType } : {};
    const products = await EducationProduct.find(
      await buildAdminCatalogQuery(filter, providerFilter, 'education')
    ).select('+vtpassServiceId').sort({ order: 1, amount: 1 });
    res.json({ success: true, data: products, providerFilter });
  } catch (error) {
    next(error);
  }
};

const adminCreateEducationProduct = async (req, res, next) => {
  try {
    const selectedProvider = normalizeProvider(
      req.body.vtuProvider || await vtuProvider.getSelectedProviderName()
    );
    const payload = tagWithVtuProvider(assignServiceIdForProvider(req.body, selectedProvider), selectedProvider);
    const product = await EducationProduct.create(payload);
    await bumpCatalogVersion();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const adminUpdateEducationProduct = async (req, res, next) => {
  try {
    const selectedProvider = normalizeProvider(
      req.body.vtuProvider || await vtuProvider.getSelectedProviderName()
    );
    const payload = tagWithVtuProvider(assignServiceIdForProvider(req.body, selectedProvider), selectedProvider);
    const product = await EducationProduct.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).select('+vtpassServiceId');
    if (!product) return res.status(404).json({ success: false, message: 'Education product not found' });
    await bumpCatalogVersion();
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const adminDeleteEducationProduct = async (req, res, next) => {
  try {
    const product = await EducationProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Education product not found' });
    await bumpCatalogVersion();
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

const adminSyncDataPlansFromVtpass = async (req, res, next) => {
  try {
    if (!vtuProvider.isProviderConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'VTpass is not configured on the server',
      });
    }
    const requestedNetwork = String(req.query.network || '').toLowerCase();
    const networks = requestedNetwork && DATA_NETWORKS.includes(requestedNetwork)
      ? [requestedNetwork]
      : DATA_NETWORKS;
    let synced = 0;

    for (const network of networks) {
      const result = await vtuProvider.getDataPlans(network);
      const variations = result.content?.variations || [];

      for (const plan of variations) {
        if (!plan.variation_code) continue;
        const update = buildDataPlanSyncUpdate('vtpass', network, plan);
        await DataPlan.findOneAndUpdate(
          { vtuProvider: 'vtpass', providerPlanCode: plan.variation_code },
          { $set: update },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        synced += 1;
      }
    }

    await bumpCatalogVersion();
    res.json({ success: true, data: { synced, networks, source: 'vtpass' } });
  } catch (error) {
    next(error);
  }
};

const adminSyncTvPlansFromVtpass = async (req, res, next) => {
  try {
    if (!vtuProvider.isProviderConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'VTpass is not configured on the server',
      });
    }
    const requestedProvider = String(req.query.provider || '').toLowerCase();
    const providers = requestedProvider && TV_PROVIDERS.includes(requestedProvider)
      ? [requestedProvider]
      : TV_PROVIDERS;
    let synced = 0;

    for (const provider of providers) {
      const result = await vtuProvider.getTVPackages(provider);
      const variations = result.content?.variations || [];

      for (const pkg of variations) {
        if (!pkg.variation_code) continue;
        const code = pkg.variation_code;
        const planName = pkg.name || code;
        const update = {
          provider,
          name: planName,
          amount: parseFloat(pkg.variation_amount) || 0,
          enabled: true,
          vtuProvider: 'vtpass',
          variationCode: code,
          vtpassVariationCode: code,
        };

        await TvPlan.findOneAndUpdate(
          { provider, vtuProvider: 'vtpass', variationCode: code },
          { $set: tagWithVtuProvider(update) },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        synced += 1;
      }
    }

    await bumpCatalogVersion();
    res.json({ success: true, data: { synced, providers, source: 'vtpass' } });
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
  adminSyncDataPlansFromVtpass,
  adminSyncTvPlansFromVtpass,
};
