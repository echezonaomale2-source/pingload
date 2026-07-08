const mongoose = require('mongoose');

const UNIQUE_INDEX_NAME = 'vtuProvider_1_providerPlanCode_1';

const LEGACY_UNIQUE_INDEX_NAMES = [
  'network_1_vtuProvider_1_variationCode_1',
  'network_1',
  'variationCode_1',
  'planCode_1',
];

const DESIRED_INDEXES = [
  { key: { vtuProvider: 1, providerPlanCode: 1 }, options: { unique: true, name: UNIQUE_INDEX_NAME } },
  { key: { network: 1, vtuProvider: 1, enabled: 1 }, options: { name: 'network_1_vtuProvider_1_enabled_1' } },
];

const isBlank = (value) => value == null || String(value).trim() === '';

const isLegacyBlockingIndex = (idx) => {
  const keys = Object.keys(idx.key || {});
  if (!idx.unique) return false;
  if (idx.name === '_id_') return false;
  if (LEGACY_UNIQUE_INDEX_NAMES.includes(idx.name)) return true;
  if (keys.length === 2 && keys.includes('vtuProvider') && keys.includes('providerPlanCode')) {
    return false;
  }
  return true;
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

const dropLegacyUniqueIndexes = async (collection) => {
  const dropped = [];
  for (const name of LEGACY_UNIQUE_INDEX_NAMES) {
    if (await dropIndexIfExists(collection, name)) {
      dropped.push(name);
      console.log(`[DataPlan] Dropped legacy unique index: ${name}`);
    }
  }

  const indexes = await collection.indexes();
  for (const idx of indexes) {
    if (idx.name === '_id_') continue;
    if (!isLegacyBlockingIndex(idx)) continue;
    if (dropped.includes(idx.name)) continue;
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

  return dropped;
};

const dedupeByGroup = async (collection, groupIdExpr, stats, label) => {
  const duplicateGroups = await collection.aggregate([
    { $match: { vtuProvider: 'vtpass' } },
    { $addFields: groupIdExpr },
    {
      $group: {
        _id: '$__dedupeKey',
        docs: {
          $push: {
            id: '$_id',
            updatedAt: '$updatedAt',
            lastSyncedAt: '$lastSyncedAt',
          },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  for (const group of duplicateGroups) {
    const sorted = group.docs.sort((a, b) => {
      const aTime = new Date(a.lastSyncedAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.lastSyncedAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });
    for (const entry of sorted.slice(1)) {
      await collection.deleteOne({ _id: entry.id });
      stats.deduped += 1;
    }
  }

  if (duplicateGroups.length > 0) {
    console.log(`[DataPlan] Removed ${stats.deduped} duplicate(s) by ${label}`);
  }
};

/**
 * Repair or remove dataplans with null/missing provider fields and dedupe legacy rows.
 */
const migrateInvalidDataPlans = async (collection) => {
  const stats = { repaired: 0, deleted: 0, deduped: 0, dropped: [] };

  stats.dropped = await dropLegacyUniqueIndexes(collection);
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

  await collection.updateMany(
    {
      vtuProvider: 'vtpass',
      $or: [
        { variationCode: null },
        { variationCode: { $exists: false } },
        { variationCode: '' },
      ],
      providerPlanCode: { $type: 'string', $ne: '' },
    },
    [{ $set: { variationCode: '$providerPlanCode', vtpassVariationCode: '$providerPlanCode' } }]
  );

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

  await dedupeByGroup(
    collection,
    {
      __dedupeKey: {
        network: '$network',
        vtuProvider: '$vtuProvider',
        variationCode: {
          $cond: [
            { $or: [{ $eq: ['$variationCode', ''] }, { $eq: ['$variationCode', null] }] },
            '$providerPlanCode',
            '$variationCode',
          ],
        },
      },
    },
    stats,
    'network+vtuProvider+variationCode'
  );

  await dedupeByGroup(
    collection,
    {
      __dedupeKey: {
        vtuProvider: '$vtuProvider',
        providerPlanCode: '$providerPlanCode',
      },
    },
    stats,
    'vtuProvider+providerPlanCode'
  );

  if (stats.repaired > 0 || stats.deleted > 0 || stats.deduped > 0) {
    console.log(`[DataPlan] Cleaned records — repaired: ${stats.repaired}, deleted: ${stats.deleted}, deduped: ${stats.deduped}`);
  }

  return stats;
};

const verifyUniqueDataPlans = async (collection) => {
  const checks = [
    {
      label: 'network+vtuProvider+variationCode',
      pipeline: [
        { $match: { vtuProvider: 'vtpass' } },
        {
          $group: {
            _id: {
              network: '$network',
              vtuProvider: '$vtuProvider',
              variationCode: {
                $cond: [
                  { $or: [{ $eq: ['$variationCode', ''] }, { $eq: ['$variationCode', null] }] },
                  '$providerPlanCode',
                  '$variationCode',
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $count: 'duplicateGroups' },
      ],
    },
    {
      label: 'vtuProvider+providerPlanCode',
      pipeline: [
        { $match: { vtuProvider: 'vtpass', providerPlanCode: { $type: 'string', $ne: '' } } },
        {
          $group: {
            _id: { vtuProvider: '$vtuProvider', providerPlanCode: '$providerPlanCode' },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $count: 'duplicateGroups' },
      ],
    },
  ];

  const issues = [];
  for (const check of checks) {
    const result = await collection.aggregate(check.pipeline).toArray();
    const duplicateGroups = result[0]?.duplicateGroups || 0;
    if (duplicateGroups > 0) {
      issues.push(`${check.label}: ${duplicateGroups} duplicate group(s)`);
    }
  }

  return { ok: issues.length === 0, issues };
};

/**
 * Drop legacy unique indexes, clean invalid/duplicate records, and ensure correct indexes exist.
 */
const migrateDataPlanIndexes = async () => {
  const collection = mongoose.connection.collection('dataplans');
  const cleanup = await migrateInvalidDataPlans(collection);

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
        console.warn('[DataPlan] Index build hit duplicates — re-running cleanup and retrying');
        await migrateInvalidDataPlans(collection);
        const name = await collection.createIndex(spec.key, spec.options);
        ensured.push(name);
        console.log(`[DataPlan] Created index after cleanup: ${name}`);
      } else {
        throw error;
      }
    }
  }

  const verification = await verifyUniqueDataPlans(collection);
  if (!verification.ok) {
    console.warn(`[DataPlan] Duplicate groups remain after migration: ${verification.issues.join('; ')}`);
    await migrateInvalidDataPlans(collection);
  }

  const finalCheck = await verifyUniqueDataPlans(collection);
  if (!finalCheck.ok) {
    throw new Error(`DataPlan duplicates remain: ${finalCheck.issues.join('; ')}`);
  }

  if (cleanup.dropped?.length === 0 && ensured.length === 0
    && cleanup.repaired === 0 && cleanup.deleted === 0 && cleanup.deduped === 0) {
    console.log('[DataPlan] Indexes OK — no migration needed.');
  }

  return { dropped: cleanup.dropped || [], ensured, cleanup, verification: finalCheck };
};

module.exports = {
  migrateDataPlanIndexes,
  migrateInvalidDataPlans,
  verifyUniqueDataPlans,
  isLegacyBlockingIndex,
  LEGACY_UNIQUE_INDEX_NAMES,
};
