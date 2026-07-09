const { body } = require('express-validator');
const DataPlan = require('../models/DataPlan');
const ElectricityPlan = require('../models/ElectricityPlan');
const TvPlan = require('../models/TvPlan');
const EducationProduct = require('../models/EducationProduct');
const serviceConfig = require('../config/serviceConfig');
const vtuProvider = require('../services/vtuProviderService');
const assertServiceEnabled = require('../utils/assertServiceEnabled');
const {
  executeVtuPurchase,
  formatTransactionPayload,
} = require('../services/vtuPurchaseService');
const { groupByValidityCategory, inferValidityCategory } = require('../utils/validityCategory');
const { groupTvPlans } = require('../utils/tvCategory');
const { normalizeNigerianPhone, isValidNigerianPhone } = require('../utils/phoneUtils');
const verifyTransactionPin = require('../utils/verifyTransactionPin');
const {
  getPlatformById,
  getProviderServiceId,
} = require('../services/bettingPlatformService');
const {
  resolveVariationCode,
  resolveServiceId,
  variationCodeQuery,
  buildProviderCatalogQuery,
  buildMultiProviderCatalogQuery,
} = require('../utils/resolveProviderFields');
const {
  mapDataPlanForPublicApi,
} = require('../utils/dataPlanFields');

const mapDataPlanForApi = (plan) => mapDataPlanForPublicApi(plan, inferValidityCategory);

/** Deduplicate plan codes — keep first of each. */
const dedupeByCode = (items, codeKey) => {
  const seen = new Set();
  return items.filter((item) => {
    const code = item[codeKey];
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
};

const sendPurchaseResponse = (res, result, successStatus = 200) => {
  const status = result.success ? successStatus : 400;
  return res.status(status).json({
    success: result.success,
    message: result.message,
    data: formatTransactionPayload(result.transaction, {
      details: result.purchaseDetails,
      refunded: result.refunded || false,
    }),
  });
};

const buyAirtime = async (req, res, next) => {
  try {
    await assertServiceEnabled('airtime');
    const { network, phone, amount, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin, req);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'airtime',
      amount,
      description: `Airtime purchase: ₦${amount} for ${phone} (${network})`,
      metadata: { network, phone },
      providerName: await vtuProvider.getRoutedProviderName('airtime'),
      providerCall: (requestId, providerName) => vtuProvider.purchaseAirtime(
        { network, phone, amount, requestId },
        providerName
      ),
    });

    sendPurchaseResponse(res, result);
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    next(error);
  }
};

const fetchDataPlans = async (req, res, next) => {
  try {
    const { network } = req.params;
    const catalogProviders = await vtuProvider.getCatalogProviders('data');

    const localPlans = await DataPlan.find(
      buildMultiProviderCatalogQuery({ network, enabled: true }, catalogProviders)
    ).sort({ order: 1, amount: 1 });

    if (localPlans.length > 0) {
      const mapped = localPlans.map(mapDataPlanForApi);
      return res.json({
        success: true,
        data: mapped,
        groups: groupByValidityCategory(mapped, (p) => p.validity),
        source: 'local',
        catalogProviders,
      });
    }

    for (const activeProvider of catalogProviders) {
      if (!vtuProvider.isProviderConfigured(activeProvider)) continue;
      try {
        const result = await vtuProvider.getDataPlans(network, activeProvider);
        const variations = dedupeByCode(result.content?.variations || [], 'variation_code');
        if (variations.length > 0) {
          return res.json({
            success: true,
            data: variations,
            source: activeProvider,
            catalogProviders,
          });
        }
      } catch {
        // try next provider
      }
    }

    res.json({ success: true, data: [], source: 'local', catalogProviders });
  } catch (error) {
    next(error);
  }
};

const findDataPlan = async ({ network, variationCode, planId }) => {
  if (planId) {
    const plan = await DataPlan.findById(planId);
    if (!plan || !plan.enabled) return null;
    if (network && plan.network !== String(network).toLowerCase()) return null;
    return plan;
  }
  const catalogProviders = await vtuProvider.getCatalogProviders('data');
  return DataPlan.findOne(
    buildMultiProviderCatalogQuery({
      network: String(network).toLowerCase(),
      enabled: true,
      ...variationCodeQuery(variationCode),
    }, catalogProviders)
  );
};

