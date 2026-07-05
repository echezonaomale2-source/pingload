const BettingPlatform = require('../models/BettingPlatform');
const { syncBettingPlatformsFromClubkonnect } = require('../services/bettingPlatformService');

const adminListBettingPlatforms = async (req, res, next) => {
  try {
    await BettingPlatform.ensureDefaults();
    const platforms = await BettingPlatform.find().sort({ order: 1, name: 1 });
    res.json({ success: true, data: platforms });
  } catch (error) {
    next(error);
  }
};

const adminUpdateBettingPlatform = async (req, res, next) => {
  try {
    const updates = {};
    const { enabled, providerServiceId, vtpassServiceId, minAmount, maxAmount, order, name } = req.body;
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (providerServiceId !== undefined) updates.providerServiceId = providerServiceId || null;
    if (vtpassServiceId !== undefined) updates.providerServiceId = vtpassServiceId || null;
    if (minAmount !== undefined) updates.minAmount = Number(minAmount);
    if (maxAmount !== undefined) updates.maxAmount = Number(maxAmount);
    if (order !== undefined) updates.order = Number(order);
    if (name !== undefined) updates.name = name;

    const platform = await BettingPlatform.findOneAndUpdate(
      { platformId: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!platform) {
      return res.status(404).json({ success: false, message: 'Betting platform not found' });
    }
    res.json({ success: true, data: platform });
  } catch (error) {
    next(error);
  }
};

const adminSyncBettingPlatforms = async (req, res, next) => {
  try {
    const result = await syncBettingPlatformsFromClubkonnect();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminListBettingPlatforms,
  adminUpdateBettingPlatform,
  adminSyncBettingPlatforms,
};
