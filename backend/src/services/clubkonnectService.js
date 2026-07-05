const axios = require('axios');
const crypto = require('crypto');
const serviceConfig = require('../config/serviceConfig');
const {
  resolveNetworkCode,
  resolveCableTvCode,
  resolveElectricityCode,
  resolveMeterTypeCode,
  resolveBettingCompanyCode,
} = require('../config/clubkonnectMappings');
const { attachClubkonnectLogger } = require('../utils/httpLogger');
const { logClubkonnect, logApiFailure } = require('../utils/logger');

const TERMINAL_SUCCESS = new Set(['ORDER_COMPLETED']);
const PENDING_STATUSES = new Set(['ORDER_RECEIVED', 'ORDER_ONHOLD']);
const TERMINAL_FAILURE = new Set(['ORDER_CANCELLED', 'ORDER_ERROR']);

const CLUBKONNECT_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Clubkonnect credentials are invalid',
  MISSING_CREDENTIALS: 'Clubkonnect credentials are missing',
  INSUFFICIENT_BALANCE: 'Clubkonnect wallet balance is insufficient',
  INVALID_RECIPIENT: 'Invalid phone number or customer ID',
  INVALID_METERNO: 'Invalid meter number',
  INVALID_SMARTCARDNO: 'Invalid smartcard number',
};

const apiClient = attachClubkonnectLogger(axios.create({
  baseURL: serviceConfig.clubkonnect.baseUrl,
  timeout: 45000,
  validateStatus: (status) => status >= 200 && status < 500,
}));

const generateRequestId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(6).toString('hex');
  return `${dateStr}${random}`;
};

const parseResponseBody = (data) => {
  if (!data) return null;
  if (typeof data === 'object') return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { status: 'ORDER_ERROR', message: data };
    }
  }
  return null;
};

const withAuth = async (endpoint, params = {}) => {
  const response = await apiClient.get(`/${endpoint}`, {
    params: {
      UserID: serviceConfig.clubkonnect.userId,
      APIKey: serviceConfig.clubkonnect.apiKey,
      ...params,
    },
  });
  return parseResponseBody(response.data);
};

const extractProviderFailureReason = (result) => {
  if (!result) return null;
  const remark = result.remark || result.description || result.message;
  if (remark && CLUBKONNECT_ERROR_MESSAGES[remark]) {
    return CLUBKONNECT_ERROR_MESSAGES[remark];
  }
  if (remark) return String(remark);
  const status = String(result.status || '').toUpperCase();
  if (status.includes('ERROR')) return result.description || status.replace(/_/g, ' ').toLowerCase();
  return null;
};

const resolvePurchaseOutcome = (result) => {
  if (!result) return { outcome: 'failed', pending: false };
  const status = String(result.status || '').toUpperCase();
  if (TERMINAL_SUCCESS.has(status) || String(result.statuscode) === '200') {
    return { outcome: 'success', pending: false };
  }
  if (PENDING_STATUSES.has(status) || String(result.statuscode) === '100') {
    return { outcome: 'pending', pending: true };
  }
  if (TERMINAL_FAILURE.has(status) || status.includes('ERROR')) {
    return { outcome: 'failed', pending: false };
  }
  return { outcome: 'failed', pending: false };
};

const isProviderSuccess = (result) => resolvePurchaseOutcome(result).outcome === 'success';

const isProviderPending = (result) => resolvePurchaseOutcome(result).outcome === 'pending';

const handleProviderError = (error, fallback = 'Clubkonnect request failed') => {
  const data = parseResponseBody(error.response?.data);
  const message = extractProviderFailureReason(data) || data?.message || error.message || fallback;
  const err = new Error(message);
  err.statusCode = error.response?.status || 502;
  err.isProviderError = true;
  err.providerResponse = data;
  throw err;
};

const extractPurchaseDetails = (result, service) => {
  const details = {
    providerRequestId: result?.requestid || result?.RequestID || null,
    providerOrderId: result?.orderid || result?.orderId || result?.OrderID || null,
    productName: result?.ordertype || result?.product_name || null,
  };

  if (service === 'electricity') {
    details.customerName = result?.customer_name || result?.customerName || null;
    details.customerAddress = result?.address || result?.customerAddress || null;
    details.token = result?.token || result?.metertoken || result?.purchased_code || null;
    details.units = result?.units || result?.unit || null;
  }

  if (service === 'tv') {
    details.customerName = result?.customer_name || result?.customerName || null;
    details.renewalAmount = result?.renewal_amount || result?.renewalAmount || null;
  }

  if (service === 'airtime' || service === 'data') {
    details.phone = result?.mobilenumber || result?.mobileNumber || null;
  }

  if (service === 'education') {
    details.purchasedCode = result?.pin || result?.purchased_code || result?.Pin || null;
    details.pins = [];
    if (details.purchasedCode) {
      details.pins = String(details.purchasedCode)
        .split('||')
        .map((part) => ({ serial: null, pin: part.trim() }))
        .filter((item) => item.pin);
    }
  }

  return details;
};

