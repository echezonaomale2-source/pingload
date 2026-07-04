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
} from '../utils/pendingNotificationNav';

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

const handleNotificationNavigation = async (response) => {
  const data = response?.notification?.request?.content?.data || {};
  const navigated = navigateFromNotification(data);
  if (!navigated) {
    await savePendingNotificationNav(data);
  }
};

export const flushPendingNotificationNavigation = async () => {
  const pending = await consumePendingNotificationNav();
  if (pending) {
    navigateFromNotification(pending);
  }
};

/** Notification listeners — active once user session exists (including unlock gate). */
export const useNotificationListeners = (enabled) => {
  const queryClient = useQueryClient();
  const responseListener = useRef(null);
  const receivedListener = useRef(null);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    receivedListener.current = Notifications.addNotificationReceivedListener(async () => {
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      await handleNotificationNavigation(response);
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) handleNotificationNavigation(response);
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
