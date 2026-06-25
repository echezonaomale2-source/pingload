const SystemSettings = require('../models/SystemSettings');

const assertServiceEnabled = async (serviceId) => {
  const settings = await SystemSettings.getSettings();
  const service = settings.services?.find((s) => s.id === serviceId);
  if (service && service.enabled === false) {
    const error = new Error(`${service.name || serviceId} is currently unavailable. Please try again later.`);
    error.statusCode = 503;
    throw error;
  }
};

module.exports = assertServiceEnabled;
