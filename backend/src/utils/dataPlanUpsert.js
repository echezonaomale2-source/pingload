const DataPlan = require('../models/DataPlan');

/**
 * Idempotent upsert for VTpass sync — merges legacy duplicates and updates in place.
 */
const upsertDataPlanFromSync = async (update) => {
  if (!update?.providerPlanCode || !update?.network) return null;

  const code = String(update.providerPlanCode).trim();
  const network = update.network;
  const variationCode = update.variationCode || code;

  const matches = await DataPlan.find({
    vtuProvider: 'vtpass',
    $or: [
      { providerPlanCode: code },
      { network, variationCode },
      { network, vtpassVariationCode: variationCode },
      { network, providerVariationCode: variationCode },
    ],
  }).sort({ lastSyncedAt: -1, updatedAt: -1 });

  const duplicateIds = matches.slice(1).map((doc) => doc._id);
  if (duplicateIds.length > 0) {
    await DataPlan.deleteMany({ _id: { $in: duplicateIds } });
  }

  const keeper = matches[0];
  if (keeper) {
    return DataPlan.findByIdAndUpdate(
      keeper._id,
      { $set: update },
      { new: true, runValidators: true }
    );
  }

  return DataPlan.findOneAndUpdate(
    { vtuProvider: 'vtpass', providerPlanCode: code },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  upsertDataPlanFromSync,
};
