const EducationProduct = require('../models/EducationProduct');

/**
 * Idempotent upsert for education catalog sync/seed.
 * Canonical key: productCode (unique). Never inserts a second row for the same code.
 */
const upsertEducationProduct = async (update = {}) => {
  const productCode = String(update.productCode || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!productCode) return null;

  const payload = {
    ...update,
    productCode,
    vtuProvider: update.vtuProvider || 'vtpass',
  };

  const matches = await EducationProduct.find({ productCode })
    .sort({ updatedAt: -1, createdAt: -1 });

  const duplicateIds = matches.slice(1).map((doc) => doc._id);
  if (duplicateIds.length > 0) {
    await EducationProduct.deleteMany({ _id: { $in: duplicateIds } });
  }

  const keeper = matches[0];
  if (keeper) {
    return EducationProduct.findByIdAndUpdate(
      keeper._id,
      { $set: payload },
      { new: true, runValidators: true }
    );
  }

  try {
    return await EducationProduct.findOneAndUpdate(
      { productCode },
      { $set: payload },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Parallel upsert race on unique productCode — load winner and update it.
    if (error.code === 11000) {
      const existing = await EducationProduct.findOne({ productCode });
      if (existing) {
        return EducationProduct.findByIdAndUpdate(
          existing._id,
          { $set: payload },
          { new: true, runValidators: true }
        );
      }
    }
    throw error;
  }
};

module.exports = {
  upsertEducationProduct,
};
