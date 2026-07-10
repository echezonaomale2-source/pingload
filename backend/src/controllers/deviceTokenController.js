const DeviceToken = require('../models/DeviceToken');

const registerDeviceToken = async (req, res, next) => {
  try {
    const { token, platform, provider, deviceName, appVersion } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Device token is required' });
    }

    const normalizedToken = token.trim();
    const normalizedProvider = String(provider || 'fcm').toLowerCase();
    if (normalizedProvider !== 'fcm') {
      return res.status(400).json({
        success: false,
        message: 'Only FCM device tokens are supported. Use a production build with Firebase messaging.',
      });
    }

    // Deactivate any non-FCM tokens for this user so stale APNS/Expo tokens stop counting as failures.
    await DeviceToken.updateMany(
      { userId: req.user._id, provider: { $ne: 'fcm' }, isActive: true },
      { $set: { isActive: false } }
    );

    const record = await DeviceToken.findOneAndUpdate(
      { token: normalizedToken },
      {
        $set: {
          userId: req.user._id,
          platform: platform || 'unknown',
          provider: 'fcm',
          deviceName: deviceName || '',
          appVersion: appVersion || '',
          isActive: true,
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Device token registered',
      data: { id: record._id, platform: record.platform, provider: record.provider },
    });
  } catch (error) {
    next(error);
  }
};

const removeDeviceToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Device token is required' });
    }

    await DeviceToken.findOneAndUpdate(
      { token: token.trim(), userId: req.user._id },
      { $set: { isActive: false } }
    );

    res.json({ success: true, message: 'Device token removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerDeviceToken, removeDeviceToken };
