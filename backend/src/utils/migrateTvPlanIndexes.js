const mongoose = require('mongoose');

const UNIQUE_INDEX_NAME = 'provider_1_vtuProvider_1_variationCode_1';

const LEGACY_UNIQUE_INDEX_NAMES = [
  'provider_1_variationCode_1',
  'provider_1',
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

const dedupeTvPlans = async (collection) => {
  const groups = await collection.aggregate([
    {
      $group: {
        _id: {
          provider: '$provider',
          vtuProvider: { $ifNull: ['$vtuProvider', 'vtpass'] },
          variationCode: '$variationCode',
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

const migrateTvPlanIndexes = async () => {
  const collection = mongoose.connection.collection('tvplans');
  const dropped = [];

  await collection.updateMany(
    { $or: [{ vtuProvider: { $exists: false } }, { vtuProvider: null }, { vtuProvider: '' }] },
    { $set: { vtuProvider: 'vtpass' } }
  );

  const removedDuplicates = await dedupeTvPlans(collection);
  if (removedDuplicates > 0) {
    console.log(`[TvPlan] Merged duplicates — removed ${removedDuplicates} record(s)`);
  }

  for (const name of LEGACY_UNIQUE_INDEX_NAMES) {
    if (await dropIndexIfExists(collection, name)) {
      dropped.push(name);
      console.log(`[TvPlan] Dropped legacy unique index: ${name}`);
    }
  }

  const indexes = await collection.indexes();
  for (const idx of indexes) {
    if (!idx.unique || idx.name === '_id_' || idx.name === UNIQUE_INDEX_NAME) continue;
    const keys = Object.keys(idx.key || {});
    const isDesired = keys.length === 3
      && keys.includes('provider')
      && keys.includes('vtuProvider')
      && keys.includes('variationCode');
    if (!isDesired && idx.name && await dropIndexIfExists(collection, idx.name)) {
      dropped.push(idx.name);
      console.log(`[TvPlan] Dropped conflicting unique index: ${idx.name}`);
    }
  }

  try {
    await collection.createIndex(
      { provider: 1, vtuProvider: 1, variationCode: 1 },
      { unique: true, name: UNIQUE_INDEX_NAME }
    );
  } catch (error) {
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      await dedupeTvPlans(collection);
      await collection.createIndex(
        { provider: 1, vtuProvider: 1, variationCode: 1 },
        { unique: true, name: UNIQUE_INDEX_NAME }
      );
    } else {
      throw error;
    }
  }

  return { dropped, removedDuplicates };
};

module.exports = {
  migrateTvPlanIndexes,
};
