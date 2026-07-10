const ElectricityPlan = require('../models/ElectricityPlan');

/**
 * Idempotent upsert for VTpass electricity sync — merges legacy duplicates.
 */
const upsertElectricityPlanFromSync = async (update) => {
  const providerId = String(update?.providerId || '').toLowerCase().trim();
  const serviceId = String(update?.providerServiceId || update?.vtpassServiceId || '').trim();
  if (!providerId || !serviceId) return null;

  const matches = await ElectricityPlan.find({
    vtuProvider: 'vtpass',
    $or: [
      { providerId },
      { providerServiceId: serviceId },
      { vtpassServiceId: serviceId },
    ],
  }).sort({ updatedAt: -1 });

  const duplicateIds = matches.slice(1).map((doc) => doc._id);
  if (duplicateIds.length > 0) {
    await ElectricityPlan.deleteMany({ _id: { $in: duplicateIds } });
  }

  const keeper = matches[0];
  if (keeper) {
    return ElectricityPlan.findByIdAndUpdate(
      keeper._id,
      { $set: { ...update, providerId, vtuProvider: 'vtpass' } },
      { new: true, runValidators: true }
    );
  }

  return ElectricityPlan.findOneAndUpdate(
    { providerId, vtuProvider: 'vtpass' },
    { $set: { ...update, providerId, vtuProvider: 'vtpass' } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  upsertElectricityPlanFromSync,
};
