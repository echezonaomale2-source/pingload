const SystemSettings = require('../models/SystemSettings');
const VtuProviderConfig = require('../models/VtuProviderConfig');
const serviceConfig = require('../config/serviceConfig');
const { VTU_PROVIDERS, VTU_SERVICES } = require('../utils/vtuConstants');
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

const isProviderEnabled = (name, settings) => {
  const normalized = normalizeProvider(name);
  if (!settings?.providerEnabled) return true;
  return settings.providerEnabled[normalized] !== false;
};

const getAlternateProvider = (name) => (
  normalizeProvider(name) === 'vtpass' ? 'clubkonnect' : 'vtpass'
);

const resolveUsableProvider = (preferred, settings) => {
  const choice = normalizeProvider(preferred);
  if (isProviderEnabled(choice, settings) && isProviderConfigured(choice)) {
    return choice;
  }
  const fallback = getAlternateProvider(choice);
  if (isProviderEnabled(fallback, settings) && isProviderConfigured(fallback)) {
    return fallback;
  }
  return choice;
};

/** Provider routed for a specific service purchase. */
const getRoutedProviderName = async (serviceId) => {
  const settings = await loadSettings();
  const routed = normalizeProvider(settings.serviceRouting?.[serviceId] || settings.vtuProvider);
  return resolveUsableProvider(routed, settings);
};

/** All providers whose catalogs should be shown for a service. */
const getCatalogProviders = async (serviceId) => {
  const settings = await loadSettings();
  const routed = normalizeProvider(settings.serviceRouting?.[serviceId] || settings.vtuProvider);
  const providers = VTU_PROVIDERS.filter(
    (name) => isProviderEnabled(name, settings) && isProviderConfigured(name)
  );

  if (providers.length === 0) {
    return [resolveUsableProvider(routed, settings)];
  }

  return providers;
};

/** Legacy global active provider — uses data service routing. */
const getActiveProviderName = async () => getRoutedProviderName('data');

/** Admin default for plan forms — uses data routing without fallback display. */
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
      enabled: isProviderEnabled(providerId, settings),
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

  return {
    providers,
    serviceRouting: VTU_SERVICES.reduce((acc, service) => {
      acc[service] = normalizeProvider(settings.serviceRouting?.[service] || settings.vtuProvider);
      return acc;
    }, {}),
    enableProviderFailover: Boolean(settings.enableProviderFailover),
    catalogVersion: settings.catalogVersion || 1,
    vtuProvider: normalizeProvider(settings.vtuProvider),
  };
};

module.exports = {
  VTU_PROVIDERS,
  VTU_SERVICES,
  invalidateRoutingCache,
  isProviderConfigured,
  isProviderEnabled,
  getAlternateProvider,
  getRoutedProviderName,
  getCatalogProviders,
  getActiveProviderName,
  getSelectedProviderName,
  getFailoverEnabled,
  getRoutingSnapshot,
  loadSettings,
  resolveUsableProvider,
};
