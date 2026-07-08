const mongoose = require('mongoose');

const UNIQUE_INDEX_NAME = 'vtuProvider_1_providerPlanCode_1';

const DESIRED_INDEXES = [
  { key: { vtuProvider: 1, providerPlanCode: 1 }, options: { unique: true, name: UNIQUE_INDEX_NAME } },
  { key: { network: 1, vtuProvider: 1, enabled: 1 }, options: { name: 'network_1_vtuProvider_1_enabled_1' } },
];

const isBlank = (value) => value == null || String(value).trim() === '';

const isLegacyBlockingIndex = (idx) => {
  const keys = Object.keys(idx.key || {});
  if (!idx.unique) return false;
  if (idx.name === '_id_') return false;
  if (keys.length === 2 && keys.includes('vtuProvider') && keys.includes('providerPlanCode')) {
    return false;
  }
  if (keys.length === 1 && keys[0] === 'network') return true;
  if (keys.includes('network') && !keys.includes('vtuProvider')) return true;
  if (keys.includes('planCode') && !keys.includes('vtuProvider')) return true;
  if (keys.includes('variationCode') && !keys.includes('vtuProvider')) return true;
  return false;
};

const indexKeySig = (key) => JSON.stringify(key);

const dropIndexIfExists = async (collection, name) => {
  try {
    await collection.dropIndex(name);
    return true;
  } catch (error) {
    if (error.codeName === 'IndexNotFound' || error.code === 27) return false;
    throw error;
  }
};

/**
 * Repair or remove dataplans with null/missing provider fields before unique indexes are built.
 */
const migrateInvalidDataPlans = async (collection) => {
  const stats = { repaired: 0, deleted: 0, deduped: 0 };

  await dropIndexIfExists(collection, UNIQUE_INDEX_NAME);

  const repairCandidates = await collection.find({
    $or: [
      { providerPlanCode: null },
      { providerPlanCode: { $exists: false } },
      { providerPlanCode: '' },
    ],
  }).toArray();

  for (const doc of repairCandidates) {
    const code = doc.vtpassVariationCode || doc.variationCode || doc.planCode || doc.providerVariationCode;
    if (!isBlank(code)) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { providerPlanCode: String(code).trim(), vtuProvider: 'vtpass' } }
      );
      stats.repaired += 1;
    }
  }

  const vtuRepair = await collection.updateMany(
    {
      $or: [
        { vtuProvider: null },
        { vtuProvider: { $exists: false } },
      ],
      providerPlanCode: { $type: 'string', $ne: '' },
    },
    { $set: { vtuProvider: 'vtpass' } }
  );
  stats.repaired += vtuRepair.modifiedCount;

  const deleteResult = await collection.deleteMany({
    $or: [
      { providerPlanCode: null },
      { providerPlanCode: { $exists: false } },
      { providerPlanCode: '' },
      { vtuProvider: null },
      { vtuProvider: { $exists: false } },
      { vtuProvider: { $nin: ['vtpass'] } },
    ],
  });
  stats.deleted = deleteResult.deletedCount;

  const duplicateGroups = await collection.aggregate([
    {
      $match: {
        vtuProvider: 'vtpass',
        providerPlanCode: { $type: 'string', $ne: '' },
      },
    },
    {
      $group: {
        _id: { vtuProvider: '$vtuProvider', providerPlanCode: '$providerPlanCode' },
        docs: { $push: { id: '$_id', updatedAt: '$updatedAt' } },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  for (const group of duplicateGroups) {
    const sorted = group.docs.sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    for (const entry of sorted.slice(1)) {
      await collection.deleteOne({ _id: entry.id });
      stats.deduped += 1;
    }
  }

  if (stats.repaired > 0 || stats.deleted > 0 || stats.deduped > 0) {
    console.log(`[DataPlan] Cleaned invalid records — repaired: ${stats.repaired}, deleted: ${stats.deleted}, deduped: ${stats.deduped}`);
  }

  return stats;
};

/**
 * Drop legacy unique indexes, clean invalid records, and ensure correct compound indexes exist.
 * Safe to run on every startup.
 */
const migrateDataPlanIndexes = async () => {
  const collection = mongoose.connection.collection('dataplans');
  const cleanup = await migrateInvalidDataPlans(collection);

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
    if (exists) continue;

    try {
      const name = await collection.createIndex(spec.key, spec.options);
      ensured.push(name);
      console.log(`[DataPlan] Created index: ${name}`);
    } catch (error) {
      if (error.code === 11000) {
        console.warn('[DataPlan] Unique index build hit duplicates — re-running cleanup and retrying');
        await migrateInvalidDataPlans(collection);
        const name = await collection.createIndex(spec.key, spec.options);
        ensured.push(name);
        console.log(`[DataPlan] Created index after cleanup: ${name}`);
      } else {
        throw error;
      }
    }
  }

  if (dropped.length === 0 && ensured.length === 0 && cleanup.repaired === 0 && cleanup.deleted === 0 && cleanup.deduped === 0) {
    console.log('[DataPlan] Indexes OK — no migration needed.');
  }

  return { dropped, ensured, cleanup };
};

module.exports = {
  migrateDataPlanIndexes,
  migrateInvalidDataPlans,
  isLegacyBlockingIndex,
};
