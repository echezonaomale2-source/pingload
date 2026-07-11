const mongoose = require('mongoose');

const UNIQUE_INDEX_NAME = 'productCode_1';
const COMPOUND_UNIQUE_NAME = 'productCode_1_vtuProvider_1';

const dropIndexIfExists = async (collection, name) => {
  try {
    await collection.dropIndex(name);
    return true;
  } catch (error) {
    if (error.codeName === 'IndexNotFound' || error.code === 27) return false;
    throw error;
  }
};

const isValidEducationDoc = (doc) => Boolean(
  doc
  && doc.productCode
  && doc.name
  && doc.providerServiceId
  && doc.examType
  && Number.isFinite(Number(doc.amount))
);

/**
 * Keep the newest valid document per productCode; delete the rest.
 * Idempotent — safe to run on every startup.
 */
const dedupeEducationProductsByCode = async (collection) => {
  const groups = await collection.aggregate([
    {
      $group: {
        _id: '$productCode',
        count: { $sum: 1 },
        docs: {
          $push: {
            _id: '$_id',
            updatedAt: '$updatedAt',
            createdAt: '$createdAt',
            name: '$name',
            providerServiceId: '$providerServiceId',
            examType: '$examType',
            amount: '$amount',
            productCode: '$productCode',
            enabled: '$enabled',
            vtuProvider: '$vtuProvider',
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  let removed = 0;
  for (const group of groups) {
    const sorted = [...group.docs].sort((a, b) => {
      const aValid = isValidEducationDoc(a) ? 1 : 0;
      const bValid = isValidEducationDoc(b) ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const keeper = sorted[0];
    const duplicateIds = sorted.slice(1).map((doc) => doc._id);
    if (!duplicateIds.length) continue;

    await collection.deleteMany({ _id: { $in: duplicateIds } });
    removed += duplicateIds.length;

    // Ensure keeper has a provider tag so compound lookups still work.
    await collection.updateOne(
      { _id: keeper._id },
      {
        $set: {
          vtuProvider: keeper.vtuProvider || 'vtpass',
          productCode: String(keeper.productCode || group._id).trim(),
        },
      }
    );
  }

  return removed;
};

const migrateEducationProductIndexes = async () => {
  const collection = mongoose.connection.collection('educationproducts');
  const dropped = [];
  let removedDuplicates = 0;

  // 1) Backfill missing provider so legacy rows are consistent.
  await collection.updateMany(
    { $or: [{ vtuProvider: { $exists: false } }, { vtuProvider: null }, { vtuProvider: '' }] },
    { $set: { vtuProvider: 'vtpass' } }
  );

  // 2) Merge duplicate productCodes before touching unique indexes.
  removedDuplicates = await dedupeEducationProductsByCode(collection);
  if (removedDuplicates > 0) {
    console.log(`[EducationProduct] Merged duplicates — removed ${removedDuplicates} record(s)`);
  }

  // 3) Drop compound unique if present (canonical uniqueness is productCode alone).
  if (await dropIndexIfExists(collection, COMPOUND_UNIQUE_NAME)) {
    dropped.push(COMPOUND_UNIQUE_NAME);
    console.log(`[EducationProduct] Dropped compound unique index: ${COMPOUND_UNIQUE_NAME}`);
  }

  const indexes = await collection.indexes();
  for (const idx of indexes) {
    if (!idx.unique || idx.name === '_id_' || idx.name === UNIQUE_INDEX_NAME) continue;
    const keys = Object.keys(idx.key || {});
    const isProductCodeOnly = keys.length === 1 && keys[0] === 'productCode';
    if (!isProductCodeOnly && idx.name && await dropIndexIfExists(collection, idx.name)) {
      dropped.push(idx.name);
      console.log(`[EducationProduct] Dropped conflicting unique index: ${idx.name}`);
    }
  }

  // 4) Ensure unique productCode index (idempotent).
  try {
    await collection.createIndex(
      { productCode: 1 },
      { unique: true, name: UNIQUE_INDEX_NAME }
    );
  } catch (error) {
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Race: new duplicates appeared — merge again and retry once.
      removedDuplicates += await dedupeEducationProductsByCode(collection);
      await collection.createIndex(
        { productCode: 1 },
        { unique: true, name: UNIQUE_INDEX_NAME }
      );
    } else {
      throw error;
    }
  }

  return { dropped, removedDuplicates };
};

module.exports = {
  migrateEducationProductIndexes,
  dedupeEducationProductsByCode,
};
