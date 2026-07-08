const mongoose = require('mongoose');

const DESIRED_INDEXES = [
  { key: { vtuProvider: 1, providerPlanCode: 1 }, options: { unique: true, name: 'vtuProvider_1_providerPlanCode_1' } },
  { key: { network: 1, vtuProvider: 1, enabled: 1 }, options: { name: 'network_1_vtuProvider_1_enabled_1' } },
];

const isLegacyBlockingIndex = (idx) => {
  const keys = Object.keys(idx.key || {});
  if (!idx.unique) return false;
  if (idx.name === '_id_') return false;
  // Correct unique index — keep it
  if (keys.length === 2 && keys.includes('vtuProvider') && keys.includes('providerPlanCode')) {
    return false;
  }
  // Legacy unique indexes block multiple plans per network
  if (keys.length === 1 && keys[0] === 'network') return true;
  if (keys.includes('network') && !keys.includes('vtuProvider')) return true;
  if (keys.includes('planCode') && !keys.includes('vtuProvider')) return true;
  if (keys.includes('variationCode') && !keys.includes('vtuProvider')) return true;
  return false;
};

const indexKeySig = (key) => JSON.stringify(key);

/**
 * Drop legacy unique indexes on dataplanes and ensure correct compound indexes exist.
 * Safe to run on every startup — only drops known-bad indexes.
 */
const migrateDataPlanIndexes = async () => {
  const collection = mongoose.connection.collection('dataplans');
  const indexes = await collection.indexes();

  const dropped = [];
  for (const idx of indexes) {
    if (idx.name === '_id_') continue;
    if (!isLegacyBlockingIndex(idx)) continue;
    try {
      await collection.dropIndex(idx.name);
      dropped.push(idx.name);
      console.log(`[DataPlan] Dropped legacy index: ${idx.name} ${JSON.stringify(idx.key)}`);
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        console.warn(`[DataPlan] Could not drop index ${idx.name}: ${error.message}`);
      }
    }
  }

  const ensured = [];
  for (const spec of DESIRED_INDEXES) {
    const current = await collection.indexes();
    const exists = current.some((idx) => indexKeySig(idx.key) === indexKeySig(spec.key));
    if (!exists) {
      const name = await collection.createIndex(spec.key, spec.options);
      ensured.push(name);
      console.log(`[DataPlan] Created index: ${name}`);
    }
  }

  if (dropped.length === 0 && ensured.length === 0) {
    console.log('[DataPlan] Indexes OK — no migration needed.');
  }

  return { dropped, ensured };
};

module.exports = { migrateDataPlanIndexes, isLegacyBlockingIndex };