const resolveDataPurchaseCode = (plan) => {
  if (!plan) return null;
  const provider = plan.vtuProvider || 'vtpass';
  if (provider === 'vtpass') {
    return plan.providerVariationCode || plan.providerPlanCode || plan.vtpassVariationCode || plan.variationCode;
  }
  return plan.providerProductCode || plan.providerPlanCode || plan.planCode || plan.variationCode;
};

const resolveDataPlanAmount = async ({ network, variationCode, amount, planId }) => {
  const plan = await findDataPlan({ network, variationCode, planId });
  if (plan) {
    return { amount: plan.amount, plan };
  }
  if (planId) {
    const error = new Error('Selected data plan was not found');
    error.statusCode = 404;
    throw error;
  }
  const numericAmount = parseFloat(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 1) {
    const error = new Error('Invalid amount');
    error.statusCode = 400;
    throw error;
  }
  return { amount: numericAmount, plan: null };
};

const resolveDataProviderCode = async ({ network, variationCode, plan, planId }) => {
  const resolvedPlan = plan || await findDataPlan({ network, variationCode, planId });
  if (!resolvedPlan) return variationCode;
  return resolveDataPurchaseCode(resolvedPlan) || variationCode;
};

const findTvPlan = async ({ provider, variationCode, planId }) => {
  if (planId) {
    const plan = await TvPlan.findById(planId);
    if (!plan || !plan.enabled) return null;
    if (provider && plan.provider !== String(provider).toLowerCase()) return null;
    return plan;
  }
  const routedProvider = await vtuProvider.getRoutedProviderName('tv');
  return TvPlan.findOne(
    buildProviderCatalogQuery({
      provider: String(provider).toLowerCase(),
      enabled: true,
      ...variationCodeQuery(variationCode),
    }, routedProvider)
  );
};

const resolveTvPlanAmount = async ({ provider, variationCode, amount, planId }) => {
  const plan = await findTvPlan({ provider, variationCode, planId });
  if (plan) {
    return { amount: plan.amount, plan };
  }
  if (planId) {
    const error = new Error('Selected TV package was not found');
    error.statusCode = 404;
    throw error;
  }
  const numericAmount = parseFloat(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 1) {
    const error = new Error('Invalid amount');
    error.statusCode = 400;
    throw error;
  }
  return { amount: numericAmount, plan: null };
};

const resolveTvProviderCode = async ({ provider, variationCode, plan }) => {
  const resolvedPlan = plan || await findTvPlan({ provider, variationCode });
  if (!resolvedPlan) return variationCode;
  const planProvider = resolvedPlan.vtuProvider || 'vtpass';
  return resolveVariationCode(resolvedPlan, planProvider) || variationCode;
};

const buyData = async (req, res, next) => {
  try {
    await assertServiceEnabled('data');
    const { network, phone, variationCode, amount, pin, planId } = req.body;
    await verifyTransactionPin(req.user._id, pin, req);

    const { amount: validatedAmount, plan: dataPlan } = await resolveDataPlanAmount({
      network, variationCode, amount, planId,
    });
    if (!dataPlan && planId) {
      return res.status(404).json({ success: false, message: 'Selected data plan was not found' });
    }
    const providerCode = await resolveDataProviderCode({
      network, variationCode, plan: dataPlan, planId,
    });
    const purchaseProvider = dataPlan?.vtuProvider || await vtuProvider.getRoutedProviderName('data');

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'data',
      amount: validatedAmount,
      description: `Data purchase for ${phone} (${network})`,
      metadata: { network, phone, variationCode, vtuProvider: purchaseProvider },
      providerName: purchaseProvider,
      providerCall: (requestId, providerName) => vtuProvider.purchaseData({
        network, phone, variationCode: providerCode, requestId,
      }, providerName),
    });

    sendPurchaseResponse(res, result);
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    next(error);
  }
};

