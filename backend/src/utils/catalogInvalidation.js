const SystemSettings = require('../models/SystemSettings');

const bumpCatalogVersion = async () => {
  const settings = await SystemSettings.getSettings();
  settings.catalogVersion = (settings.catalogVersion || 0) + 1;
  await settings.save();
  return settings.catalogVersion;
};

module.exports = {
  bumpCatalogVersion,
};
