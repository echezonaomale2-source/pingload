const clubkonnect = require('./clubkonnectService');
const vtpass = require('./vtpassService');
const SystemSettings = require('../models/SystemSettings');
const serviceConfig = require('../config/serviceConfig');

let cachedName = null;
let cacheExpiry = 0;

const invalidateProviderCache = () => {
  cachedName = null;
  cacheExpiry = 0;
};

const getActiveProviderName = async () => {
  if (cachedName && Date.now() < cacheExpiry) return cachedName;
  const settings = await SystemSettings.getSettings();
  cachedName = settings.vtuProvider === 'vtpass' ? 'vtpass' : 'clubkonnect';
  cacheExpiry = Date.now() + 5000;
  return cachedName;
};

const isProviderConfigured = (name) => (
  name === 'vtpass' ? serviceConfig.vtpass.configured : serviceConfig.clubkonnect.configured
);

const assertActiveProviderConfigured = async () => {
  const name = await getActiveProviderName();
  if (name === 'vtpass') {
    vtpass.assertVtpassConfigured();
    return;
  }
  clubkonnect.assertClubkonnectConfigured();
};

const resolvePurchaseOutcome = async (result) => {
  const name = await getActiveProviderName();
  if (name === 'vtpass') {
    if (vtpass.isVtpassSuccess(result)) return { outcome: 'success', pending: false };
    const txStatus = result?.content?.transactions?.status;
    if (txStatus === 'pending' || result?.code === '099') {
      return { outcome: 'pending', pending: true };
    }
    return { outcome: 'failed', pending: false };
  }
  return clubkonnect.resolvePurchaseOutcome(result);
};

const extractProviderFailureReason = async (result) => {
  const name = await getActiveProviderName();
  if (name === 'vtpass') return vtpass.extractVtpassFailureReason(result);
  return clubkonnect.extractProviderFailureReason(result);
};

const extractPurchaseDetails = async (result, service) => {
  const name = await getActiveProviderName();
  if (name === 'vtpass') {
    const details = vtpass.extractPurchaseDetails(result, service);
    return {
      ...details,
      providerRequestId: details.vtpassRequestId || details.providerRequestId || null,
      providerOrderId: details.vtpassTransactionId || details.providerOrderId || null,
    };
  }
  return clubkonnect.extractPurchaseDetails(result, service);
};

const generateRequestId = () => clubkonnect.generateRequestId();

const getProviderStatus = async () => ({
  active: await getActiveProviderName(),
  clubkonnect: {
    configured: serviceConfig.clubkonnect.configured,
    baseUrl: serviceConfig.clubkonnect.baseUrl,
  },
  vtpass: {
    configured: serviceConfig.vtpass.configured,
    mode: serviceConfig.vtpass.mode,
    baseUrl: serviceConfig.vtpass.baseUrl,
  },
});

const purchaseAirtime = async (params) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.purchaseAirtime(params)
    : clubkonnect.purchaseAirtime(params);
};

const getDataPlans = async (network) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.getDataPlans(network)
    : clubkonnect.getDataPlans(network);
};

const purchaseData = async (params) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.purchaseData(params)
    : clubkonnect.purchaseData(params);
};

const payElectricity = async (params) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.payElectricity(params)
    : clubkonnect.payElectricity(params);
};

const verifyElectricityMeter = async (params) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.verifyElectricityMeter(params)
    : clubkonnect.verifyElectricityMeter(params);
};

const getTVPackages = async (provider) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.getTVPackages(provider)
    : clubkonnect.getTVPackages(provider);
};

const verifyTVSmartcard = async (params) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.verifyTVSmartcard(params)
    : clubkonnect.verifyTVSmartcard(params);
};

const payTV = async (params) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.payTV(params)
    : clubkonnect.payTV(params);
};

const purchaseEducationPin = async (params) => {
  const name = await getActiveProviderName();
  if (name === 'vtpass') {
    return vtpass.purchaseEducationPin({
      vtpassServiceId: params.serviceId || params.vtpassServiceId || params.providerServiceId,
      variationCode: params.variationCode,
      billersCode: params.billersCode,
      phone: params.phone,
      quantity: params.quantity,
      requestId: params.requestId,
    });
  }
  return clubkonnect.purchaseEducationPin(params);
};

const getEducationVariations = async (serviceId) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.getEducationVariations(serviceId)
    : null;
};

const verifyBettingCustomer = async (params) => {
  const name = await getActiveProviderName();
  const serviceId = params.serviceId || params.providerServiceId || params.vtpassServiceId;
  if (name === 'vtpass') {
    return vtpass.verifyBettingCustomer({ vtpassServiceId: serviceId, customerId: params.customerId });
  }
  return clubkonnect.verifyBettingCustomer({
    providerServiceId: serviceId,
    platformId: params.platformId,
    customerId: params.customerId,
  });
};

const fundBettingWallet = async (params) => {
  const name = await getActiveProviderName();
  const serviceId = params.serviceId || params.providerServiceId || params.vtpassServiceId;
  if (name === 'vtpass') {
    return vtpass.fundBettingWallet({
      vtpassServiceId: serviceId,
      customerId: params.customerId,
      amount: params.amount,
      phone: params.phone,
      requestId: params.requestId,
    });
  }
  return clubkonnect.fundBettingWallet({
    providerServiceId: serviceId,
    platformId: params.platformId,
    customerId: params.customerId,
    amount: params.amount,
    phone: params.phone,
    requestId: params.requestId,
  });
};

const requeryTransaction = async (requestId) => {
  const name = await getActiveProviderName();
  return name === 'vtpass'
    ? vtpass.requeryTransaction(requestId)
    : clubkonnect.queryTransaction(requestId);
};

module.exports = {
  getActiveProviderName,
  invalidateProviderCache,
  isProviderConfigured,
  assertActiveProviderConfigured,
  resolvePurchaseOutcome,
  extractProviderFailureReason,
  extractPurchaseDetails,
  generateRequestId,
  getProviderStatus,
  purchaseAirtime,
  getDataPlans,
  purchaseData,
  payElectricity,
  verifyElectricityMeter,
  getTVPackages,
  verifyTVSmartcard,
  payTV,
  purchaseEducationPin,
  getEducationVariations,
  verifyBettingCustomer,
  fundBettingWallet,
  requeryTransaction,
  verifyClubkonnectConnectivity: clubkonnect.verifyClubkonnectConnectivity,
  verifyVtpassConnectivity: vtpass.verifyVtpassConnectivity,
};
