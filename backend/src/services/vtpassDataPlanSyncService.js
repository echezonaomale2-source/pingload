const DataPlan = require('../models/DataPlan');
const VtuProviderConfig = require('../models/VtuProviderConfig');
const vtuProvider = require('./vtuProviderService');
const routing = require('./vtuRoutingService');
const { buildDataPlanSyncUpdate } = require('../utils/dataPlanFields');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');

const DATA_NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];

const syncDataPlansForNetwork = async (network) => {
  const result = await vtuProvider.getDataPlans(network);
  const variations = result.content?.variations || [];
  let synced = 0;

  for (const plan of variations) {
    if (!plan.variation_code) continue;
    const update = buildDataPlanSyncUpdate('vtpass', network, plan);
    if (!update) continue;
    await DataPlan.findOneAndUpdate(
      { vtuProvider: 'vtpass', providerPlanCode: plan.variation_code },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    synced += 1;
  }

  return { network, synced, vtpassVariations: variations.length };
};

const syncAllVtpassDataPlans = async () => {
  if (!routing.isProviderConfigured()) {
    return { skipped: true, reason: 'VTpass not configured' };
  }

  const results = {};
  let total = 0;

  for (const network of DATA_NETWORKS) {
    results[network] = await syncDataPlansForNetwork(network);
    total += results[network].synced;
  }

  await VtuProviderConfig.findOneAndUpdate(
    { providerId: 'vtpass' },
    { $set: { lastSyncAt: new Date() } },
    { upsert: true }
  );

  await bumpCatalogVersion();

  return { total, networks: DATA_NETWORKS, results };
};

module.exports = {
  DATA_NETWORKS,
  syncDataPlansForNetwork,
  syncAllVtpassDataPlans,
};
