const { VTU_SERVICES } = require('./vtuConstants');

const normalizeProvider = () => 'vtpass';

const defaultServiceRouting = (provider = 'vtpass') => VTU_SERVICES.reduce((acc, service) => {
  acc[service] = provider;
  return acc;
}, {});

const migrateVtuSettings = async (settings) => {
  let changed = false;

  if (settings.vtuProvider !== 'vtpass') {
    settings.vtuProvider = 'vtpass';
    changed = true;
  }

  if (!settings.serviceRouting || !settings.serviceRouting.data) {
    settings.serviceRouting = defaultServiceRouting('vtpass');
    changed = true;
  } else {
    VTU_SERVICES.forEach((service) => {
      if (settings.serviceRouting[service] !== 'vtpass') {
        settings.serviceRouting[service] = 'vtpass';
        changed = true;
      }
    });
  }

  if (!settings.dataProviderEnabled) {
    settings.dataProviderEnabled = { vtpass: true };
    changed = true;
  } else if (settings.dataProviderEnabled.vtpass !== true) {
    settings.dataProviderEnabled = { vtpass: true };
    changed = true;
  }

  if (!settings.providerEnabled) {
    settings.providerEnabled = { vtpass: true };
    changed = true;
  } else if (settings.providerEnabled.vtpass !== true) {
    settings.providerEnabled = { vtpass: true };
    changed = true;
  }

  if (settings.enableProviderFailover) {
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
