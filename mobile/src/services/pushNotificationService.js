import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

const PENDING_TOKEN_KEY = 'pingload_pending_push_token';

const ANDROID_CHANNELS = [
  {
    id: 'default',
    name: 'General Alerts',
    importance: Notifications.AndroidImportance.MAX,
  },
  {
    id: 'transactions',
    name: 'Transactions',
    importance: Notifications.AndroidImportance.MAX,
  },
  {
    id: 'security',
    name: 'Security Alerts',
    importance: Notifications.AndroidImportance.MAX,
  },
  {
    id: 'promotions',
    name: 'Promotions',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const loadFirebaseMessaging = async () => {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging();
  } catch {
    return null;
  }
};

export const setupAndroidNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    ANDROID_CHANNELS.map((channel) => Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: channel.importance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0052CC',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: channel.id === 'security',
    }))
  );
};

export const requestNotificationPermission = async () => {
  if (!Device.isDevice) {
    return { granted: false, reason: 'simulator' };
  }

  await setupAndroidNotificationChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  return { granted: finalStatus === 'granted', status: finalStatus };
};

export const getFcmDeviceToken = async () => {
  if (!Device.isDevice) return null;

  // Only register real FCM tokens from @react-native-firebase/messaging.
  // Expo Go / APNS-native tokens are rejected by Firebase Admin multicast.
  const messaging = await loadFirebaseMessaging();
  if (!messaging) {
    if (__DEV__) {
      console.warn('[Push] Firebase messaging unavailable — skipping token registration');
    }
    return null;
  }

  try {
    if (Platform.OS === 'ios') {
      await messaging.registerDeviceForRemoteMessages();
    }
    const token = await messaging.getToken();
    if (!token) return null;
    return {
      token,
      provider: 'fcm',
      platform: Platform.OS,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[Push] FCM token fetch failed:', error?.message || error);
    }
    return null;
  }
};

export const buildTokenPayload = async () => {
  const permission = await requestNotificationPermission();
  if (!permission.granted) return null;

  const tokenData = await getFcmDeviceToken();
  if (!tokenData?.token) return null;

  return {
    ...tokenData,
    deviceName: Device.modelName || Platform.OS,
    appVersion: Constants.expoConfig?.version || '',
  };
};

export const savePendingDeviceToken = async (tokenPayload) => {
  if (!tokenPayload?.token) return;
  await SecureStore.setItemAsync(PENDING_TOKEN_KEY, JSON.stringify(tokenPayload));
};

const isExpoPushToken = (token) => /ExponentPushToken|ExpoPushToken/i.test(String(token || ''));

export const getPendingDeviceToken = async () => {
  const raw = await SecureStore.getItemAsync(PENDING_TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Discard stale Expo-shaped payloads that were cached before FCM-only registration.
    if (isExpoPushToken(parsed?.token) || parsed?.provider === 'expo') {
      await clearPendingDeviceToken();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearPendingDeviceToken = async () => {
  await SecureStore.deleteItemAsync(PENDING_TOKEN_KEY);
};

export const getStoredDeviceToken = async () => {
  const pending = await getPendingDeviceToken();
  if (pending?.token) return pending.token;
  const tokenData = await getFcmDeviceToken();
  return tokenData?.token || null;
};

/** Request permission during onboarding and cache token until login. */
export const requestPushPermissionDuringOnboarding = async () => {
  const tokenPayload = await buildTokenPayload();
  if (tokenPayload) {
    await savePendingDeviceToken(tokenPayload);
  }
  return tokenPayload;
};

export const registerDeviceTokenWithBackend = async (tokenPayload) => {
  if (!tokenPayload?.token) return null;
  const response = await api.post('/notifications/device-token', tokenPayload, { skipGlobalLoader: true });
  return response.data;
};

export const syncDeviceTokenWithBackend = async () => {
  // Always refresh from Firebase first so a stale SecureStore payload cannot
  // overwrite a valid FCM registration with an Expo-shaped or expired token.
  let tokenPayload = await buildTokenPayload();
  if (!tokenPayload) {
    tokenPayload = await getPendingDeviceToken();
  }
  if (!tokenPayload?.token || isExpoPushToken(tokenPayload.token)) {
    await clearPendingDeviceToken();
    return null;
  }

  const result = await registerDeviceTokenWithBackend({
    ...tokenPayload,
    provider: 'fcm',
  });
  await clearPendingDeviceToken();
  return result;
};

export const unregisterDeviceTokenFromBackend = async (token) => {
  if (!token) return;
  await api.delete('/notifications/device-token', { data: { token }, skipGlobalLoader: true });
};

export const updateAppBadgeCount = async (count) => {
  const safeCount = Math.max(0, Number(count) || 0);
  try {
    await Notifications.setBadgeCountAsync(safeCount);
  } catch {
    // Badge unsupported on some Android launchers.
  }
};

export const clearAppBadge = async () => updateAppBadgeCount(0);

export const subscribeToTokenRefresh = (onRefresh) => {
  let unsubscribe = () => {};
  loadFirebaseMessaging().then((messaging) => {
    if (!messaging?.onTokenRefresh) return;
    unsubscribe = messaging.onTokenRefresh(async (token) => {
      const payload = {
        token,
        provider: 'fcm',
        platform: Platform.OS,
        deviceName: Device.modelName || Platform.OS,
        appVersion: Constants.expoConfig?.version || '',
      };
      await savePendingDeviceToken(payload);
      onRefresh?.(payload);
    });
  });
  return () => unsubscribe();
};
