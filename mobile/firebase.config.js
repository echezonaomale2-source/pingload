const fs = require('fs');
const path = require('path');

const mobileRoot = __dirname;
const androidConfig = path.join(mobileRoot, 'google-services.json');
const iosConfig = path.join(mobileRoot, 'GoogleService-Info.plist');

const hasAndroidConfig = fs.existsSync(androidConfig);
const hasIosConfig = fs.existsSync(iosConfig);

const getFirebaseProjectId = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (filePath.endsWith('.json')) {
      return JSON.parse(raw).project_info?.project_id || null;
    }
    const match = raw.match(/<key>PROJECT_ID<\/key>\s*<string>([^<]+)<\/string>/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

module.exports = {
  androidConfigPath: './google-services.json',
  iosConfigPath: './GoogleService-Info.plist',
  hasAndroidConfig,
  hasIosConfig,
  androidProjectId: hasAndroidConfig ? getFirebaseProjectId(androidConfig) : null,
  iosProjectId: hasIosConfig ? getFirebaseProjectId(iosConfig) : null,
  isConfigured: hasAndroidConfig && hasIosConfig,
};
