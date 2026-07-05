const BettingPlatform = require('../models/BettingPlatform');
const catalog = require('../config/bettingPlatformCatalog');
const { resolveBettingCompanyCode } = require('../config/clubkonnectMappings');
const { logClubkonnect } = require('../utils/logger');
const serviceConfig = require('../config/serviceConfig');

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

const getProviderServiceId = (platform) =>
  platform?.providerServiceId || platform?.vtpassServiceId || resolveBettingCompanyCode(platform?.platformId);

const listEnabledPlatforms = async () => {
  await BettingPlatform.ensureDefaults();
  const platforms = await BettingPlatform.find({ enabled: true }).sort({ order: 1, name: 1 });
  return platforms.filter((platform) => Boolean(getProviderServiceId(platform)));
};

const getPlatformById = async (platformId) => {
  await BettingPlatform.ensureDefaults();
  return BettingPlatform.findOne({ platformId: String(platformId || '').toLowerCase() });
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
  };
};

module.exports = {
  listEnabledPlatforms,
  getPlatformById,
  mapPublicPlatform,
  syncBettingPlatformsFromClubkonnect,
};
