import React from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { TAWK_PROPERTY_ID, TAWK_WIDGET_ID } from '../utils/constants';

export const openLiveChat = async () => {
  const url = `https://tawk.to/chat/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
  try {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: 'close',
      showTitle: true,
      enableBarCollapsing: true,
    });
  } catch {
    Linking.openURL(url);
  }
};
