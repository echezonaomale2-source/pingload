const SystemSettings = require('../models/SystemSettings');
const VtuProviderConfig = require('../models/VtuProviderConfig');
const serviceConfig = require('../config/serviceConfig');
const { VTU_PROVIDERS, VTU_SERVICES, NON_DATA_SERVICES, PREFERRED_SERVICE_LABELS } = require('../utils/vtuConstants');
const { normalizeProvider } = require('../utils/migrateVtuSettings');

let settingsCache = null;
let settingsCacheExpiry = 0;

const invalidateRoutingCache = () => {
  settingsCache = null;
  settingsCacheExpiry = 0;
};

const loadSettings = async () => {
  if (settingsCache && Date.now() < settingsCacheExpiry) return settingsCache;
  settingsCache = await SystemSettings.getSettings();
  settingsCacheExpiry = Date.now() + 5000;
  return settingsCache;
};

const isProviderConfigured = () => serviceConfig.vtpass.configured;

const isDataProviderEnabled = (_name, settings) => {
  if (settings?.dataProviderEnabled) {
    return settings.dataProviderEnabled.vtpass !== false;
  }
  if (settings?.providerEnabled) {
    return settings.providerEnabled.vtpass !== false;
  }
  return true;
};

const getRoutedProviderName = async () => 'vtpass';

const getDataCatalogProviders = async () => {
  if (!isProviderConfigured()) return [];
  const settings = await loadSettings();
  if (!isDataProviderEnabled('vtpass', settings)) return [];
  return ['vtpass'];
};

const getCatalogProviders = async () => ['vtpass'];

const getActiveProviderName = async () => 'vtpass';

const getSelectedProviderName = async () => 'vtpass';

const getFailoverEnabled = async () => false;

const getRoutingSnapshot = async () => {
  const settings = await loadSettings();
  await VtuProviderConfig.ensureDefaults();
  const config = await VtuProviderConfig.findOne({ providerId: 'vtpass' }).lean();

  const providers = [{
    providerId: 'vtpass',
    displayName: config?.displayName || 'VTpass',
    dataEnabled: isDataProviderEnabled('vtpass', settings),
    configured: isProviderConfigured(),
    credentialsSource: 'environment',
    lastSyncAt: config?.lastSyncAt || null,
    lastHealthCheckAt: config?.lastHealthCheckAt || null,
    healthStatus: config?.healthStatus || 'unknown',
    lastHealthMessage: config?.lastHealthMessage || '',
    mode: serviceConfig.vtpass.mode,
    baseUrl: serviceConfig.vtpass.baseUrl,
  }];

  const serviceRouting = NON_DATA_SERVICES.reduce((acc, service) => {
    acc[service] = 'vtpass';
    return acc;
  }, {});

  return {
    providers,
    dataProviderEnabled: { vtpass: isDataProviderEnabled('vtpass', settings) },
    serviceRouting,
    preferredServiceLabels: PREFERRED_SERVICE_LABELS,
    enableProviderFailover: false,
    catalogVersion: settings.catalogVersion || 1,
    vtuProvider: 'vtpass',
  };
};

module.exports = {
  VTU_PROVIDERS,
  VTU_SERVICES,
  NON_DATA_SERVICES,
  invalidateRoutingCache,
  isProviderConfigured,
  isDataProviderEnabled,
  getRoutedProviderName,
  getDataCatalogProviders,
  getCatalogProviders,
  getActiveProviderName,
  getSelectedProviderName,
  getFailoverEnabled,
  getRoutingSnapshot,
  loadSettings,
};