const resolveElectricityProvider = async (providerId) => {
  await ElectricityPlan.ensureDefaults();
  const routedProvider = await vtuProvider.getRoutedProviderName('electricity');
  const plan = await ElectricityPlan.findOne(
    buildProviderCatalogQuery({
      providerId: String(providerId).toLowerCase(),
      enabled: true,
    }, routedProvider)
  ).select('+vtpassServiceId');
  if (!plan) {
    const error = new Error('Electricity provider is unavailable');
    error.statusCode = 400;
    throw error;
  }
  return plan;
};

const resolveElectricityServiceId = async (plan) => {
  const provider = plan.vtuProvider || await vtuProvider.getRoutedProviderName('electricity');
  return resolveServiceId(plan, provider);
};

const payElectricity = async (req, res, next) => {
  try {
    await assertServiceEnabled('electricity');
    const { provider, meterNumber, meterType, amount, phone, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin, req);

    const plan = await resolveElectricityProvider(provider);
    if (amount < plan.minAmount || amount > plan.maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₦${plan.minAmount} and ₦${plan.maxAmount}`,
      });
    }

    const serviceId = await resolveElectricityServiceId(plan);
    const purchaseProvider = plan.vtuProvider || await vtuProvider.getRoutedProviderName('electricity');

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'electricity',
      amount,
      description: `Electricity bill: ₦${amount} for meter ${meterNumber}`,
      metadata: {
        provider: plan.providerId,
        providerName: plan.name,
        meterNumber,
        meterType,
        phone,
        providerServiceId: serviceId,
        vtuProvider: purchaseProvider,
      },
      providerName: purchaseProvider,
      providerCall: (requestId, providerName) => vtuProvider.payElectricity({
        provider: plan.providerId,
        serviceId,
        meterNumber,
        meterType,
        amount,
        phone,
        requestId,
      }, providerName),
    });

    sendPurchaseResponse(res, result);
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const verifyElectricityMeter = async (req, res, next) => {
  try {
    await vtuProvider.assertActiveProviderConfigured('electricity');
    const { provider, meterNumber, meterType } = req.body;
    const plan = await resolveElectricityProvider(provider);
    const serviceId = await resolveElectricityServiceId(plan);
    const verifyProvider = plan.vtuProvider || await vtuProvider.getRoutedProviderName('electricity');
    const result = await vtuProvider.verifyElectricityMeter({
      provider: plan.providerId,
      serviceId,
      meterNumber,
      meterType,
    }, verifyProvider);

    res.json({
      success: true,
      data: {
        customerName: result.content?.Customer_Name || result.content?.customerName,
        customerAddress: result.content?.Address || result.content?.customerAddress,
        meterNumber: result.content?.Meter_Number || meterNumber,
        minimumAmount: result.content?.Min_Purchase_Amount || result.content?.minimium_amount || plan.minAmount,
        maxAmount: plan.maxAmount,
        providerName: plan.name,
        raw: result.content,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const fetchTVPackages = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const routedProvider = await vtuProvider.getRoutedProviderName('tv');
    await TvPlan.ensureDefaults();

    const localPlans = await TvPlan.find(
      buildProviderCatalogQuery({ provider, enabled: true }, routedProvider)
    ).sort({ order: 1, amount: 1 });
    if (localPlans.length > 0) {
      const mapped = localPlans.map((p) => {
        const planProvider = p.vtuProvider || 'vtpass';
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
      return res.json({
        success: true,
        data: mapped,
        groups: groupTvPlans(mapped),
        source: 'local',
        vtuProvider: routedProvider,
      });
    }

    if (vtuProvider.isProviderConfigured(routedProvider)) {
      try {
        const result = await vtuProvider.getTVPackages(provider, routedProvider);
        const packages = dedupeByCode(
          (result.content?.variations || []).map((pkg) => ({
            code: pkg.variation_code,
            name: pkg.name,
            amount: parseFloat(pkg.variation_amount),
            vtuProvider: routedProvider,
          })),
          'code'
        );
        if (packages.length > 0) {
          return res.json({ success: true, data: packages, source: routedProvider, vtuProvider: routedProvider });
        }
      } catch {
        // fall through
      }
    }

    res.json({ success: true, data: [], source: 'local', vtuProvider: routedProvider });
  } catch (error) {
    next(error);
  }
};

const verifyTVSmartcard = async (req, res, next) => {
  try {
    await vtuProvider.assertActiveProviderConfigured('tv');
    const { provider, smartcardNumber } = req.body;
    const verifyProvider = await vtuProvider.getRoutedProviderName('tv');
    const result = await vtuProvider.verifyTVSmartcard({ provider, smartcardNumber }, verifyProvider);

    res.json({
      success: true,
      data: {
        customerName: result.content?.Customer_Name || result.content?.customerName,
        currentBouquet: result.content?.Current_Bouquet || result.content?.current_bouquet,
        renewalAmount: result.content?.Renewal_Amount || result.content?.renewal_amount,
        smartcardNumber: result.content?.Customer_Number || smartcardNumber,
        raw: result.content,
      },
    });
  } catch (error) {
    next(error);
  }
};

const payTV = async (req, res, next) => {
  try {
    await assertServiceEnabled('tv');
    const { provider, smartcardNumber, variationCode, amount, phone, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin, req);

    const { amount: validatedAmount, plan: tvPlan } = await resolveTvPlanAmount({
      provider, variationCode, amount, planId: req.body.planId,
    });
    const providerCode = await resolveTvProviderCode({ provider, variationCode, plan: tvPlan });
    const purchaseProvider = tvPlan?.vtuProvider || await vtuProvider.getRoutedProviderName('tv');

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'tv',
      amount: validatedAmount,
      description: `TV subscription: ${provider} for ${smartcardNumber}`,
      metadata: { provider, smartcardNumber, variationCode, phone, vtuProvider: purchaseProvider },
      providerName: purchaseProvider,
      providerCall: (requestId, providerName) => vtuProvider.payTV({
        provider, smartcardNumber, variationCode: providerCode, phone, requestId,
      }, providerName),
    });

    sendPurchaseResponse(res, result);
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    next(error);
  }
};

const buyEducationPin = async (req, res, next) => {
  try {
    await assertServiceEnabled('education');

    const { productId, productCode, quantity = 1, amount, phone, billersCode, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin, req);

    const productFilter = productId ? { _id: productId } : { productCode };
    const routedProvider = await vtuProvider.getRoutedProviderName('education');
    const product = await EducationProduct.findOne(
      buildProviderCatalogQuery({ ...productFilter, enabled: true }, routedProvider)
    ).select('+vtpassServiceId');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Education product not found or disabled' });
    }

    const qty = parseInt(quantity, 10);
    if (qty < 1 || qty > product.maxQuantity) {
      return res.status(400).json({
        success: false,
        message: `Quantity must be between 1 and ${product.maxQuantity}`,
      });
    }

    const expectedAmount = product.amount * qty;
    if (Math.abs(parseFloat(amount) - expectedAmount) > 0.01) {
      return res.status(400).json({ success: false, message: 'Invalid amount for selected product' });
    }

    if (product.requiresBillersCode && !billersCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: `${product.billersCodeLabel || 'Profile code'} is required`,
      });
    }

    const productProvider = product.vtuProvider || await vtuProvider.getRoutedProviderName('education');
    const serviceId = resolveServiceId(product, productProvider);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'education',
      amount: expectedAmount,
      description: `${product.name}${qty > 1 ? ` x${qty}` : ''}`,
      metadata: {
        examType: product.examType,
        productId: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity: qty,
        phone,
        billersCode: billersCode?.trim() || null,
        vtuProvider: productProvider,
      },
      applyPricing: true,
      pricingServiceId: 'education',
      providerName: productProvider,
      providerCall: (requestId, providerName) => vtuProvider.purchaseEducationPin({
        serviceId,
        variationCode: product.variationCode,
        quantity: qty,
        phone,
        billersCode: billersCode?.trim(),
        requestId,
        examType: product.examType,
      }, providerName),
    });

    sendPurchaseResponse(res, result);
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    next(error);
  }
};

const fetchEducationProducts = async (req, res, next) => {
  try {
    await assertServiceEnabled('education');
    await EducationProduct.ensureDefaults();

    const routedProvider = await vtuProvider.getRoutedProviderName('education');
    const allProducts = await EducationProduct.find(
      buildProviderCatalogQuery({}, routedProvider)
    ).sort({ order: 1, amount: 1 });
    const enabledProducts = allProducts.filter((product) => product.enabled);

    const exams = ['waec', 'neco', 'jamb'].map((examType) => {
      const examProducts = enabledProducts.filter((product) => product.examType === examType);
      const disabledProduct = allProducts.find((product) => product.examType === examType && !product.enabled);
      return {
        id: examType,
        name: examType.toUpperCase(),
        available: examProducts.length > 0,
        productCount: examProducts.length,
        unavailableReason: examProducts.length === 0
          ? (disabledProduct?.description || `${examType.toUpperCase()} is temporarily unavailable`)
          : null,
      };
    });

    res.json({ success: true, data: enabledProducts, exams, vtuProvider: routedProvider });
  } catch (error) {
    next(error);
  }
};

const verifyBettingCustomer = async (req, res, next) => {
  try {
    await vtuProvider.assertActiveProviderConfigured('betting');
    const { platform, customerId } = req.body;
    const bettingPlatform = await getPlatformById(platform);
    const routedProvider = await vtuProvider.getRoutedProviderName('betting');
    const providerServiceId = getProviderServiceId(bettingPlatform, routedProvider);
    if (!providerServiceId) {
      return res.status(400).json({ success: false, message: 'This betting platform is not available' });
    }

    const result = await vtuProvider.verifyBettingCustomer({
      providerServiceId,
      platformId: bettingPlatform.platformId,
      customerId,
    }, routedProvider);

    res.json({
      success: true,
      data: {
        customerName: result.content?.Customer_Name || result.content?.customerName,
        customerId,
        platformName: bettingPlatform.name,
        raw: result.content,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const fundBetting = async (req, res, next) => {
  try {
    await assertServiceEnabled('betting');
    const { platform, customerId, amount, pin } = req.body;
    const phone = normalizeNigerianPhone(req.body.phone || req.user?.phoneNumber);
    if (!isValidNigerianPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Nigerian phone number is required (e.g. 08012345678)',
      });
    }

    const bettingPlatform = await getPlatformById(platform);
    const routedProvider = await vtuProvider.getRoutedProviderName('betting');
    const providerServiceId = getProviderServiceId(bettingPlatform, routedProvider);
    if (!bettingPlatform?.enabled || !providerServiceId) {
      return res.status(400).json({
        success: false,
        message: 'This betting platform is not available right now. Please try another platform or contact support.',
      });
    }

    if (amount < bettingPlatform.minAmount || amount > bettingPlatform.maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₦${bettingPlatform.minAmount} and ₦${bettingPlatform.maxAmount}`,
      });
    }

    await verifyTransactionPin(req.user._id, pin, req);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'betting',
      amount,
      description: `Betting wallet: ₦${amount} to ${bettingPlatform.name}`,
      metadata: {
        platform: bettingPlatform.platformId,
        platformName: bettingPlatform.name,
        providerServiceId,
        customerId,
        phone,
        vtuProvider: routedProvider,
      },
      applyPricing: false,
      providerName: routedProvider,
      providerCall: (requestId, providerName) => vtuProvider.fundBettingWallet({
        providerServiceId,
        platformId: bettingPlatform.platformId,
        customerId,
        amount,
        phone,
        requestId,
      }, providerName),
    });

    sendPurchaseResponse(res, result);
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    next(error);
  }
};

