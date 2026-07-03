import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { navigateFromNotification } from '../navigation/navigationRef';
import { notificationService } from '../services/transactionService';
import {
  syncDeviceTokenWithBackend,
  updateAppBadgeCount,
} from '../services/pushNotificationService';

const APP_LAUNCHED_AT = Date.now();
let initialNotificationHandled = false;

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

const isRecentNotificationTap = (response) => {
  const tappedAt = (response?.notification?.date || 0) * 1000;
  if (!tappedAt) return false;
  return tappedAt >= APP_LAUNCHED_AT - 5000;
};

const handleNotificationNavigation = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  navigateFromNotification(data);
};

/** Notification tap + foreground listeners — only active when authenticated. */
export const useNotificationListeners = (enabled) => {
  const queryClient = useQueryClient();
  const responseListener = useRef(null);
  const receivedListener = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    receivedListener.current = Notifications.addNotificationReceivedListener(async () => {
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      handleNotificationNavigation(response);
      await refreshBadgeCount();
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    if (!initialNotificationHandled) {
      initialNotificationHandled = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response || !isRecentNotificationTap(response)) return;
        handleNotificationNavigation(response);
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

    return () => {
      cancelled = true;
    };
  }, [enabled]);
};

export const usePushNotifications = (enabled) => {
  useNotificationListeners(enabled);
  useDeviceTokenRegistration(enabled);
};
