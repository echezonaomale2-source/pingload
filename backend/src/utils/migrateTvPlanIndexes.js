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

const migrateTvPlanIndexes = async () => {
  const collection = mongoose.connection.collection('tvplans');
  const dropped = [];

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

  await collection.createIndex(
    { provider: 1, vtuProvider: 1, variationCode: 1 },
    { unique: true, name: UNIQUE_INDEX_NAME }
  );

  return { dropped };
};

module.exports = {
  migrateTvPlanIndexes,
};