const pinValidation = body('pin').matches(/^\d{4}$/).withMessage('Transaction PIN is required');

const educationValidation = [
  body('productId').optional().isMongoId().withMessage('Invalid product'),
  body('productCode').optional().trim().notEmpty().withMessage('Product code is required'),
  body().custom((value) => {
    if (!value.productId && !value.productCode) {
      throw new Error('Product is required');
    }
    return true;
  }),
  body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Invalid quantity'),
  body('amount').isFloat({ min: 100 }).withMessage('Invalid amount'),
  body('phone').matches(/^0[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
  body('billersCode').optional().trim(),
  pinValidation,
];

const airtimeValidation = [
  body('network').isIn(['mtn', 'airtel', 'glo', '9mobile']).withMessage('Invalid network'),
  body('phone').matches(/^0[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
  body('amount').isFloat({ min: 50 }).withMessage('Minimum airtime is ₦50'),
  pinValidation,
];

const dataValidation = [
  body('network').isIn(['mtn', 'airtel', 'glo', '9mobile']).withMessage('Invalid network'),
  body('phone').matches(/^0[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
  body('variationCode').notEmpty().withMessage('Data plan is required'),
  body('planId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid plan ID'),
  body('amount').optional({ values: 'falsy' }).isFloat({ min: 1 }).withMessage('Invalid amount'),
  pinValidation,
];

const electricityValidation = [
  body('provider').isIn(['ikeja', 'eko', 'abuja', 'kaduna', 'kano', 'portharcourt', 'jos', 'ibadan']).withMessage('Invalid provider'),
  body('meterNumber').trim().notEmpty().withMessage('Meter number is required'),
  body('meterType').isIn(['prepaid', 'postpaid']).withMessage('Invalid meter type'),
  body('amount').isFloat({ min: 500 }).withMessage('Minimum electricity payment is ₦500'),
  body('phone').optional().matches(/^0[789][01]\d{8}$/).withMessage('Invalid phone number'),
  pinValidation,
];

const electricityVerifyValidation = [
  body('provider').isIn(['ikeja', 'eko', 'abuja', 'kaduna', 'kano', 'portharcourt', 'jos', 'ibadan']).withMessage('Invalid provider'),
  body('meterNumber').trim().notEmpty().withMessage('Meter number is required'),
  body('meterType').isIn(['prepaid', 'postpaid']).withMessage('Invalid meter type'),
];

const tvValidation = [
  body('provider').isIn(['dstv', 'gotv', 'startimes']).withMessage('Invalid TV provider'),
  body('smartcardNumber').trim().notEmpty().withMessage('Smartcard number is required'),
  body('variationCode').notEmpty().withMessage('Package is required'),
  body('planId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid plan ID'),
  body('amount').optional({ values: 'falsy' }).isFloat({ min: 1 }).withMessage('Invalid amount'),
  body('phone').optional().matches(/^0[789][01]\d{8}$/).withMessage('Invalid phone number'),
  pinValidation,
];

const tvVerifyValidation = [
  body('provider').isIn(['dstv', 'gotv', 'startimes']).withMessage('Invalid TV provider'),
  body('smartcardNumber').trim().notEmpty().withMessage('Smartcard number is required'),
];

const bettingVerifyValidation = [
  body('platform').trim().notEmpty().withMessage('Betting platform is required'),
  body('customerId').trim().notEmpty().withMessage('Customer ID is required'),
];

const bettingValidation = [
  body('platform').trim().notEmpty().withMessage('Betting platform is required'),
  body('customerId').trim().notEmpty().withMessage('Customer ID is required'),
  body('amount').isFloat({ min: 100 }).withMessage('Minimum betting funding is ₦100'),
  body('phone').optional().custom((value, { req }) => {
    const phone = normalizeNigerianPhone(value || req.user?.phoneNumber);
    if (!isValidNigerianPhone(phone)) {
      throw new Error('A valid Nigerian phone number is required');
    }
    return true;
  }),
  pinValidation,
];

module.exports = {
  buyAirtime,
  fetchDataPlans,
  buyData,
  payElectricity,
  verifyElectricityMeter,
  fetchTVPackages,
  verifyTVSmartcard,
  payTV,
  buyEducationPin,
  fetchEducationProducts,
  verifyBettingCustomer,
  fundBetting,
  airtimeValidation,
  dataValidation,
  electricityValidation,
  electricityVerifyValidation,
  tvValidation,
  tvVerifyValidation,
  educationValidation,
  bettingVerifyValidation,
  bettingValidation,
};
