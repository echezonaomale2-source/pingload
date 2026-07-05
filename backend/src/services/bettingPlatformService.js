const BettingPlatform = require('../models/BettingPlatform');
const catalog = require('../config/bettingPlatformCatalog');
const vtpass = require('./vtpassService');
const { logVtpass } = require('../utils/logger');
const serviceConfig = require('../config/serviceConfig');

const normalizeText = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

const applyEnvOverrides = async () => {
  const raw = process.env.BETTING_VTPASS_SERVICE_IDS;
  if (!raw) return [];

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logVtpass('error', 'Invalid BETTING_VTPASS_SERVICE_IDS JSON');
    return [];
  }

  const applied = [];
  for (const [platformId, vtpassServiceId] of Object.entries(parsed)) {
    if (!platformId || !vtpassServiceId) continue;
    await BettingPlatform.findOneAndUpdate(
      { platformId: String(platformId).toLowerCase() },
      {
        $set: {
          vtpassServiceId: String(vtpassServiceId),
          enabled: true,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: false }
    );
    applied.push({ platformId, vtpassServiceId });
  }
  return applied;
};

const matchCatalogEntry = (service) => {
  const haystack = normalizeText(`${service.serviceID || ''} ${service.name || ''}`);
  return catalog.find((entry) =>
    entry.patterns.some((pattern) => haystack.includes(normalizeText(pattern))));
};

const mapPublicPlatform = (platform) => ({
  id: platform.platformId,
  name: platform.name,
  minAmount: platform.minAmount,
  maxAmount: platform.maxAmount,
  order: platform.order,
});

const listEnabledPlatforms = async () => {
  await BettingPlatform.ensureDefaults();
  const platforms = await BettingPlatform.find({
    enabled: true,
    vtpassServiceId: { $nin: [null, ''] },
  }).sort({ order: 1, name: 1 });
  return platforms;
};

const getPlatformById = async (platformId) => {
  await BettingPlatform.ensureDefaults();
  return BettingPlatform.findOne({ platformId: String(platformId || '').toLowerCase() });
};

const syncBettingPlatformsFromVtpass = async () => {
  await BettingPlatform.ensureDefaults();
  const envApplied = await applyEnvOverrides();
  if (!serviceConfig.vtpass.configured) {
    return {
      synced: envApplied.length,
      discovered: envApplied,
      reason: envApplied.length ? 'Loaded from BETTING_VTPASS_SERVICE_IDS' : 'VTpass is not configured',
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
    };
  }

  const discovered = [];
  const matchedPlatformIds = new Set();

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
          minAmount: Number(service.minimium_amount || entry.minAmount) || entry.minAmount,
          maxAmount: Number(service.maximum_amount || entry.maxAmount) || entry.maxAmount,
          enabled: true,
          lastSyncedAt: new Date(),
        },
      }
    );
  }

  // Probe catalog entries that were not returned in service listings.
  for (const entry of catalog) {
    if (matchedPlatformIds.has(entry.platformId)) continue;

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
    discovered,
  });

  return {
    synced: discovered.length + envApplied.length,
    discovered: [...discovered, ...envApplied.map((item) => ({ ...item, source: 'env' }))],
  };
};

module.exports = {
  listEnabledPlatforms,
  getPlatformById,
  mapPublicPlatform,
  syncBettingPlatformsFromVtpass,
};