const requeryTransaction = async (requestOrOrderId) => {
  try {
    const byRequest = await withAuth('APIQueryV1.asp', { RequestID: requestOrOrderId });
    if (byRequest?.status) return byRequest;
    return withAuth('APIQueryV1.asp', { OrderID: requestOrOrderId });
  } catch (error) {
    handleProviderError(error);
  }
};

const cancelTransaction = async (orderId) => {
  try {
    return await withAuth('APICancelV1.asp', { OrderID: orderId });
  } catch (error) {
    handleProviderError(error);
  }
};

const purchaseAirtime = async ({ network, phone, amount, requestId }) => {
  const mobileNetwork = resolveNetworkCode(network);
  if (!mobileNetwork) {
    const error = new Error('Unsupported mobile network');
    error.statusCode = 400;
    throw error;
  }
  try {
    return await withAuth('APIAirtimeV1.asp', {
      MobileNetwork: mobileNetwork,
      Amount: amount,
      MobileNumber: phone,
      RequestID: requestId || generateRequestId(),
    });
  } catch (error) {
    handleProviderError(error);
  }
};

const getDataPlans = async (network) => {
  try {
    const allPlans = await withAuth('APIDatabundlePlansV1.asp');
    const networkKey = String(network || '').toLowerCase();
    const networkMap = {
      mtn: ['MTN', 'mtn'],
      glo: ['GLO', 'glo'],
      airtel: ['Airtel', 'airtel', 'AIRTEL'],
      '9mobile': ['9mobile', 'Etisalat', 'etisalat', '9Mobile'],
    };
    const keys = networkMap[networkKey] || [networkKey];
    const variations = [];

    if (Array.isArray(allPlans)) {
      allPlans.forEach((plan) => variations.push(plan));
    } else if (allPlans && typeof allPlans === 'object') {
      for (const key of keys) {
        const bucket = allPlans[key] || allPlans[key.toUpperCase()] || allPlans[key.toLowerCase()];
        if (Array.isArray(bucket)) variations.push(...bucket);
      }
      if (!variations.length) {
        Object.values(allPlans).forEach((bucket) => {
          if (Array.isArray(bucket)) variations.push(...bucket);
        });
      }
    }

    return {
      content: {
        variations: variations.map((plan) => ({
          variation_code: plan.planid || plan.PlanID || plan.code || plan.id || plan.DataPlan,
          name: plan.planname || plan.PlanName || plan.name || plan.description,
          variation_amount: String(plan.price || plan.amount || plan.Amount || plan.cost || 0),
        })),
      },
    };
  } catch (error) {
    handleProviderError(error);
  }
};

const purchaseData = async ({ network, phone, variationCode, requestId }) => {
  const mobileNetwork = resolveNetworkCode(network);
  if (!mobileNetwork) {
    const error = new Error('Unsupported mobile network');
    error.statusCode = 400;
    throw error;
  }
  try {
    return await withAuth('APIDatabundleV1.asp', {
      MobileNetwork: mobileNetwork,
      DataPlan: variationCode,
      MobileNumber: phone,
      RequestID: requestId || generateRequestId(),
    });
  } catch (error) {
    handleProviderError(error);
  }
};

const getTVPackages = async (provider) => {
  try {
    const packagesData = await withAuth('APICableTVPackagesV2.asp');
    const providerCode = resolveCableTvCode(provider);
    const packages = [];

    const normalizePackage = (pkg) => ({
      variation_code: pkg.package || pkg.Package || pkg.code || pkg.planid || pkg.name,
      name: pkg.name || pkg.package || pkg.Package || pkg.planname,
      variation_amount: String(pkg.price || pkg.amount || pkg.Amount || pkg.cost || 0),
    });

    if (Array.isArray(packagesData)) {
      packages.push(...packagesData.map(normalizePackage));
    } else if (packagesData && typeof packagesData === 'object') {
      const bucket = packagesData[providerCode]
        || packagesData[String(provider || '').toLowerCase()]
        || packagesData[provider];
      if (Array.isArray(bucket)) {
        packages.push(...bucket.map(normalizePackage));
      } else {
        Object.entries(packagesData).forEach(([key, bucketItems]) => {
          if (!Array.isArray(bucketItems)) return;
          if (providerCode && key.toLowerCase() !== String(providerCode).toLowerCase()
            && key.toLowerCase() !== String(provider || '').toLowerCase()) return;
          packages.push(...bucketItems.map(normalizePackage));
        });
      }
    }

    return { content: { variations: packages } };
  } catch (error) {
    handleProviderError(error);
  }
};

