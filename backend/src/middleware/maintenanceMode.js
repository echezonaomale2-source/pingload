const SystemSettings = require('../models/SystemSettings');

let cachedMaintenance = { value: false, checkedAt: 0 };

const maintenanceMode = async (req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/auth/login') || req.path === '/health') {
    return next();
  }

  try {
    const now = Date.now();
    if (now - cachedMaintenance.checkedAt > 30000) {
      const settings = await SystemSettings.getSettings();
      cachedMaintenance = { value: Boolean(settings.maintenanceMode), checkedAt: now };
    }

    if (cachedMaintenance.value) {
      return res.status(503).json({
        success: false,
        message: 'Pingload is under maintenance. Please try again shortly.',
        code: 'MAINTENANCE_MODE',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = maintenanceMode;
