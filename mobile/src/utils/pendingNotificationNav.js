import * as SecureStore from 'expo-secure-store';

const PENDING_NAV_KEY = 'pingload_pending_notification_nav';

export const savePendingNotificationNav = async (data) => {
  if (!data) return;
  try {
    await SecureStore.setItemAsync(PENDING_NAV_KEY, JSON.stringify(data));
  } catch {
    // Best effort.
  }
};

export const consumePendingNotificationNav = async () => {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_NAV_KEY);
    if (!raw) return null;
    await SecureStore.deleteItemAsync(PENDING_NAV_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearPendingNotificationNav = () => SecureStore.deleteItemAsync(PENDING_NAV_KEY);
