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

const isProviderConfigured = (name) => (
  name === 'vtpass' ? serviceConfig.vtpass.configured : serviceConfig.clubkonnect.configured
);

const isDataProviderEnabled = (name, settings) => {
  const normalized = normalizeProvider(name);
  if (settings?.dataProviderEnabled) {
    return settings.dataProviderEnabled[normalized] !== false;
  }
  if (settings?.providerEnabled) {
    return settings.providerEnabled[normalized] !== false;
  }
  return true;
};

const getAlternateProvider = (name) => (
  normalizeProvider(name) === 'vtpass' ? 'clubkonnect' : 'vtpass'
);

const resolveUsableProvider = (preferred, settings) => {
  const choice = normalizeProvider(preferred);
  if (isProviderConfigured(choice)) return choice;
  const fallback = getAlternateProvider(choice);
  if (isProviderConfigured(fallback)) return fallback;
  return choice;
};

/** Preferred provider for non-data services (airtime, electricity, tv, betting, education). */
const getRoutedProviderName = async (serviceId) => {
  const settings = await loadSettings();
  const routed = normalizeProvider(settings.serviceRouting?.[serviceId] || settings.vtuProvider);
  return resolveUsableProvider(routed, settings);
};

/** Data is the only service that supports multiple active providers. */
const getDataCatalogProviders = async () => {
  const settings = await loadSettings();
  const enabled = VTU_PROVIDERS.filter(
    (name) => isDataProviderEnabled(name, settings) && isProviderConfigured(name)
  );
  if (enabled.length > 0) return enabled;
  const fallback = resolveUsableProvider(settings.serviceRouting?.data || settings.vtuProvider, settings);
  return [fallback];
};

/** Catalog providers for a service — multi only for data. */
const getCatalogProviders = async (serviceId) => {
  if (serviceId === 'data') return getDataCatalogProviders();
  return [await getRoutedProviderName(serviceId)];
};

const getActiveProviderName = async () => getRoutedProviderName('data');

const getSelectedProviderName = async () => {
  const settings = await loadSettings();
  return normalizeProvider(settings.serviceRouting?.data || settings.vtuProvider);
};

const getFailoverEnabled = async () => {
  const settings = await loadSettings();
  return Boolean(settings.enableProviderFailover);
};

const getRoutingSnapshot = async () => {
  const settings = await loadSettings();
  await VtuProviderConfig.ensureDefaults();
  const configs = await VtuProviderConfig.find().lean();

  const providers = VTU_PROVIDERS.map((providerId) => {
    const config = configs.find((c) => c.providerId === providerId) || {};
    return {
      providerId,
      displayName: config.displayName || (providerId === 'vtpass' ? 'VTpass' : 'Clubkonnect'),
      dataEnabled: isDataProviderEnabled(providerId, settings),
      configured: isProviderConfigured(providerId),
      credentialsSource: 'environment',
      lastSyncAt: config.lastSyncAt || null,
      lastHealthCheckAt: config.lastHealthCheckAt || null,
      healthStatus: config.healthStatus || 'unknown',
      lastHealthMessage: config.lastHealthMessage || '',
      ...(providerId === 'vtpass'
        ? { mode: serviceConfig.vtpass.mode, baseUrl: serviceConfig.vtpass.baseUrl }
        : { baseUrl: serviceConfig.clubkonnect.baseUrl }),
    };
  });

  const serviceRouting = NON_DATA_SERVICES.reduce((acc, service) => {
    acc[service] = normalizeProvider(settings.serviceRouting?.[service] || settings.vtuProvider);
    return acc;
  }, {});

  return {
    providers,
    dataProviderEnabled: {
      clubkonnect: isDataProviderEnabled('clubkonnect', settings),
      vtpass: isDataProviderEnabled('vtpass', settings),
    },
    serviceRouting,
    preferredServiceLabels: PREFERRED_SERVICE_LABELS,
    enableProviderFailover: Boolean(settings.enableProviderFailover),
    catalogVersion: settings.catalogVersion || 1,
    vtuProvider: normalizeProvider(settings.vtuProvider),
  };
};

module.exports = {
  VTU_PROVIDERS,
  VTU_SERVICES,
  NON_DATA_SERVICES,
  invalidateRoutingCache,
  isProviderConfigured,
  isDataProviderEnabled,
  getAlternateProvider,
  getRoutedProviderName,
  getDataCatalogProviders,
  getCatalogProviders,
  getActiveProviderName,
  getSelectedProviderName,
  getFailoverEnabled,
  getRoutingSnapshot,
  loadSettings,
  resolveUsableProvider,
};
