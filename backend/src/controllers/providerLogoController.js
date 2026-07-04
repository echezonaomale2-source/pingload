const ProviderLogo = require('../models/ProviderLogo');

const listProviderLogos = async (_req, res, next) => {
  try {
    await ProviderLogo.ensureDefaults();
    const logos = await ProviderLogo.find({ enabled: true }).sort({ category: 1, order: 1 });
    res.json({ success: true, data: logos });
  } catch (error) {
    next(error);
  }
};

const adminListProviderLogos = async (_req, res, next) => {
  try {
    await ProviderLogo.ensureDefaults();
    const logos = await ProviderLogo.find().sort({ category: 1, order: 1 });
    res.json({ success: true, data: logos });
  } catch (error) {
    next(error);
  }
};

const adminUpdateProviderLogo = async (req, res, next) => {
  try {
    const logo = await ProviderLogo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!logo) return res.status(404).json({ success: false, message: 'Provider logo not found' });
    res.json({ success: true, data: logo });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProviderLogos,
  adminListProviderLogos,
  adminUpdateProviderLogo,
};
