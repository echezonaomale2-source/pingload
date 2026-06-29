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
  name: 'Pingload',
  slug: 'pingload',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'pingload',
  assetBundlePatterns: ['**/*'],
  splash: {
    image: './src/assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  updates: {
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.pingload.app',
    icon: './src/assets/icon.png',
    googleServicesFile: firebaseConfig.iosConfigPath,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: 'com.pingload.app',
    versionCode: 1,
    icon: './src/assets/icon.png',
    googleServicesFile: firebaseConfig.androidConfigPath,
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
  },
  web: {
    favicon: './src/assets/icon.png',
  },
  extra: {
    eas: {
      projectId: 'caa45e57-3982-4367-ae3e-13522e6bb90b',
    },
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
    // Registered first so its manifest mod executes last (config-plugin mods run
    // in reverse registration order), letting it resolve the Firebase notification
    // meta-data merge conflict after expo-notifications has injected the nodes.
    './plugins/withNotificationManifestFix',
    'expo-asset',
    'expo-font',
    'expo-secure-store',
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Pingload to use Face ID for secure login.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Pingload to access your photos to set your profile picture.',
        cameraPermission: 'Allow Pingload to use your camera to take a profile photo.',
      },
    ],
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
