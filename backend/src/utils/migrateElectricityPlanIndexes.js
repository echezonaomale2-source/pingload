const mongoose = require('mongoose');

const UNIQUE_INDEX_NAME = 'providerId_1_vtuProvider_1';

const LEGACY_UNIQUE_INDEX_NAMES = [
  'providerId_1',
];

const dropIndexIfExists = async (collection, name) => {
  try {
    await collection.dropIndex(name);
    return true;
  } catch (error) {
    if (error.codeName === 'IndexNotFound' || error.code === 27) return false;
    throw error;
  }
};

const dedupeElectricityPlans = async (collection) => {
  const groups = await collection.aggregate([
    {
      $group: {
        _id: {
          providerId: { $toLower: '$providerId' },
          vtuProvider: { $ifNull: ['$vtuProvider', 'vtpass'] },
        },
        count: { $sum: 1 },
        docs: { $push: { _id: '$_id', updatedAt: '$updatedAt', createdAt: '$createdAt' } },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  let removed = 0;
  for (const group of groups) {
    const sorted = [...group.docs].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    const duplicateIds = sorted.slice(1).map((doc) => doc._id);
    if (!duplicateIds.length) continue;
    await collection.deleteMany({ _id: { $in: duplicateIds } });
    removed += duplicateIds.length;
  }
  return removed;
};

const migrateElectricityPlanIndexes = async () => {
  const collection = mongoose.connection.collection('electricityplans');
  const dropped = [];

  await collection.updateMany(
    { $or: [{ vtuProvider: { $exists: false } }, { vtuProvider: null }, { vtuProvider: '' }] },
    { $set: { vtuProvider: 'vtpass' } }
  );

  const removedDuplicates = await dedupeElectricityPlans(collection);
  if (removedDuplicates > 0) {
    console.log(`[ElectricityPlan] Merged duplicates — removed ${removedDuplicates} record(s)`);
  }

  for (const name of LEGACY_UNIQUE_INDEX_NAMES) {
    const indexes = await collection.indexes();
    const existing = indexes.find((idx) => idx.name === name);
    if (existing?.unique && await dropIndexIfExists(collection, name)) {
      dropped.push(name);
      console.log(`[ElectricityPlan] Dropped legacy unique index: ${name}`);
    }
  }

  const indexes = await collection.indexes();
  for (const idx of indexes) {
    if (!idx.unique || idx.name === '_id_' || idx.name === UNIQUE_INDEX_NAME) continue;
    const keys = Object.keys(idx.key || {});
    const isDesired = keys.length === 2
      && keys.includes('providerId')
      && keys.includes('vtuProvider');
    if (!isDesired && idx.name && await dropIndexIfExists(collection, idx.name)) {
      dropped.push(idx.name);
      console.log(`[ElectricityPlan] Dropped conflicting unique index: ${idx.name}`);
    }
  }

  try {
    await collection.createIndex(
      { providerId: 1, vtuProvider: 1 },
      { unique: true, name: UNIQUE_INDEX_NAME }
    );
  } catch (error) {
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      await dedupeElectricityPlans(collection);
      await collection.createIndex(
        { providerId: 1, vtuProvider: 1 },
        { unique: true, name: UNIQUE_INDEX_NAME }
      );
    } else {
      throw error;
    }
  }

  return { dropped, removedDuplicates };
};

module.exports = {
  migrateElectricityPlanIndexes,
};
