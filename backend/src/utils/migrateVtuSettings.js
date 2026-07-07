const { VTU_SERVICES } = require('./vtuConstants');

const normalizeProvider = (value) => (value === 'vtpass' ? 'vtpass' : 'clubkonnect');

const defaultServiceRouting = (provider = 'clubkonnect') => VTU_SERVICES.reduce((acc, service) => {
  acc[service] = provider;
  return acc;
}, {});

const migrateVtuSettings = async (settings) => {
  let changed = false;
  const legacyProvider = normalizeProvider(settings.vtuProvider);

  if (!settings.serviceRouting || !settings.serviceRouting.data) {
    settings.serviceRouting = defaultServiceRouting(legacyProvider);
    changed = true;
  } else {
    VTU_SERVICES.forEach((service) => {
      if (!settings.serviceRouting[service]) {
        settings.serviceRouting[service] = legacyProvider;
        changed = true;
      }
    });
  }

  if (!settings.dataProviderEnabled) {
    settings.dataProviderEnabled = {
      clubkonnect: settings.providerEnabled?.clubkonnect !== false,
      vtpass: settings.providerEnabled?.vtpass !== false,
    };
    changed = true;
  }

  if (!settings.providerEnabled) {
    settings.providerEnabled = { clubkonnect: true, vtpass: true };
    changed = true;
  }

  if (settings.enableProviderFailover === undefined) {
    settings.enableProviderFailover = false;
    changed = true;
  }

  if (settings.catalogVersion === undefined || settings.catalogVersion === null) {
    settings.catalogVersion = 1;
    changed = true;
  }

  if (changed) {
    await settings.save();
  }

  return settings;
};

module.exports = {
  migrateVtuSettings,
  normalizeProvider,
};
