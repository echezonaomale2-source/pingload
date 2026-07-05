const { body } = require('express-validator');
const DataPlan = require('../models/DataPlan');
const ElectricityPlan = require('../models/ElectricityPlan');
const TvPlan = require('../models/TvPlan');
const EducationProduct = require('../models/EducationProduct');
const serviceConfig = require('../config/serviceConfig');
const clubkonnect = require('../services/clubkonnectService');
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
} = require('../services/bettingPlatformService');

/** Clubkonnect sometimes returns duplicate plan codes — keep first of each. */
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
      providerCall: (requestId) => clubkonnect.purchaseAirtime({ network, phone, amount, requestId }),
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

    // Always prefer admin-managed plans so price/commission changes apply immediately.
    const localPlans = await DataPlan.find({ network, enabled: true }).sort({ order: 1, amount: 1 });

    if (localPlans.length > 0) {
      const mapped = localPlans.map((p) => ({
        variation_code: p.variationCode,
        name: p.name,
        variation_amount: String(p.amount),
        dataSize: p.dataSize,
        validity: p.validity,
        validityCategory: p.validityCategory || inferValidityCategory(p.validity),
        category: p.category || '',
        commissionPercent: p.commissionPercent || 0,
        order: p.order || 0,
      }));
      return res.json({
        success: true,
        data: mapped,
        groups: groupByValidityCategory(mapped, (p) => p.validity),
        source: 'local',
      });
    }

    // Fallback to Clubkonnect catalogue when no local plans are configured.
    if (serviceConfig.clubkonnect.configured) {
      try {
        const result = await clubkonnect.getDataPlans(network);
        const variations = dedupeByCode(result.content?.variations || [], 'variation_code');
        if (variations.length > 0) {
          return res.json({ success: true, data: variations, source: 'clubkonnect' });
        }
      } catch {
        // fall through
      }
    }

    res.json({ success: true, data: [], source: 'local' });
  } catch (error) {
    next(error);
  }
};

const amountsMatch = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

const resolveDataPlanAmount = async ({ network, variationCode, amount }) => {
  const plan = await DataPlan.findOne({
    network: String(network).toLowerCase(),
    variationCode,
    enabled: true,
  });
  if (plan && !amountsMatch(amount, plan.amount)) {
    const error = new Error(`Invalid plan amount. Expected ₦${plan.amount}`);
    error.statusCode = 400;
    throw error;
  }
  return plan?.amount ?? amount;
};

const resolveTvPlanAmount = async ({ provider, variationCode, amount }) => {
  const plan = await TvPlan.findOne({
    provider: String(provider).toLowerCase(),
    variationCode,
    enabled: true,
  });
  if (plan && !amountsMatch(amount, plan.amount)) {
    const error = new Error(`Invalid package amount. Expected ₦${plan.amount}`);
    error.statusCode = 400;
    throw error;
  }
  return plan?.amount ?? amount;
};

