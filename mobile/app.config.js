const appJson = require('./app.json');
const firebaseConfig = require('./firebase.config');
const os = require('os');

const DEV_API_PORT = process.env.EXPO_PUBLIC_API_PORT || '5003';

/** First non-internal IPv4 — used so physical devices can reach Metro/API on LAN. */
const getLanIp = () => {
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const getDevHost = () => process.env.EXPO_PUBLIC_DEV_HOST || getLanIp();

const getDevApiUrl = () => `http://${getDevHost()}:${DEV_API_PORT}/api`;

const useLiveApi = process.env.EXPO_PUBLIC_USE_LIVE_API === 'true';
const resolveApiUrl = () => {
  if (useLiveApi && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return getDevApiUrl();
};

if (!firebaseConfig.isConfigured) {
  console.warn(
    '[Pingload] Firebase config files missing. Place google-services.json and GoogleService-Info.plist in the mobile/ folder before native builds.'
  );
}

module.exports = {
  ...appJson.expo,
  icon: './src/assets/icon.png',
  splash: {
    ...appJson.expo.splash,
    image: './src/assets/splash.png',
    backgroundColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  ios: {
    ...appJson.expo.ios,
    icon: './src/assets/icon.png',
    googleServicesFile: firebaseConfig.iosConfigPath,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    ...appJson.expo.android,
    icon: './src/assets/icon.png',
    googleServicesFile: firebaseConfig.androidConfigPath,
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
  },
  web: {
    ...appJson.expo.web,
    favicon: './src/assets/icon.png',
  },
  updates: {
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  },
  extra: {
    apiUrl: resolveApiUrl(),
    devHost: getDevHost(),
    tawkPropertyId: process.env.EXPO_PUBLIC_TAWK_PROPERTY_ID || '6a38286a0f2eba1d56794e32',
    tawkWidgetId: process.env.EXPO_PUBLIC_TAWK_WIDGET_ID || '1jrllrok0',
    supportWhatsapp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || '',
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@pingload.top',
    privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://pingload.top/privacy',
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || 'https://pingload.top/terms',
    appDomain: process.env.EXPO_PUBLIC_APP_DOMAIN || 'pingload.top',
    firebaseConfigured: firebaseConfig.isConfigured,
    firebaseProjectId: firebaseConfig.androidProjectId || firebaseConfig.iosProjectId || null,
  },
  plugins: [
    ...(appJson.expo.plugins || []),
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
    [
      'expo-notifications',
      {
        icon: './src/assets/icon.png',
        color: '#0052CC',
        defaultChannel: 'default',
        sounds: [],
        mode: 'production',
      },
    ],
  ],
};
