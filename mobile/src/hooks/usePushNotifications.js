import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { navigateFromNotification } from '../navigation/navigationRef';
import { notificationService } from '../services/transactionService';
import {
  syncDeviceTokenWithBackend,
  updateAppBadgeCount,
} from '../services/pushNotificationService';

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

const handleNotificationNavigation = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  navigateFromNotification(data);
};

/** Notification tap + foreground listeners — active whenever app shell is mounted. */
export const useNotificationListeners = () => {
  const queryClient = useQueryClient();
  const responseListener = useRef(null);
  const receivedListener = useRef(null);

  useEffect(() => {
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

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationNavigation(response);
    });

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [queryClient]);
};

/** Register FCM token with backend after authentication. */
export const useDeviceTokenRegistration = (enabled) => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!enabled || !isAuthenticated) return undefined;

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
  }, [enabled, isAuthenticated]);
};

export const usePushNotifications = (enabled) => {
  useNotificationListeners();
  useDeviceTokenRegistration(enabled);
};
