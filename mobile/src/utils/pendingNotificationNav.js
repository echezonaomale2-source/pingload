import * as SecureStore from 'expo-secure-store';

const PENDING_NAV_KEY = 'pingload_pending_notification_nav';
const HANDLED_RESPONSE_KEY = 'pingload_handled_notification_response';
const MAX_PENDING_AGE_MS = 10 * 60 * 1000;

export const savePendingNotificationNav = async (data) => {
  if (!data?.screen && !data?.transactionId && !data?.notificationId) return;
  try {
    await SecureStore.setItemAsync(
      PENDING_NAV_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {
    // Best effort.
  }
};

export const consumePendingNotificationNav = async () => {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_NAV_KEY);
    if (!raw) return null;
    await SecureStore.deleteItemAsync(PENDING_NAV_KEY);
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.savedAt || 0);
    if (!parsed.savedAt || age > MAX_PENDING_AGE_MS) return null;
    const { savedAt, ...data } = parsed;
    return data;
  } catch {
    return null;
  }
};

export const clearPendingNotificationNav = () => SecureStore.deleteItemAsync(PENDING_NAV_KEY);

export const markNotificationResponseHandled = async (responseId) => {
  if (!responseId) return;
  try {
    await SecureStore.setItemAsync(HANDLED_RESPONSE_KEY, String(responseId));
  } catch {
    // Best effort.
  }
};

export const wasNotificationResponseHandled = async (responseId) => {
  if (!responseId) return false;
  try {
    const stored = await SecureStore.getItemAsync(HANDLED_RESPONSE_KEY);
    return stored === String(responseId);
  } catch {
    return false;
  }
};
