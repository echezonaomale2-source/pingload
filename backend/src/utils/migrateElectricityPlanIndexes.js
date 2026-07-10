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

const migrateElectricityPlanIndexes = async () => {
  const collection = mongoose.connection.collection('electricityplans');
  const dropped = [];

  for (const name of LEGACY_UNIQUE_INDEX_NAMES) {
    // Only drop if it is unique — keep non-unique providerId_1 for query speed if present.
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

  await collection.createIndex(
    { providerId: 1, vtuProvider: 1 },
    { unique: true, name: UNIQUE_INDEX_NAME }
  );

  return { dropped };
};

module.exports = {
  migrateElectricityPlanIndexes,
};
