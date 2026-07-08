const SystemSettings = require('../models/SystemSettings');
const VtuProviderConfig = require('../models/VtuProviderConfig');
const DataPlan = require('../models/DataPlan');
const TvPlan = require('../models/TvPlan');
const vtuProvider = require('../services/vtuProviderService');
const routing = require('../services/vtuRoutingService');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');
const { tagWithVtuProvider } = require('../utils/resolveProviderFields');
const { buildDataPlanSyncUpdate } = require('../utils/dataPlanFields');
const { persistProviderHealth } = require('../utils/providerHealth');

const DATA_NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];
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
    const { healthStatus, message, lastHealthCheckAt } = await persistProviderHealth('vtpass', result);

    res.json({
      success: healthStatus === 'healthy',
      data: {
        providerId: 'vtpass',
        healthStatus,
        message,
        lastHealthCheckAt,
        balance: result.balance ?? null,
        serverIp: result.serverIp || null,
        purchasesEnabled: result.purchasesEnabled ?? null,
        baseUrl: result.baseUrl || null,
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

  const networks = networkFilter && DATA_NETWORKS.includes(networkFilter)
    ? [networkFilter]
    : DATA_NETWORKS;
  let synced = 0;

  for (const network of networks) {
    const result = await vtuProvider.getDataPlans(network);
    const variations = result.content?.variations || [];

    for (const plan of variations) {
      if (!plan.variation_code) continue;
      const update = buildDataPlanSyncUpdate('vtpass', network, plan);
      await DataPlan.findOneAndUpdate(
        { vtuProvider: 'vtpass', providerPlanCode: plan.variation_code },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
    }
  }

  await VtuProviderConfig.findOneAndUpdate(
    { providerId: 'vtpass' },
    { $set: { lastSyncAt: new Date() } },
    { upsert: true }
  );

  return { synced, networks, source: 'vtpass' };
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
    const result = await syncDataPlansForProvider();
    await bumpCatalogVersion();
    res.json({ success: true, data: { vtpass: result } });
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
