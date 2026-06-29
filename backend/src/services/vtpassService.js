const axios = require('axios');
const crypto = require('crypto');
const serviceConfig = require('../config/serviceConfig');
const { attachVtpassLogger } = require('../utils/httpLogger');
const { logVtpass, logApiFailure } = require('../utils/logger');

/** VTpass response codes — https://vtpass.com/documentation/response-codes/ */
const VTPASS_ERROR_MESSAGES = {
  '019': 'VTpass wallet balance is insufficient',
  '021': 'VTpass account is suspended',
  '027': 'Server IP is not whitelisted on VTpass. Contact VTpass support with your server outbound IP.',
  '028': 'Product is not whitelisted on your VTpass account',
  '030': 'Duplicate request ID — transaction may already exist',
  '031': 'Invalid request ID format',
  '032': 'Invalid phone number',
  '034': 'Service ID does not exist',
  '035': 'Invalid amount',
  '040': 'Transaction could not be processed',
};

const vtpassHeaders = {
  'Content-Type': 'application/json',
  'api-key': serviceConfig.vtpass.apiKey,
};

// VTpass: GET uses public-key; POST uses secret-key (see vtpass.com/documentation/authentication)
const vtpassGetClient = attachVtpassLogger(axios.create({
  baseURL: serviceConfig.vtpass.baseUrl,
  timeout: 45000,
  headers: {
    ...vtpassHeaders,
    'public-key': serviceConfig.vtpass.publicKey,
  },
}));

const vtpassPostClient = attachVtpassLogger(axios.create({
  baseURL: serviceConfig.vtpass.baseUrl,
  timeout: 45000,
  headers: {
    ...vtpassHeaders,
    'secret-key': serviceConfig.vtpass.secretKey,
  },
}));

const generateRequestId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(6).toString('hex');
  return `${dateStr}${random}`;
};

/**
 * Extract a human-readable failure reason from a VTpass response body.
 * VTpass often returns HTTP 200 with a non-000 code (e.g. 027 IP whitelist).
 */
const extractVtpassFailureReason = (result) => {
  if (!result) return null;

  if (result.content?.errors) {
    return String(result.content.errors);
  }

  const code = String(result.code || '');
  if (code && code !== '000') {
    return VTPASS_ERROR_MESSAGES[code]
      || (result.response_description && result.response_description !== '000'
        ? result.response_description
        : `VTpass error (code ${code})`);
  }

  const desc = result.response_description;
  if (desc && desc !== '000' && String(desc).toUpperCase() !== 'TRANSACTION SUCCESSFUL') {
    return desc;
  }

  return null;
};

const handleVtpassError = (error) => {
  const data = error.response?.data;
  const message = extractVtpassFailureReason(data)
    || data?.response_description
    || data?.message
    || error.message
    || 'VTpass request failed';
  const err = new Error(message);
  err.statusCode = error.response?.status || 502;
  err.isVtpassError = true;
  err.vtpassCode = data?.code;
  err.vtpassResponse = data;
  throw err;
};

const isVtpassSuccess = (result) => {
  if (!result) return false;
  if (result.code === '000') return true;
  if (String(result.response_description || '').toUpperCase() === 'TRANSACTION SUCCESSFUL') return true;

  const status = result.content?.transactions?.status;
  return status === 'delivered' || status === 'successful';
};

const extractPurchaseDetails = (result, service) => {
  const content = result?.content || {};
  const tx = content.transactions || {};

  const details = {
    vtpassRequestId: tx.requestId || tx.unique_element || null,
    vtpassTransactionId: tx.transactionId || tx.transaction_id || null,
    productName: tx.product_name || content.product_name || null,
  };

  if (service === 'electricity') {
    details.customerName = content.Customer_Name || content.customerName || tx.customerName || null;
    details.customerAddress = content.Address || content.customerAddress || null;
    details.token = content.token || content.purchased_code || content.mainToken || null;
    details.units = content.units || content.unit || null;
  }

  if (service === 'tv') {
    details.customerName = content.Customer_Name || content.customerName || null;
    details.renewalAmount = content.renewalAmount || content.Renewal_Amount || null;
  }

  if (service === 'airtime' || service === 'data') {
    details.phone = tx.unique_element || content.phone || null;
  }

  if (service === 'education') {
    details.phone = tx.unique_element || content.phone || null;
    details.productName = tx.product_name || details.productName;
    details.purchasedCode = result.purchased_code || content.purchased_code || content.Pin || null;
    details.pins = (result.cards || content.cards || []).map((card) => ({
      serial: card.Serial || card.serial || null,
      pin: card.Pin || card.pin || null,
    }));
    if (!details.pins.length && details.purchasedCode) {
      details.pins = parseEducationPinString(details.purchasedCode);
    }
  }

  return details;
};

