const BettingPlatform = require('../models/BettingPlatform');
const catalog = require('../config/bettingPlatformCatalog');
const { resolveBettingCompanyCode } = require('../config/clubkonnectMappings');
const vtuProvider = require('./vtuProviderService');
const vtpass = require('./vtpassService');
const serviceConfig = require('../config/serviceConfig');
const { logClubkonnect, logVtpass } = require('../utils/logger');
const { resolveServiceId } = require('../utils/resolveProviderFields');

const normalizeText = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

const matchCatalogEntry = (service) => {
  const haystack = normalizeText(`${service.serviceID || ''} ${service.name || ''}`);
  return catalog.find((entry) =>
    entry.patterns?.some((pattern) => haystack.includes(normalizeText(pattern))));
};

const applyEnvOverrides = async () => {
  const raw = process.env.BETTING_PROVIDER_SERVICE_IDS || process.env.BETTING_VTPASS_SERVICE_IDS;
  if (!raw) return [];

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logClubkonnect('error', 'Invalid BETTING_PROVIDER_SERVICE_IDS JSON');
    return [];
  }

  const applied = [];
  for (const [platformId, providerServiceId] of Object.entries(parsed)) {
    if (!platformId || !providerServiceId) continue;
    await BettingPlatform.findOneAndUpdate(
      { platformId: String(platformId).toLowerCase() },
      {
        $set: {
          providerServiceId: String(providerServiceId),
          vtpassServiceId: String(providerServiceId),
          enabled: true,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: false }
    );
    applied.push({ platformId, providerServiceId });
  }
  return applied;
};

const mapPublicPlatform = (platform) => ({
  id: platform.platformId,
  name: platform.name,
  minAmount: platform.minAmount,
  maxAmount: platform.maxAmount,
  order: platform.order,
});

const getProviderServiceId = (platform, activeProvider) => {
  const resolved = resolveServiceId(platform, activeProvider);
  if (resolved) return resolved;
  return activeProvider === 'vtpass' ? null : resolveBettingCompanyCode(platform?.platformId);
};

const listEnabledPlatforms = async () => {
  await BettingPlatform.ensureDefaults();
  const catalogProviders = await vtuProvider.getCatalogProviders('betting');
  const platforms = await BettingPlatform.find({ enabled: true }).sort({ order: 1, name: 1 });
  return platforms.filter((platform) =>
    catalogProviders.some((provider) => Boolean(getProviderServiceId(platform, provider)))
  );
};

const getPlatformById = async (platformId) => {
  await BettingPlatform.ensureDefaults();
  return BettingPlatform.findOne({
    platformId: String(platformId || '').toLowerCase(),
  }).select('+vtpassServiceId');
};

const syncBettingPlatformsFromClubkonnect = async () => {
  await BettingPlatform.ensureDefaults();
  const envApplied = await applyEnvOverrides();

  if (!serviceConfig.clubkonnect.configured && !envApplied.length) {
    return {
      synced: 0,
      discovered: [],
      reason: 'Clubkonnect is not configured',
    };
  }

  const discovered = [];
  const matchedPlatformIds = new Set(envApplied.map((item) => item.platformId));

  for (const entry of catalog) {
    const providerServiceId = resolveBettingCompanyCode(entry.platformId);
    if (!providerServiceId) continue;

    matchedPlatformIds.add(entry.platformId);
    discovered.push({
      platformId: entry.platformId,
      providerServiceId,
      name: entry.name,
    });

    await BettingPlatform.findOneAndUpdate(
      { platformId: entry.platformId },
      {
        $set: {
          name: entry.name,
          providerServiceId,
          vtpassServiceId: providerServiceId,
          minAmount: entry.minAmount,
          maxAmount: entry.maxAmount,
          enabled: true,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  await BettingPlatform.updateMany(
    { platformId: { $nin: [...matchedPlatformIds] } },
    { $set: { enabled: false } }
  );

  logClubkonnect('info', 'Betting platform sync completed', {
    discoveredCount: discovered.length,
    envOverrideCount: envApplied.length,
  });

  return {
    synced: discovered.length + envApplied.length,
    discovered: [...discovered, ...envApplied.map((item) => ({ ...item, source: 'env' }))],
    source: 'clubkonnect',
  };
};

const syncBettingPlatformsFromVtpass = async () => {
  await BettingPlatform.ensureDefaults();
  const envApplied = await applyEnvOverrides();
  if (!serviceConfig.vtpass.configured) {
    return {
      synced: envApplied.length,
      discovered: envApplied,
      reason: envApplied.length ? 'Loaded from BETTING_VTPASS_SERVICE_IDS' : 'VTpass is not configured',
      source: 'vtpass',
    };
  }

  let services = [];
  try {
    services = await vtpass.listAllServices();
  } catch (error) {
    logVtpass('error', 'Failed to list VTpass services for betting sync', { message: error.message });
    return {
      synced: envApplied.length,
      discovered: envApplied,
      reason: error.message,
      source: 'vtpass',
    };
  }

  const discovered = [];
  const matchedPlatformIds = new Set(envApplied.map((item) => item.platformId));

  for (const service of services) {
    const entry = matchCatalogEntry(service);
    if (!entry) continue;

    matchedPlatformIds.add(entry.platformId);
    discovered.push({
      platformId: entry.platformId,
      vtpassServiceId: service.serviceID,
      name: service.name || entry.name,
    });

    await BettingPlatform.findOneAndUpdate(
      { platformId: entry.platformId },
      {
        $set: {
          name: service.name || entry.name,
          vtpassServiceId: service.serviceID,
          providerServiceId: service.serviceID,
          minAmount: Number(service.minimium_amount || entry.minAmount) || entry.minAmount,
          maxAmount: Number(service.maximum_amount || entry.maxAmount) || entry.maxAmount,
          enabled: true,
          lastSyncedAt: new Date(),
        },
      }
    );
  }

  for (const entry of catalog) {
    if (matchedPlatformIds.has(entry.platformId) || !entry.patterns?.length) continue;

    const probe = await vtpass.probeBettingServiceId(entry.platformId);
    if (!probe?.serviceID) continue;

    matchedPlatformIds.add(entry.platformId);
    discovered.push({
      platformId: entry.platformId,
      vtpassServiceId: probe.serviceID,
      source: 'probe',
    });

    await BettingPlatform.findOneAndUpdate(
      { platformId: entry.platformId },
      {
        $set: {
          vtpassServiceId: probe.serviceID,
          providerServiceId: probe.serviceID,
          enabled: true,
          lastSyncedAt: new Date(),
        },
      }
    );
  }

  for (const item of envApplied) {
    matchedPlatformIds.add(item.platformId);
  }

  await BettingPlatform.updateMany(
    { platformId: { $nin: [...matchedPlatformIds] } },
    { $set: { enabled: false } }
  );

  logVtpass('info', 'Betting platform sync completed', {
    discoveredCount: discovered.length,
    envOverrideCount: envApplied.length,
  });

  return {
    synced: discovered.length + envApplied.length,
    discovered: [...discovered, ...envApplied.map((item) => ({ ...item, source: 'env' }))],
    source: 'vtpass',
  };
};

const syncBettingPlatforms = async () => {
  const active = await vtuProvider.getSelectedProviderName();
  if (active === 'vtpass') return syncBettingPlatformsFromVtpass();
  return syncBettingPlatformsFromClubkonnect();
};

module.exports = {
  listEnabledPlatforms,
  getPlatformById,
  mapPublicPlatform,
  getProviderServiceId,
  syncBettingPlatformsFromClubkonnect,
  syncBettingPlatformsFromVtpass,
  syncBettingPlatforms,
};
