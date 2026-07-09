import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { navigateFromNotification } from '../navigation/navigationRef';
import { notificationService } from '../services/transactionService';
import {
  syncDeviceTokenWithBackend,
  updateAppBadgeCount,
  getStoredDeviceToken,
  unregisterDeviceTokenFromBackend,
  subscribeToTokenRefresh,
  registerDeviceTokenWithBackend,
} from '../services/pushNotificationService';
import {
  savePendingNotificationNav,
  consumePendingNotificationNav,
  markNotificationResponseHandled,
  wasNotificationResponseHandled,
} from '../utils/pendingNotificationNav';
import { getPushChannelId } from '../utils/pushChannels';

const COLD_START_MAX_AGE_MS = 10 * 60 * 1000;

const loadMessaging = () => {
  try {
    return require('@react-native-firebase/messaging').default;
  } catch {
    return null;
  }
};

const refreshBadgeCount = async () => {
  try {
    const res = await notificationService.getUnreadCount();
    const count = res.data?.data?.unreadCount || 0;
    await updateAppBadgeCount(count);
    return count;
  } catch {
    return 0;
  }
};

const getResponseId = (response) =>
  response?.notification?.request?.identifier
  || response?.notification?.request?.content?.data?.notificationId
  || null;

const getResponseData = (response) =>
  response?.notification?.request?.content?.data || {};

const isFreshNotificationOpen = (response) => {
  if (!response) return false;
  const actionId = response.actionIdentifier;
  if (actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) return false;
  const dateSec = response.notification?.date;
  if (!dateSec) return true;
  const ageMs = Date.now() - dateSec * 1000;
  return ageMs >= 0 && ageMs <= COLD_START_MAX_AGE_MS;
};

const handleNotificationData = async (data, { userInitiated = false, responseId = null } = {}) => {
  if (!userInitiated && responseId && await wasNotificationResponseHandled(responseId)) {
    return false;
  }

  const navigated = navigateFromNotification(data);
  if (navigated) {
    if (responseId) await markNotificationResponseHandled(responseId);
    return true;
  }

  if (data?.screen || data?.transactionId || data?.notificationId) {
    await savePendingNotificationNav(data);
  }
  return false;
};

const handleNotificationNavigation = async (response, { userInitiated = false } = {}) => {
  const responseId = getResponseId(response);
  const data = getResponseData(response);

  if (!userInitiated) {
    if (!isFreshNotificationOpen(response)) return false;
    if (responseId && await wasNotificationResponseHandled(responseId)) return false;
  }

  return handleNotificationData(data, { userInitiated, responseId });
};

const presentForegroundNotification = async (remoteMessage) => {
  const data = { ...(remoteMessage?.data || {}) };
  const title = remoteMessage?.notification?.title || data.title || 'Pingload';
  const body = remoteMessage?.notification?.body || data.body || data.message || '';
  if (!title && !body) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Pingload',
      body: body || '',
      data,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: getPushChannelId(data.channelId || data.type) } : {}),
    },
    trigger: null,
  });
};

export const flushPendingNotificationNavigation = async () => {
  const pending = await consumePendingNotificationNav();
  if (pending) {
    navigateFromNotification(pending);
  }
};

/** Expo notification listeners — active when the user has unlocked the app. */
export const useNotificationListeners = (enabled) => {
  const queryClient = useQueryClient();
  const responseListener = useRef(null);
  const receivedListener = useRef(null);
  const coldStartChecked = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    receivedListener.current = Notifications.addNotificationReceivedListener(async () => {
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      await handleNotificationNavigation(response, { userInitiated: true });
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    if (!coldStartChecked.current) {
      coldStartChecked.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          handleNotificationNavigation(response, { userInitiated: false });
        }
      });
    }

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [enabled, queryClient]);
};

/** FCM handlers for background/killed opens and foreground display. */
export const useFcmMessaging = (enabled) => {
  const queryClient = useQueryClient();
  const initialChecked = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const messaging = loadMessaging();
    if (!messaging) return undefined;

    const unsubMessage = messaging().onMessage(async (remoteMessage) => {
      await presentForegroundNotification(remoteMessage);
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    const unsubOpened = messaging().onNotificationOpenedApp(async (remoteMessage) => {
      const data = remoteMessage?.data || {};
      await handleNotificationData(data, { userInitiated: true });
    });

    if (!initialChecked.current) {
      initialChecked.current = true;
      messaging().getInitialNotification().then(async (remoteMessage) => {
        if (!remoteMessage?.data) return;
        await handleNotificationData(remoteMessage.data, { userInitiated: false });
      });
    }

    return () => {
      unsubMessage();
      unsubOpened();
    };
  }, [enabled, queryClient]);
};

/** Register FCM token with backend when a session exists. */
export const useDeviceTokenRegistration = (enabled) => {
  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const register = async () => {
      try {
        await syncDeviceTokenWithBackend();
        if (!cancelled) await refreshBadgeCount();
      } catch {
        // Token registration is best-effort.
      }
    };

    register();

    const unsubscribeRefresh = subscribeToTokenRefresh(async (payload) => {
      if (!enabled || cancelled) return;
      try {
        await registerDeviceTokenWithBackend(payload);
      } catch {
        // Best effort.
      }
    });

    return () => {
      cancelled = true;
      unsubscribeRefresh();
    };
  }, [enabled]);
};

export const usePushNotifications = ({
  enableListeners = false,
  enableTokenSync = false,
  enableFcmHandlers = false,
} = {}) => {
  useNotificationListeners(enableListeners);
  useDeviceTokenRegistration(enableTokenSync);
  useFcmMessaging(enableFcmHandlers);
};

export const unregisterPushOnLogout = async () => {
  try {
    const token = await getStoredDeviceToken();
    if (token) await unregisterDeviceTokenFromBackend(token);
  } catch {
    // Best effort.
  }
};
