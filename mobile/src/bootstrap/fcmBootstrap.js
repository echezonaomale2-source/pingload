import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getPushChannelId } from '../utils/pushChannels';

const loadMessaging = () => {
  try {
    return require('@react-native-firebase/messaging').default;
  } catch {
    return null;
  }
};

const scheduleDataOnlyNotification = async (remoteMessage) => {
  const data = remoteMessage?.data || {};
  const title = remoteMessage?.notification?.title || data.title || 'Pingload';
  const body = remoteMessage?.notification?.body || data.body || data.message || '';
  if (!title && !body) return;

  const channelId = getPushChannelId(data.channelId || data.type);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Pingload',
      body: body || '',
      data,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: null,
  });
};

export const initFcmBackgroundHandler = () => {
  const messaging = loadMessaging();
  if (!messaging) return;

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // FCM shows the system notification when a `notification` payload is present.
    // For data-only messages, schedule a local notification so users still get alerted.
    if (remoteMessage?.notification?.title || remoteMessage?.notification?.body) return;
    await scheduleDataOnlyNotification(remoteMessage);
  });
};

initFcmBackgroundHandler();