const parseEducationPinString = (purchasedCode) => {
  if (!purchasedCode) return [];
  return String(purchasedCode)
    .split('||')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const serialMatch = part.match(/Serial No:?\s*([^,]+)/i);
      const pinMatch = part.match(/pin:?\s*(\S+)/i);
      return {
        serial: serialMatch?.[1]?.trim() || null,
        pin: pinMatch?.[1]?.trim() || part,
      };
    });
};

const requeryTransaction = async (requestId) => {
  try {
    const response = await vtpassPostClient.post('/requery', { request_id: requestId });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const purchaseAirtime = async ({ network, phone, amount, requestId }) => {
  const serviceIds = { mtn: 'mtn', airtel: 'airtel', glo: 'glo', '9mobile': 'etisalat' };
  try {
    const response = await vtpassPostClient.post('/pay', {
      request_id: requestId || generateRequestId(),
      serviceID: serviceIds[network.toLowerCase()],
      amount,
      phone,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const getDataPlans = async (network) => {
  const serviceIds = { mtn: 'mtn-data', airtel: 'airtel-data', glo: 'glo-data', '9mobile': 'etisalat-data' };
  try {
    const response = await vtpassGetClient.get('/service-variations', {
      params: { serviceID: serviceIds[network.toLowerCase()] },
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const getTVPackages = async (provider) => {
  const serviceIds = { dstv: 'dstv', gotv: 'gotv', startimes: 'startimes' };
  try {
    const response = await vtpassGetClient.get('/service-variations', {
      params: { serviceID: serviceIds[provider.toLowerCase()] },
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const purchaseData = async ({ network, phone, variationCode, requestId }) => {
  const serviceIds = { mtn: 'mtn-data', airtel: 'airtel-data', glo: 'glo-data', '9mobile': 'etisalat-data' };
  try {
    const response = await vtpassPostClient.post('/pay', {
      request_id: requestId || generateRequestId(),
      serviceID: serviceIds[network.toLowerCase()],
      billersCode: phone,
      variation_code: variationCode,
      phone,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const payElectricity = async ({ provider, meterNumber, meterType, amount, phone, requestId }) => {
  const serviceIds = {
    ikeja: 'ikeja-electric', eko: 'eko-electric', abuja: 'abuja-electric',
    kaduna: 'kaduna-electric', kano: 'kano-electric', portharcourt: 'portharcourt-electric',
    jos: 'jos-electric', ibadan: 'ibadan-electric',
  };
  try {
    const response = await vtpassPostClient.post('/pay', {
      request_id: requestId || generateRequestId(),
      serviceID: serviceIds[provider.toLowerCase()],
      billersCode: meterNumber,
      variation_code: meterType,
      amount,
      phone,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const verifyElectricityMeter = async ({ provider, meterNumber, meterType }) => {
  const serviceIds = {
    ikeja: 'ikeja-electric', eko: 'eko-electric', abuja: 'abuja-electric',
    kaduna: 'kaduna-electric', kano: 'kano-electric', portharcourt: 'portharcourt-electric',
    jos: 'jos-electric', ibadan: 'ibadan-electric',
  };
  try {
    const response = await vtpassPostClient.post('/merchant-verify', {
      serviceID: serviceIds[provider.toLowerCase()],
      billersCode: meterNumber,
      type: meterType,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const payTV = async ({ provider, smartcardNumber, variationCode, phone, requestId }) => {
  const serviceIds = { dstv: 'dstv', gotv: 'gotv', startimes: 'startimes' };
  try {
    const response = await vtpassPostClient.post('/pay', {
      request_id: requestId || generateRequestId(),
      serviceID: serviceIds[provider.toLowerCase()],
      billersCode: smartcardNumber,
      variation_code: variationCode,
      phone,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const verifyTVSmartcard = async ({ provider, smartcardNumber }) => {
  const serviceIds = { dstv: 'dstv', gotv: 'gotv', startimes: 'startimes' };
  try {
    const response = await vtpassPostClient.post('/merchant-verify', {
      serviceID: serviceIds[provider.toLowerCase()],
      billersCode: smartcardNumber,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const purchaseEducationPin = async ({
  vtpassServiceId,
  variationCode,
  quantity = 1,
  phone,
  billersCode,
  requestId,
}) => {
  try {
    const payload = {
      request_id: requestId || generateRequestId(),
      serviceID: vtpassServiceId,
      phone,
    };

    if (variationCode) payload.variation_code = variationCode;
    if (quantity > 1) payload.quantity = quantity;
    if (billersCode) payload.billersCode = billersCode;

    const response = await vtpassPostClient.post('/pay', payload);
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const getEducationVariations = async (vtpassServiceId) => {
  try {
    const response = await vtpassGetClient.get('/service-variations', {
      params: { serviceID: vtpassServiceId },
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const fundBettingWallet = async ({ platform, customerId, amount, phone, requestId }) => {
  const serviceIds = { bet9ja: 'bet9ja', betking: 'betking', sportybet: 'sportybet', '1xbet': '1xbet' };
  try {
    const response = await vtpassPostClient.post('/pay', {
      request_id: requestId || generateRequestId(),
      serviceID: serviceIds[platform.toLowerCase()],
      billersCode: customerId,
      amount,
      phone,
    });
    return response.data;
  } catch (error) {
    handleVtpassError(error);
  }
};

const assertVtpassConfigured = () => {
  if (!serviceConfig.vtpass.apiKey || serviceConfig.vtpass.apiKey === 'dev-placeholder') {
    const error = new Error('VTpass is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
  if (!serviceConfig.vtpass.secretKey) {
    const error = new Error('VTpass secret key is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
  if (serviceConfig.isProduction && serviceConfig.vtpass.isSandbox) {
    const error = new Error('VTpass sandbox mode is not allowed in production.');
    error.statusCode = 503;
    throw error;
  }
};

/**
 * Startup connectivity check. Probes the live VTpass POST endpoint to detect
 * IP-whitelist issues before the first customer purchase fails.
 * Never throws — returns a structured status for logging.
 */
const verifyVtpassConnectivity = async () => {
  if (!serviceConfig.vtpass.configured) {
    return { ok: false, configured: false, reason: 'VTpass API keys not set' };
  }

  if (serviceConfig.isProduction && serviceConfig.vtpass.isSandbox) {
    return {
      ok: false,
      configured: true,
      mode: serviceConfig.vtpass.mode,
      reason: 'VTPASS_ENV=sandbox is not allowed when NODE_ENV=production',
    };
  }

  if (serviceConfig.isProduction && serviceConfig.vtpass.baseUrl.includes('sandbox')) {
    return {
      ok: false,
      configured: true,
      mode: serviceConfig.vtpass.mode,
      reason: 'VTPASS_BASE_URL points to sandbox in production',
    };
  }

  let serverIp = null;
  try {
    const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 8000 });
    serverIp = ipRes.data?.ip || null;
  } catch {
    // Optional — IP lookup failure should not block startup.
  }

  try {
    const response = await vtpassPostClient.post('/merchant-verify', {
      serviceID: 'dstv',
      billersCode: '0000000000',
    });
    const data = response.data;

    if (isVtpassSuccess(data)) {
      return {
        ok: true,
        configured: true,
        mode: serviceConfig.vtpass.mode,
        baseUrl: serviceConfig.vtpass.baseUrl,
        serverIp,
        purchasesEnabled: true,
      };
    }

    const reason = extractVtpassFailureReason(data) || 'VTpass POST probe failed';
    logVtpass('error', 'VTpass startup probe failed', {
      code: data?.code,
      reason,
      serverIp,
      baseUrl: serviceConfig.vtpass.baseUrl,
      response: data,
    });

    return {
      ok: false,
      configured: true,
      mode: serviceConfig.vtpass.mode,
      baseUrl: serviceConfig.vtpass.baseUrl,
      reason,
      vtpassCode: data?.code,
      serverIp,
      purchasesEnabled: false,
      ipWhitelistRequired: data?.code === '027',
    };
  } catch (error) {
    const data = error.response?.data;
    const reason = extractVtpassFailureReason(data) || error.message || 'VTpass unreachable';
    logApiFailure('vtpass:startup', error, {
      serverIp,
      baseUrl: serviceConfig.vtpass.baseUrl,
      vtpassCode: data?.code,
      upstream: data,
    });

    return {
      ok: false,
      configured: true,
      mode: serviceConfig.vtpass.mode,
      baseUrl: serviceConfig.vtpass.baseUrl,
      reason,
      vtpassCode: data?.code,
      serverIp,
      purchasesEnabled: false,
      ipWhitelistRequired: data?.code === '027',
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
  fundBettingWallet,
  requeryTransaction,
  generateRequestId,
  isVtpassSuccess,
  extractPurchaseDetails,
  extractVtpassFailureReason,
  assertVtpassConfigured,
  verifyVtpassConnectivity,
};
