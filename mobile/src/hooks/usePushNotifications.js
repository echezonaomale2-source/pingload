import { useEffect, useRef } from 'react';
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

const COLD_START_MAX_AGE_MS = 10 * 60 * 1000;

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

const handleNotificationNavigation = async (response, { userInitiated = false } = {}) => {
  const responseId = getResponseId(response);
  const data = getResponseData(response);

  if (!userInitiated) {
    if (!isFreshNotificationOpen(response)) return false;
    if (responseId && await wasNotificationResponseHandled(responseId)) return false;
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

export const flushPendingNotificationNavigation = async () => {
  const pending = await consumePendingNotificationNav();
  if (pending) {
    navigateFromNotification(pending);
  }
};

/** Notification listeners — active only after the user is fully authenticated. */
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

/** Register FCM token with backend after authentication. */
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

export const usePushNotifications = (enabled) => {
  useNotificationListeners(enabled);
  useDeviceTokenRegistration(enabled);
};

export const unregisterPushOnLogout = async () => {
  try {
    const token = await getStoredDeviceToken();
    if (token) await unregisterDeviceTokenFromBackend(token);
  } catch {
    // Best effort.
  }
};
