const clubkonnect = require('./clubkonnectService');
const vtpass = require('./vtpassService');
const serviceConfig = require('../config/serviceConfig');
const routing = require('./vtuRoutingService');
const { normalizeProvider } = require('../utils/migrateVtuSettings');

const resolveProvider = (name) => normalizeProvider(name);

const assertProviderConfigured = (name) => {
  const provider = resolveProvider(name);
  if (!routing.isProviderConfigured(provider)) {
    const error = new Error(
      `${provider === 'vtpass' ? 'VTpass' : 'Clubkonnect'} is not configured on the server`
    );
    error.statusCode = 503;
    throw error;
  }
  if (provider === 'vtpass') vtpass.assertVtpassConfigured();
  else clubkonnect.assertClubkonnectConfigured();
};

const assertActiveProviderConfigured = async (serviceId = 'data') => {
  const name = await routing.getRoutedProviderName(serviceId);
  assertProviderConfigured(name);
};

const resolvePurchaseOutcome = (result, providerName) => {
  const name = resolveProvider(providerName);
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

const extractProviderFailureReason = (result, providerName) => {
  const name = resolveProvider(providerName);
  if (name === 'vtpass') return vtpass.extractVtpassFailureReason(result);
  return clubkonnect.extractProviderFailureReason(result);
};

const extractPurchaseDetails = (result, service, providerName) => {
  const name = resolveProvider(providerName);
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

const getProviderStatus = async () => {
  const snapshot = await routing.getRoutingSnapshot();
  const active = await routing.getRoutedProviderName('airtime');
  const preferred = snapshot.serviceRouting.airtime;
  return {
    preferred,
    active,
    usingFallback: preferred !== active,
    dataProviderEnabled: snapshot.dataProviderEnabled,
    providerEnabled: snapshot.dataProviderEnabled,
    serviceRouting: snapshot.serviceRouting,
    enableProviderFailover: snapshot.enableProviderFailover,
    catalogVersion: snapshot.catalogVersion,
    clubkonnect: {
      configured: serviceConfig.clubkonnect.configured,
      baseUrl: serviceConfig.clubkonnect.baseUrl,
      enabled: snapshot.dataProviderEnabled?.clubkonnect !== false,
      dataEnabled: snapshot.dataProviderEnabled?.clubkonnect !== false,
    },
    vtpass: {
      configured: serviceConfig.vtpass.configured,
      mode: serviceConfig.vtpass.mode,
      baseUrl: serviceConfig.vtpass.baseUrl,
      enabled: snapshot.dataProviderEnabled?.vtpass !== false,
      dataEnabled: snapshot.dataProviderEnabled?.vtpass !== false,
    },
  };
};

const purchaseAirtime = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
  return name === 'vtpass'
    ? vtpass.purchaseAirtime(params)
    : clubkonnect.purchaseAirtime(params);
};

const getDataPlans = async (network, providerName) => {
  const name = resolveProvider(providerName);
  return name === 'vtpass'
    ? vtpass.getDataPlans(network)
    : clubkonnect.getDataPlans(network);
};

const purchaseData = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
  return name === 'vtpass'
    ? vtpass.purchaseData(params)
    : clubkonnect.purchaseData(params);
};

const payElectricity = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
  return name === 'vtpass'
    ? vtpass.payElectricity(params)
    : clubkonnect.payElectricity(params);
};

const verifyElectricityMeter = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
  return name === 'vtpass'
    ? vtpass.verifyElectricityMeter(params)
    : clubkonnect.verifyElectricityMeter(params);
};

const getTVPackages = async (provider, providerName) => {
  const name = resolveProvider(providerName);
  return name === 'vtpass'
    ? vtpass.getTVPackages(provider)
    : clubkonnect.getTVPackages(provider);
};

const verifyTVSmartcard = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
  return name === 'vtpass'
    ? vtpass.verifyTVSmartcard(params)
    : clubkonnect.verifyTVSmartcard(params);
};

const payTV = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
  return name === 'vtpass'
    ? vtpass.payTV(params)
    : clubkonnect.payTV(params);
};

const purchaseEducationPin = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
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

const getEducationVariations = async (serviceId, providerName) => {
  const name = resolveProvider(providerName);
  return name === 'vtpass'
    ? vtpass.getEducationVariations(serviceId)
    : null;
};

const verifyBettingCustomer = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
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

const fundBettingWallet = async (params, providerName) => {
  const name = resolveProvider(providerName || params.providerName);
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

const requeryTransaction = async (requestId, providerName) => {
  const name = resolveProvider(providerName);
  return name === 'vtpass'
    ? vtpass.requeryTransaction(requestId)
    : clubkonnect.queryTransaction(requestId);
};

module.exports = {
  getActiveProviderName: routing.getActiveProviderName,
  getSelectedProviderName: routing.getSelectedProviderName,
  getRoutedProviderName: routing.getRoutedProviderName,
  getDataCatalogProviders: routing.getDataCatalogProviders,
  getCatalogProviders: routing.getCatalogProviders,
  isDataProviderEnabled: routing.isDataProviderEnabled,
  invalidateProviderCache: routing.invalidateRoutingCache,
  isProviderConfigured: routing.isProviderConfigured,
  assertActiveProviderConfigured,
  assertProviderConfigured,
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