const payTV = async ({ provider, smartcardNumber, variationCode, phone, requestId }) => {
  const cableTv = resolveCableTvCode(provider);
  if (!cableTv) {
    const error = new Error('Unsupported TV provider');
    error.statusCode = 400;
    throw error;
  }
  try {
    return await withAuth('APICableTVV1.asp', {
      CableTV: cableTv,
      MeterType: variationCode,
      SmartCardNo: smartcardNumber,
      MobileNumber: phone || '',
      RequestID: requestId || generateRequestId(),
    });
  } catch (error) {
    handleProviderError(error);
  }
};

const verifyTVSmartcard = async ({ provider, smartcardNumber }) => {
  const cableTv = resolveCableTvCode(provider);
  if (!cableTv) {
    const error = new Error('Unsupported TV provider');
    error.statusCode = 400;
    throw error;
  }
  try {
    const result = await withAuth('APIVerifyCableTVV1.0.asp', {
      CableTV: cableTv,
      SmartCardNo: smartcardNumber,
    });
    return {
      code: result?.customer_name === 'INVALID_SMARTCARDNO' ? '040' : '000',
      content: {
        Customer_Name: result?.customer_name || result?.customerName,
        Current_Bouquet: result?.current_bouquet || result?.bouquet,
        Renewal_Amount: result?.renewal_amount || result?.amount,
        Customer_Number: smartcardNumber,
      },
    };
  } catch (error) {
    handleProviderError(error);
  }
};

const payElectricity = async ({
  provider,
  serviceId,
  meterNumber,
  meterType,
  amount,
  phone,
  requestId,
}) => {
  const electricCompany = resolveElectricityCode(provider, serviceId);
  const meterTypeCode = resolveMeterTypeCode(meterType);
  if (!electricCompany || !meterTypeCode) {
    const error = new Error('Unknown electricity provider or meter type');
    error.statusCode = 400;
    throw error;
  }
  try {
    return await withAuth('APIElectricityV1.asp', {
      ElectricCompany: electricCompany,
      MeterNo: meterNumber,
      Amount: amount,
      MeterType: meterTypeCode,
      MobileNumber: phone || '',
      RequestID: requestId || generateRequestId(),
    });
  } catch (error) {
    handleProviderError(error);
  }
};

const verifyElectricityMeter = async ({ provider, serviceId, meterNumber, meterType }) => {
  const electricCompany = resolveElectricityCode(provider, serviceId);
  if (!electricCompany) {
    const error = new Error('Unknown electricity provider');
    error.statusCode = 400;
    throw error;
  }
  try {
    const result = await withAuth('APIVerifyElectricityV1.asp', {
      ElectricCompany: electricCompany,
      MeterNo: meterNumber,
      MeterType: resolveMeterTypeCode(meterType) || '01',
    });
    return {
      code: result?.customer_name === 'INVALID_METERNO' ? '040' : '000',
      content: {
        Customer_Name: result?.customer_name || result?.customerName,
        Address: result?.address || result?.customerAddress,
        Meter_Number: meterNumber,
        Min_Purchase_Amount: result?.minimum_amount || result?.minamount,
      },
    };
  } catch (error) {
    handleProviderError(error);
  }
};

const purchaseEducationPin = async ({
  providerServiceId,
  variationCode,
  quantity = 1,
  phone,
  billersCode,
  requestId,
  examType,
}) => {
  const reqId = requestId || generateRequestId();
  const type = String(examType || providerServiceId || '').toLowerCase();

  try {
    if (type === 'waec') {
      return await withAuth('APIWAECV1.asp', {
        Quantity: quantity,
        MobileNumber: phone || '',
        RequestID: reqId,
        Product: variationCode || 'WAEC',
      });
    }
    if (type === 'jamb') {
      return await withAuth('APIJAMBV1.asp', {
        ProfileID: billersCode,
        Product: variationCode || providerServiceId,
        MobileNumber: phone || '',
        RequestID: reqId,
      });
    }
    if (type === 'neco') {
      return await withAuth('APINECOV1.asp', {
        Quantity: quantity,
        MobileNumber: phone || '',
        RequestID: reqId,
      });
    }

    const error = new Error('Unsupported education product');
    error.statusCode = 400;
    throw error;
  } catch (error) {
    if (error.statusCode) throw error;
    handleProviderError(error);
  }
};