const buyData = async (req, res, next) => {
  try {
    await assertServiceEnabled('data');
    const { network, phone, variationCode, amount, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin, req);

    const validatedAmount = await resolveDataPlanAmount({ network, variationCode, amount });

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'data',
      amount: validatedAmount,
      description: `Data purchase for ${phone} (${network})`,
      metadata: { network, phone, variationCode },
      providerCall: (requestId) => clubkonnect.purchaseData({ network, phone, variationCode, requestId }),
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
  const plan = await ElectricityPlan.findOne({
    providerId: String(providerId).toLowerCase(),
    enabled: true,
  });
  if (!plan) {
    const error = new Error('Electricity provider is unavailable');
    error.statusCode = 400;
    throw error;
  }
  return plan;
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
        providerServiceId: plan.providerServiceId || plan.vtpassServiceId,
      },
      providerCall: (requestId) => clubkonnect.payElectricity({
        provider: plan.providerId,
        serviceId: plan.providerServiceId || plan.vtpassServiceId,
        meterNumber,
        meterType,
        amount,
        phone,
        requestId,
      }),
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
    clubkonnect.assertClubkonnectConfigured();
    const { provider, meterNumber, meterType } = req.body;
    const plan = await resolveElectricityProvider(provider);
    const result = await clubkonnect.verifyElectricityMeter({
      provider: plan.providerId,
      serviceId: plan.providerServiceId || plan.vtpassServiceId,
      meterNumber,
      meterType,
    });

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
    await TvPlan.ensureDefaults();

    const localPlans = await TvPlan.find({ provider, enabled: true }).sort({ order: 1, amount: 1 });
    if (localPlans.length > 0) {
      const mapped = localPlans.map((p) => ({
        code: p.variationCode,
        name: p.name,
        amount: p.amount,
        category: p.category || 'standard',
        order: p.order,
      }));
      return res.json({
        success: true,
        data: mapped,
        groups: groupTvPlans(mapped),
        source: 'local',
      });
    }

    if (serviceConfig.clubkonnect.configured) {
      try {
        const result = await clubkonnect.getTVPackages(provider);
        const packages = dedupeByCode(
          (result.content?.variations || []).map((pkg) => ({
            code: pkg.variation_code,
            name: pkg.name,
            amount: parseFloat(pkg.variation_amount),
          })),
          'code'
        );
        if (packages.length > 0) {
          return res.json({ success: true, data: packages, source: 'clubkonnect' });
        }
      } catch {
        // fall through
      }
    }

    res.json({ success: true, data: [], source: 'local' });
  } catch (error) {
    next(error);
  }
};

const verifyTVSmartcard = async (req, res, next) => {
  try {
    clubkonnect.assertClubkonnectConfigured();
    const { provider, smartcardNumber } = req.body;
    const result = await clubkonnect.verifyTVSmartcard({ provider, smartcardNumber });

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

    const validatedAmount = await resolveTvPlanAmount({ provider, variationCode, amount });

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'tv',
      amount: validatedAmount,
      description: `TV subscription: ${provider} for ${smartcardNumber}`,
      metadata: { provider, smartcardNumber, variationCode, phone },
      providerCall: (requestId) => clubkonnect.payTV({
        provider, smartcardNumber, variationCode, phone, requestId,
      }),
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
    const product = await EducationProduct.findOne({ ...productFilter, enabled: true });
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
      },
      applyPricing: true,
      pricingServiceId: 'education',
      providerCall: (requestId) => clubkonnect.purchaseEducationPin({
        providerServiceId: product.providerServiceId || product.vtpassServiceId,
        variationCode: product.variationCode,
        quantity: qty,
        phone,
        billersCode: billersCode?.trim(),
        requestId,
        examType: product.examType,
      }),
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

    const allProducts = await EducationProduct.find().sort({ order: 1, amount: 1 });
    let enabledProducts = allProducts.filter((product) => product.enabled);

    const syncProduct = async (product) => product.toObject();

    if (serviceConfig.clubkonnect.configured) {
      const synced = await Promise.all(allProducts.map(syncProduct));
      enabledProducts = synced.filter((product) => product.enabled);
    } else {
      enabledProducts = allProducts.filter((product) => product.enabled);
    }

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

    res.json({ success: true, data: enabledProducts, exams });
  } catch (error) {
    next(error);
  }
};

const verifyBettingCustomer = async (req, res, next) => {
  try {
    clubkonnect.assertClubkonnectConfigured();
    const { platform, customerId } = req.body;
    const bettingPlatform = await getPlatformById(platform);
    const providerServiceId = bettingPlatform?.providerServiceId || bettingPlatform?.vtpassServiceId;
    if (!providerServiceId) {
      return res.status(400).json({ success: false, message: 'This betting platform is not available' });
    }

    const result = await clubkonnect.verifyBettingCustomer({
      providerServiceId,
      platformId: bettingPlatform.platformId,
      customerId,
    });

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
    const providerServiceId = bettingPlatform?.providerServiceId || bettingPlatform?.vtpassServiceId;
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
      },
      applyPricing: false,
      providerCall: (requestId) => clubkonnect.fundBettingWallet({
        providerServiceId,
        platformId: bettingPlatform.platformId,
        customerId,
        amount,
        phone,
        requestId,
      }),
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
  body('amount').isFloat({ min: 100 }).withMessage('Invalid amount'),
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
  body('amount').isFloat({ min: 100 }).withMessage('Invalid amount'),
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
