const { body } = require('express-validator');
const DataPlan = require('../models/DataPlan');
const EducationProduct = require('../models/EducationProduct');
const serviceConfig = require('../config/serviceConfig');
const vtpass = require('../services/vtpassService');
const assertServiceEnabled = require('../utils/assertServiceEnabled');
const {
  executeVtuPurchase,
  formatTransactionPayload,
} = require('../services/vtuPurchaseService');
const verifyTransactionPin = require('../utils/verifyTransactionPin');

/** VTpass sometimes returns duplicate variation_code entries — keep first of each. */
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
    await verifyTransactionPin(req.user._id, pin);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'airtime',
      amount,
      description: `Airtime purchase: ₦${amount} for ${phone} (${network})`,
      metadata: { network, phone },
      vtpassCall: (requestId) => vtpass.purchaseAirtime({ network, phone, amount, requestId }),
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

    // In VTpass sandbox, use live VTpass variation codes so purchases succeed
    if (serviceConfig.vtpass.isSandbox && serviceConfig.vtpass.configured) {
      try {
        const result = await vtpass.getDataPlans(network);
        const variations = dedupeByCode(result.content?.variations || [], 'variation_code');
        if (variations.length > 0) {
          return res.json({ success: true, data: variations, source: 'vtpass' });
        }
      } catch (vtpassError) {
        // Fall through to local admin plans
      }
    }

    const localPlans = await DataPlan.find({ network, enabled: true }).sort({ order: 1, amount: 1 });

    if (localPlans.length > 0) {
      return res.json({
        success: true,
        data: localPlans.map((p) => ({
          variation_code: p.variationCode,
          name: p.name,
          variation_amount: String(p.amount),
          dataSize: p.dataSize,
          validity: p.validity,
        })),
        source: 'local',
      });
    }

    const result = await vtpass.getDataPlans(network);
    const variations = dedupeByCode(result.content?.variations || [], 'variation_code');
    res.json({ success: true, data: variations, source: 'vtpass' });
  } catch (error) {
    next(error);
  }
};

const buyData = async (req, res, next) => {
  try {
    await assertServiceEnabled('data');
    const { network, phone, variationCode, amount, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'data',
      amount,
      description: `Data purchase for ${phone} (${network})`,
      metadata: { network, phone, variationCode },
      vtpassCall: (requestId) => vtpass.purchaseData({ network, phone, variationCode, requestId }),
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

const payElectricity = async (req, res, next) => {
  try {
    await assertServiceEnabled('electricity');
    const { provider, meterNumber, meterType, amount, phone, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'electricity',
      amount,
      description: `Electricity bill: ₦${amount} for meter ${meterNumber}`,
      metadata: { provider, meterNumber, meterType, phone },
      vtpassCall: (requestId) => vtpass.payElectricity({
        provider, meterNumber, meterType, amount, phone, requestId,
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

const verifyElectricityMeter = async (req, res, next) => {
  try {
    vtpass.assertVtpassConfigured();
    const { provider, meterNumber, meterType } = req.body;
    const result = await vtpass.verifyElectricityMeter({ provider, meterNumber, meterType });

    res.json({
      success: true,
      data: {
        customerName: result.content?.Customer_Name || result.content?.customerName,
        customerAddress: result.content?.Address || result.content?.customerAddress,
        meterNumber: result.content?.Meter_Number || meterNumber,
        minimumAmount: result.content?.Min_Purchase_Amount || result.content?.minimium_amount,
        raw: result.content,
      },
    });
  } catch (error) {
    next(error);
  }
};

const fetchTVPackages = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const result = await vtpass.getTVPackages(provider);
    const packages = dedupeByCode(
      (result.content?.variations || []).map((pkg) => ({
        code: pkg.variation_code,
        name: pkg.name,
        amount: parseFloat(pkg.variation_amount),
      })),
      'code'
    );

    res.json({ success: true, data: packages });
  } catch (error) {
    next(error);
  }
};

const verifyTVSmartcard = async (req, res, next) => {
  try {
    vtpass.assertVtpassConfigured();
    const { provider, smartcardNumber } = req.body;
    const result = await vtpass.verifyTVSmartcard({ provider, smartcardNumber });

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
    await verifyTransactionPin(req.user._id, pin);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'tv',
      amount,
      description: `TV subscription: ${provider} for ${smartcardNumber}`,
      metadata: { provider, smartcardNumber, variationCode, phone },
      vtpassCall: (requestId) => vtpass.payTV({
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
    await verifyTransactionPin(req.user._id, pin);

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
      vtpassCall: (requestId) => vtpass.purchaseEducationPin({
        vtpassServiceId: product.vtpassServiceId,
        variationCode: product.variationCode,
        quantity: qty,
        phone,
        billersCode: billersCode?.trim(),
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

const fetchEducationProducts = async (req, res, next) => {
  try {
    await assertServiceEnabled('education');
    await EducationProduct.ensureDefaults();

    const allProducts = await EducationProduct.find().sort({ order: 1, amount: 1 });
    let enabledProducts = allProducts.filter((product) => product.enabled);

    const syncProduct = async (product) => {
      if (!serviceConfig.vtpass.configured) return product.toObject();

      try {
        const vtpassData = await vtpass.getEducationVariations(product.vtpassServiceId);
        const variations = vtpassData.content?.variations || [];
        const match = variations.find((item) => item.variation_code === product.variationCode)
          || variations[0];

        if (match) {
          if (product.examType === 'neco' && !product.enabled) {
            await EducationProduct.findByIdAndUpdate(product._id, {
              enabled: true,
              variationCode: match.variation_code,
              amount: parseFloat(match.variation_amount),
            });
            product.enabled = true;
            product.variationCode = match.variation_code;
            product.amount = parseFloat(match.variation_amount);
          }

          return {
            ...product.toObject(),
            amount: parseFloat(match.variation_amount),
            vtpassName: match.name,
            source: 'vtpass',
          };
        }
      } catch {
        // VTpass service unavailable for this product
      }

      return product.toObject();
    };

    if (serviceConfig.vtpass.configured) {
      const synced = await Promise.all(allProducts.map(syncProduct));
      enabledProducts = synced.filter((product) => product.enabled);
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

const fundBetting = async (req, res, next) => {
  try {
    await assertServiceEnabled('betting');
    const { platform, customerId, amount, phone, pin } = req.body;
    await verifyTransactionPin(req.user._id, pin);

    const result = await executeVtuPurchase({
      userId: req.user._id,
      service: 'betting',
      amount,
      description: `Betting wallet: ₦${amount} to ${platform}`,
      metadata: { platform, customerId, phone },
      applyPricing: false,
      vtpassCall: (requestId) => vtpass.fundBettingWallet({ platform, customerId, amount, phone, requestId }),
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

const bettingValidation = [
  body('platform').isIn(['bet9ja', 'betking', 'sportybet', '1xbet']).withMessage('Invalid betting platform'),
  body('customerId').trim().notEmpty().withMessage('Customer ID is required'),
  body('amount').isFloat({ min: 100 }).withMessage('Minimum betting funding is ₦100'),
  body('phone').matches(/^0[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number'),
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
  fundBetting,
  airtimeValidation,
  dataValidation,
  electricityValidation,
  electricityVerifyValidation,
  tvValidation,
  tvVerifyValidation,
  educationValidation,
  bettingValidation,
};
