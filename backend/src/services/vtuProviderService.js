const vtpass = require('./vtpassService');
const serviceConfig = require('../config/serviceConfig');
const routing = require('./vtuRoutingService');

const assertProviderConfigured = () => {
  if (!routing.isProviderConfigured()) {
    const error = new Error('VTpass is not configured on the server');
    error.statusCode = 503;
    throw error;
  }
  vtpass.assertVtpassConfigured();
};

const assertActiveProviderConfigured = async () => {
  assertProviderConfigured();
};

const resolvePurchaseOutcome = (result) => {
  if (vtpass.isVtpassSuccess(result)) return { outcome: 'success', pending: false };
  const txStatus = result?.content?.transactions?.status;
  if (txStatus === 'pending' || result?.code === '099') {
    return { outcome: 'pending', pending: true };
  }
  return { outcome: 'failed', pending: false };
};

const extractProviderFailureReason = (result) => vtpass.extractVtpassFailureReason(result);

const extractPurchaseDetails = (result, service) => {
  const details = vtpass.extractPurchaseDetails(result, service);
  return {
    ...details,
    providerRequestId: details.vtpassRequestId || details.providerRequestId || null,
    providerOrderId: details.vtpassTransactionId || details.providerOrderId || null,
  };
};

const generateRequestId = () => vtpass.generateRequestId();

const getProviderStatus = async () => {
  const snapshot = await routing.getRoutingSnapshot();
  return {
    preferred: 'vtpass',
    active: 'vtpass',
    usingFallback: false,
    dataProviderEnabled: snapshot.dataProviderEnabled,
    providerEnabled: snapshot.dataProviderEnabled,
    serviceRouting: snapshot.serviceRouting,
    enableProviderFailover: false,
    catalogVersion: snapshot.catalogVersion,
    vtpass: {
      configured: serviceConfig.vtpass.configured,
      mode: serviceConfig.vtpass.mode,
      baseUrl: serviceConfig.vtpass.baseUrl,
      enabled: snapshot.dataProviderEnabled?.vtpass !== false,
      dataEnabled: snapshot.dataProviderEnabled?.vtpass !== false,
    },
  };
};

const purchaseAirtime = async (params) => vtpass.purchaseAirtime(params);

const getDataPlans = async (network) => vtpass.getDataPlans(network);

const purchaseData = async (params) => vtpass.purchaseData(params);

const payElectricity = async (params) => vtpass.payElectricity(params);

const verifyElectricityMeter = async (params) => vtpass.verifyElectricityMeter(params);

const getTVPackages = async (provider) => vtpass.getTVPackages(provider);

const verifyTVSmartcard = async (params) => vtpass.verifyTVSmartcard(params);

const payTV = async (params) => vtpass.payTV(params);

const purchaseEducationPin = async (params) => vtpass.purchaseEducationPin({
  vtpassServiceId: params.serviceId || params.vtpassServiceId || params.providerServiceId,
  variationCode: params.variationCode,
  billersCode: params.billersCode,
  phone: params.phone,
  quantity: params.quantity,
  requestId: params.requestId,
});

const getEducationVariations = async (serviceId) => vtpass.getEducationVariations(serviceId);

const verifyBettingCustomer = async (params) => vtpass.verifyBettingCustomer({
  vtpassServiceId: params.serviceId || params.providerServiceId || params.vtpassServiceId,
  customerId: params.customerId,
});

const fundBettingWallet = async (params) => vtpass.fundBettingWallet({
  vtpassServiceId: params.serviceId || params.providerServiceId || params.vtpassServiceId,
  customerId: params.customerId,
  amount: params.amount,
  phone: params.phone,
  requestId: params.requestId,
});

const requeryTransaction = async (requestId) => vtpass.requeryTransaction(requestId);

const getWalletBalance = async () => vtpass.getWalletBalance();

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
  getWalletBalance,
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
  verifyVtpassConnectivity: vtpass.verifyVtpassConnectivity,
};
