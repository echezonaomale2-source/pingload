const TvPlan = require('../models/TvPlan');

/**
 * Idempotent upsert for VTpass TV plan sync — merges legacy duplicates and updates in place.
 */
const upsertTvPlanFromSync = async (update) => {
  const provider = String(update?.provider || '').toLowerCase();
  const code = String(update?.variationCode || update?.vtpassVariationCode || '').trim();
  if (!provider || !code) return null;

  const matches = await TvPlan.find({
    provider,
    vtuProvider: 'vtpass',
    $or: [
      { variationCode: code },
      { vtpassVariationCode: code },
    ],
  }).sort({ updatedAt: -1 });

  const duplicateIds = matches.slice(1).map((doc) => doc._id);
  if (duplicateIds.length > 0) {
    await TvPlan.deleteMany({ _id: { $in: duplicateIds } });
  }

  const keeper = matches[0];
  if (keeper) {
    return TvPlan.findByIdAndUpdate(
      keeper._id,
      { $set: update },
      { new: true, runValidators: true }
    );
  }

  return TvPlan.findOneAndUpdate(
    { provider, vtuProvider: 'vtpass', variationCode: code },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  upsertTvPlanFromSync,
};