const getEducationVariations = async () => null;

const verifyBettingCustomer = async ({ providerServiceId, platformId, customerId }) => {
  const bettingCompany = resolveBettingCompanyCode(platformId, providerServiceId);
  if (!bettingCompany) {
    const error = new Error('Betting platform is not configured');
    error.statusCode = 400;
    throw error;
  }
  try {
    const result = await withAuth('APIVerifyBettingV1.asp', {
      BettingCompany: bettingCompany,
      CustomerID: customerId,
    });
    return {
      code: result?.customer_name === 'INVALID_CUSTOMERID' ? '040' : '000',
      content: {
        Customer_Name: result?.customer_name || result?.customerName,
        customerName: result?.customer_name || result?.customerName,
      },
    };
  } catch (error) {
    handleProviderError(error);
  }
};

const fundBettingWallet = async ({
  providerServiceId,
  platformId,
  customerId,
  amount,
  phone,
  requestId,
}) => {
  const bettingCompany = resolveBettingCompanyCode(platformId, providerServiceId);
  if (!bettingCompany) {
    const error = new Error('Betting platform is not configured on the payment provider');
    error.statusCode = 503;
    throw error;
  }
  try {
    return await withAuth('APIBettingV1.asp', {
      BettingCompany: bettingCompany,
      CustomerID: customerId,
      Amount: amount,
      MobileNumber: phone,
      RequestID: requestId || generateRequestId(),
    });
  } catch (error) {
    handleProviderError(error);
  }
};

const getWalletBalance = async () => withAuth('APIWalletBalanceV1.asp');

const assertClubkonnectConfigured = () => {
  if (!serviceConfig.clubkonnect.userId || serviceConfig.clubkonnect.userId === 'dev-placeholder') {
    const error = new Error('Clubkonnect is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
  if (!serviceConfig.clubkonnect.apiKey) {
    const error = new Error('Clubkonnect API key is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
};

const verifyClubkonnectConnectivity = async () => {
  if (!serviceConfig.clubkonnect.configured) {
    return { ok: false, configured: false, reason: 'Clubkonnect credentials not set' };
  }

  let serverIp = null;
  try {
    const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 8000 });
    serverIp = ipRes.data?.ip || null;
  } catch {
    // Optional
  }

  try {
    const balance = await getWalletBalance();
    const status = String(balance?.status || '').toUpperCase();
    if (status && !status.includes('ERROR')) {
      return {
        ok: true,
        configured: true,
        baseUrl: serviceConfig.clubkonnect.baseUrl,
        serverIp,
        purchasesEnabled: true,
        balance: balance?.balance || null,
      };
    }

    const reason = extractProviderFailureReason(balance) || 'Clubkonnect wallet probe failed';
    logClubkonnect('error', 'Clubkonnect startup probe failed', { reason, serverIp, response: balance });

    return {
      ok: false,
      configured: true,
      baseUrl: serviceConfig.clubkonnect.baseUrl,
      reason,
      serverIp,
      purchasesEnabled: false,
      ipWhitelistRequired: reason.toLowerCase().includes('ip'),
    };
  } catch (error) {
    const reason = error.message || 'Clubkonnect unreachable';
    logApiFailure('clubkonnect:startup', error, { serverIp });
    return {
      ok: false,
      configured: true,
      baseUrl: serviceConfig.clubkonnect.baseUrl,
      reason,
      serverIp,
      purchasesEnabled: false,
    };
  }
};

module.exports = {
  purchaseAirtime,
  getDataPlans,
  getTVPackages,
  purchaseData,
  payElectricity,
  verifyElectricityMeter,
  payTV,
  verifyTVSmartcard,
  purchaseEducationPin,
  getEducationVariations,
  verifyBettingCustomer,
  fundBettingWallet,
  requeryTransaction,
  cancelTransaction,
  getWalletBalance,
  generateRequestId,
  isProviderSuccess,
  isProviderPending,
  resolvePurchaseOutcome,
  extractPurchaseDetails,
  extractProviderFailureReason,
  assertClubkonnectConfigured,
  verifyClubkonnectConnectivity,
};
