const ProviderLogo = require('../models/ProviderLogo');
const env = require('../config/env');

const serializeLogo = (logo) => {
  const doc = logo.toObject ? logo.toObject() : logo;
  const version = doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now();
  const base = (env.apiPublicUrl || '').replace(/\/$/, '');
  const logoUri = doc.logoData
    || doc.logoUrl
    || (base ? `${base}/api/services/provider-logos/${doc.providerId}/image?v=${version}` : null);

  return {
    _id: doc._id,
    providerId: doc.providerId,
    name: doc.name,
    category: doc.category,
    logoUri,
    logoUrl: doc.logoUrl,
    hasLogoData: Boolean(doc.logoData),
    enabled: doc.enabled,
    order: doc.order,
    updatedAt: doc.updatedAt,
  };
};

const listProviderLogos = async (_req, res, next) => {
  try {
    await ProviderLogo.ensureDefaults();
    const logos = await ProviderLogo.find({ enabled: true }).sort({ category: 1, order: 1 });
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: logos.map(serializeLogo) });
  } catch (error) {
    next(error);
  }
};

const getProviderLogoImage = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    const logo = await ProviderLogo.findOne({ providerId: providerId.toLowerCase(), enabled: true });
    if (!logo) return res.status(404).json({ success: false, message: 'Logo not found' });

    if (logo.logoData?.startsWith('data:')) {
      const match = logo.logoData.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], 'base64');
        res.set('Content-Type', match[1]);
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }

    if (logo.logoUrl) {
      return res.redirect(302, logo.logoUrl);
    }

    return res.status(404).json({ success: false, message: 'No logo configured' });
  } catch (error) {
    next(error);
  }
};

const adminListProviderLogos = async (_req, res, next) => {
  try {
    await ProviderLogo.ensureDefaults();
    const logos = await ProviderLogo.find().sort({ category: 1, order: 1 });
    res.json({ success: true, data: logos.map(serializeLogo) });
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
    res.json({ success: true, data: serializeLogo(logo) });
  } catch (error) {
    next(error);
  }
};

const adminDeleteProviderLogo = async (req, res, next) => {
  try {
    const logo = await ProviderLogo.findByIdAndUpdate(
      req.params.id,
      { logoUrl: null, logoData: null },
      { new: true }
    );
    if (!logo) return res.status(404).json({ success: false, message: 'Provider logo not found' });
    res.json({ success: true, message: 'Provider logo removed', data: serializeLogo(logo) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProviderLogos,
  getProviderLogoImage,
  adminListProviderLogos,
  adminUpdateProviderLogo,
  adminDeleteProviderLogo,
  serializeLogo,
};
