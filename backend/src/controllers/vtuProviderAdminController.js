const SystemSettings = require('../models/SystemSettings');
const VtuProviderConfig = require('../models/VtuProviderConfig');
const DataPlan = require('../models/DataPlan');
const TvPlan = require('../models/TvPlan');
const vtuProvider = require('../services/vtuProviderService');
const routing = require('../services/vtuRoutingService');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');
const { NON_DATA_SERVICES, PROVIDER_LABELS } = require('../utils/vtuConstants');
const { normalizeProvider } = require('../utils/migrateVtuSettings');
const { tagWithVtuProvider } = require('../utils/resolveProviderFields');
const { buildDataPlanSyncUpdate } = require('../utils/dataPlanFields');

const DATA_NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];
const TV_PROVIDERS = ['dstv', 'gotv', 'startimes'];

const listProviders = async (_req, res, next) => {
  try {
    const snapshot = await routing.getRoutingSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

const updateDataProviderEnabled = async (req, res, next) => {
  try {
    const providerId = normalizeProvider(req.params.providerId);
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
    }
    if (enabled && !routing.isProviderConfigured(providerId)) {
      return res.status(400).json({
        success: false,
        message: `${PROVIDER_LABELS[providerId]} credentials are not configured on the server`,
      });
    }

    const settings = await SystemSettings.getSettings();
    settings.dataProviderEnabled[providerId] = enabled;
    await settings.save();
    routing.invalidateRoutingCache();
    await bumpCatalogVersion();

    const snapshot = await routing.getRoutingSnapshot();
    res.json({
      success: true,
      data: snapshot,
      message: `${PROVIDER_LABELS[providerId]} data ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    next(error);
  }
};

const updateServiceRouting = async (req, res, next) => {
  try {
    const { serviceRouting } = req.body;
    if (!serviceRouting || typeof serviceRouting !== 'object') {
      return res.status(400).json({ success: false, message: 'serviceRouting is required' });
    }

    const settings = await SystemSettings.getSettings();
    for (const service of NON_DATA_SERVICES) {
      if (serviceRouting[service] !== undefined) {
        const provider = normalizeProvider(serviceRouting[service]);
        if (!routing.isProviderConfigured(provider)) {
          return res.status(400).json({
            success: false,
            message: `${PROVIDER_LABELS[provider]} is not configured for ${service}`,
          });
        }
        settings.serviceRouting[service] = provider;
      }
    }

    await settings.save();
    routing.invalidateRoutingCache();
    vtuProvider.invalidateProviderCache();
    await bumpCatalogVersion();

    const snapshot = await routing.getRoutingSnapshot();
    res.json({ success: true, data: snapshot, message: 'Preferred providers updated' });
  } catch (error) {
    next(error);
  }
};

const updateFailover = async (req, res, next) => {
  try {
    const { enableProviderFailover } = req.body;
    if (typeof enableProviderFailover !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enableProviderFailover must be a boolean' });
    }
    const settings = await SystemSettings.getSettings();
    settings.enableProviderFailover = enableProviderFailover;
    await settings.save();
    routing.invalidateRoutingCache();

    const snapshot = await routing.getRoutingSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

const testProviderConnection = async (req, res, next) => {
  try {
    const providerId = normalizeProvider(req.params.providerId);
    if (!routing.isProviderConfigured(providerId)) {
      return res.status(400).json({
        success: false,
        message: `${PROVIDER_LABELS[providerId]} credentials are not configured`,
      });
    }

    const testFn = providerId === 'vtpass'
      ? vtuProvider.verifyVtpassConnectivity
      : vtuProvider.verifyClubkonnectConnectivity;

    let healthStatus = 'healthy';
    let message = 'Connection successful';
    try {
      await testFn();
    } catch (err) {
      healthStatus = 'down';
      message = err.message || 'Connection failed';
    }

    const now = new Date();
    await VtuProviderConfig.findOneAndUpdate(
      { providerId },
      {
        $set: {
          lastHealthCheckAt: now,
          healthStatus,
          lastHealthMessage: message,
        },
      },
      { upsert: true }
    );

    res.json({
      success: healthStatus === 'healthy',
      data: {
        providerId,
        healthStatus,
        message,
        lastHealthCheckAt: now,
      },
    });
  } catch (error) {
    next(error);
  }
};

const syncDataPlansForProvider = async (providerId, networkFilter) => {
  const source = normalizeProvider(providerId);
  if (!routing.isProviderConfigured(source)) {
    const error = new Error(`${PROVIDER_LABELS[source]} is not configured on the server`);
    error.statusCode = 400;
    throw error;
  }

  const networks = networkFilter && DATA_NETWORKS.includes(networkFilter)
    ? [networkFilter]
    : DATA_NETWORKS;
  let synced = 0;

  for (const network of networks) {
    const result = await vtuProvider.getDataPlans(network, source);
    const variations = result.content?.variations || [];

    for (const plan of variations) {
      if (!plan.variation_code) continue;
      const update = buildDataPlanSyncUpdate(source, network, plan);
      await DataPlan.findOneAndUpdate(
        { vtuProvider: source, providerPlanCode: plan.variation_code },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
    }
  }

  await VtuProviderConfig.findOneAndUpdate(
    { providerId: source },
    { $set: { lastSyncAt: new Date() } },
    { upsert: true }
  );

  return { synced, networks, source };
};

const syncTvPlansForProvider = async (providerId, providerFilter) => {
  const source = normalizeProvider(providerId);
  if (!routing.isProviderConfigured(source)) {
    const error = new Error(`${PROVIDER_LABELS[source]} is not configured on the server`);
    error.statusCode = 400;
    throw error;
  }

  const providers = providerFilter && TV_PROVIDERS.includes(providerFilter)
    ? [providerFilter]
    : TV_PROVIDERS;
  let synced = 0;

  for (const provider of providers) {
    const result = await vtuProvider.getTVPackages(provider, source);
    const variations = result.content?.variations || [];

    for (const pkg of variations) {
      if (!pkg.variation_code) continue;
      const code = pkg.variation_code;
      const planName = pkg.name || code;
      const common = {
        provider,
        name: planName,
        amount: parseFloat(pkg.variation_amount) || 0,
        enabled: true,
        vtuProvider: source,
      };

      const update = source === 'vtpass'
        ? { ...common, variationCode: code, vtpassVariationCode: code }
        : { ...common, variationCode: code, vtpassVariationCode: '' };

      await TvPlan.findOneAndUpdate(
        { provider, vtuProvider: source, variationCode: code },
        { $set: tagWithVtuProvider(update, source) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
    }
  }

  return { synced, providers, source };
};

const syncProviderDataPlans = async (req, res, next) => {
  try {
    const providerId = normalizeProvider(req.params.providerId);
    const network = String(req.query.network || '').toLowerCase();
    const result = await syncDataPlansForProvider(providerId, network || null);
    await bumpCatalogVersion();
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const syncProviderTvPlans = async (req, res, next) => {
  try {
    const providerId = normalizeProvider(req.params.providerId);
    const provider = String(req.query.provider || '').toLowerCase();
    const result = await syncTvPlansForProvider(providerId, provider || null);
    await bumpCatalogVersion();
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const syncAllDataProviders = async (_req, res, next) => {
  try {
    const results = {};
    for (const providerId of ['clubkonnect', 'vtpass']) {
      if (!routing.isProviderConfigured(providerId)) {
        results[providerId] = { skipped: true, reason: 'not configured' };
        continue;
      }
      if (!routing.isDataProviderEnabled(providerId, await routing.loadSettings())) {
        results[providerId] = { skipped: true, reason: 'data provider disabled' };
        continue;
      }
      results[providerId] = await syncDataPlansForProvider(providerId);
    }
    await bumpCatalogVersion();
    res.json({ success: true, data: results });
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
