const SystemSettings = require('../models/SystemSettings');
const VtuProviderConfig = require('../models/VtuProviderConfig');
const TvPlan = require('../models/TvPlan');
const vtuProvider = require('../services/vtuProviderService');
const routing = require('../services/vtuRoutingService');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');
const { tagWithVtuProvider } = require('../utils/resolveProviderFields');
const { persistProviderHealth } = require('../utils/providerHealth');
const { syncAllVtpassDataPlans, DATA_NETWORKS } = require('../services/vtpassDataPlanSyncService');
const TV_PROVIDERS = ['dstv', 'gotv', 'startimes'];

const listProviders = async (_req, res, next) => {
  try {
    const snapshot = await routing.getRoutingSnapshot();
    let balance = null;
    if (routing.isProviderConfigured()) {
      try {
        const balanceResult = await vtuProvider.getWalletBalance();
        balance = balanceResult?.balance ?? null;
      } catch {
        // Balance is optional for the dashboard list.
      }
    }
    res.json({ success: true, data: { ...snapshot, vtpassBalance: balance } });
  } catch (error) {
    next(error);
  }
};

const updateDataProviderEnabled = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
    }
    if (enabled && !routing.isProviderConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'VTpass credentials are not configured on the server',
      });
    }

    const settings = await SystemSettings.getSettings();
    settings.dataProviderEnabled = { vtpass: enabled };
    await settings.save();
    routing.invalidateRoutingCache();
    await bumpCatalogVersion();

    const snapshot = await routing.getRoutingSnapshot();
    res.json({
      success: true,
      data: snapshot,
      message: `VTpass data ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    next(error);
  }
};

const updateServiceRouting = async (_req, res, next) => {
  try {
    const snapshot = await routing.getRoutingSnapshot();
    res.json({ success: true, data: snapshot, message: 'All services use VTpass' });
  } catch (error) {
    next(error);
  }
};

const updateFailover = async (_req, res, next) => {
  try {
    const snapshot = await routing.getRoutingSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

const testProviderConnection = async (_req, res, next) => {
  try {
    if (!routing.isProviderConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'VTpass credentials are not configured',
      });
    }

    const result = await vtuProvider.verifyVtpassConnectivity();
    let balance = result.balance ?? null;
    let balanceError = result.balanceError || null;
    if (balance == null) {
      try {
        const balanceResult = await vtuProvider.getWalletBalance();
        balance = balanceResult?.balance ?? null;
      } catch (err) {
        balanceError = err.message || 'Balance probe failed';
      }
    }
    const { healthStatus, message, lastHealthCheckAt } = await persistProviderHealth('vtpass', { ...result, balance });

    res.json({
      success: healthStatus === 'healthy',
      data: {
        providerId: 'vtpass',
        healthStatus,
        message,
        lastHealthCheckAt,
        balance: balance ?? null,
        balanceError,
        serverIp: result.serverIp || null,
        purchasesEnabled: result.purchasesEnabled ?? null,
        baseUrl: result.baseUrl || null,
        publicKeyConfigured: result.publicKeyConfigured ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const syncDataPlansForProvider = async (networkFilter) => {
  if (!routing.isProviderConfigured()) {
    const error = new Error('VTpass is not configured on the server');
    error.statusCode = 400;
    throw error;
  }

  if (!networkFilter) {
    const result = await syncAllVtpassDataPlans();
    return { synced: result.total, networks: result.networks, source: 'vtpass', details: result.results };
  }

  if (!DATA_NETWORKS.includes(networkFilter)) {
    const error = new Error(`Invalid network: ${networkFilter}`);
    error.statusCode = 400;
    throw error;
  }

  const { syncDataPlansForNetwork } = require('../services/vtpassDataPlanSyncService');
  const networkResult = await syncDataPlansForNetwork(networkFilter);
  await VtuProviderConfig.findOneAndUpdate(
    { providerId: 'vtpass' },
    { $set: { lastSyncAt: new Date() } },
    { upsert: true }
  );
  return {
    synced: networkResult.synced,
    networks: [networkFilter],
    source: 'vtpass',
  };
};

const syncTvPlansForProvider = async (providerFilter) => {
  if (!routing.isProviderConfigured()) {
    const error = new Error('VTpass is not configured on the server');
    error.statusCode = 400;
    throw error;
  }

  const providers = providerFilter && TV_PROVIDERS.includes(providerFilter)
    ? [providerFilter]
    : TV_PROVIDERS;
  let synced = 0;

  for (const provider of providers) {
    const result = await vtuProvider.getTVPackages(provider);
    const variations = result.content?.variations || [];

    for (const pkg of variations) {
      if (!pkg.variation_code) continue;
      const code = pkg.variation_code;
      const planName = pkg.name || code;
      const update = {
        provider,
        name: planName,
        amount: parseFloat(pkg.variation_amount) || 0,
        enabled: true,
        vtuProvider: 'vtpass',
        variationCode: code,
        vtpassVariationCode: code,
      };

      await TvPlan.findOneAndUpdate(
        { provider, vtuProvider: 'vtpass', variationCode: code },
        { $set: tagWithVtuProvider(update) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
    }
  }

  return { synced, providers, source: 'vtpass' };
};

const syncProviderDataPlans = async (req, res, next) => {
  try {
    const network = String(req.query.network || '').toLowerCase();
    const result = await syncDataPlansForProvider(network || null);
    await bumpCatalogVersion();
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.isVtpassError) {
      return res.status(error.statusCode || 502).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const syncProviderTvPlans = async (req, res, next) => {
  try {
    const provider = String(req.query.provider || '').toLowerCase();
    const result = await syncTvPlansForProvider(provider || null);
    await bumpCatalogVersion();
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.isVtpassError) {
      return res.status(error.statusCode || 502).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const syncAllDataProviders = async (_req, res, next) => {
  try {
    if (!routing.isProviderConfigured()) {
      return res.status(400).json({ success: false, message: 'VTpass is not configured' });
    }
    const settings = await routing.loadSettings();
    if (!routing.isDataProviderEnabled('vtpass', settings)) {
      return res.status(400).json({ success: false, message: 'VTpass data provider is disabled' });
    }
    const result = await syncAllVtpassDataPlans();
    res.json({ success: true, data: { vtpass: { synced: result.total, networks: result.networks, source: 'vtpass', details: result.results } } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProviders,
  updateDataProviderEnabled,
  updateServiceRouting,
  updateFailover,
  testProviderConnection,
  syncProviderDataPlans,
  syncProviderTvPlans,
  syncAllDataProviders,
};
