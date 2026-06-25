import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { colors as lightColors } from './src/utils/colors';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ModalProvider } from './src/context/ModalContext';
import { ToastProvider } from './src/context/ToastContext';
import DialogApiBinder from './src/context/DialogApiBinder';
import LoadingProvider from './src/context/LoadingProvider';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import SplashScreen from './src/screens/SplashScreen';
import BiometricUnlockScreen from './src/screens/auth/BiometricUnlockScreen';
import { FullScreenLoader } from './src/components/loading';
import ErrorBoundary from './src/components/ErrorBoundary';
import { LOADING_MESSAGES } from './src/utils/loadingMessages';

WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30000 },
  },
});

const PushNotificationBridge = () => {
  usePushNotifications(true);
  return null;
};

const RootNavigator = () => {
  const { isAuthenticated, isLoading, awaitingBiometric } = useAuth();
  const { paperTheme, navigationTheme, isDark, colors } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const statusBarBg = colors?.background ?? lightColors.background;

  let content = null;
  if (showSplash) {
    content = <SplashScreen onFinish={handleSplashFinish} />;
  } else if (isLoading) {
    content = <FullScreenLoader visible message={LOADING_MESSAGES.LOGIN} />;
  } else if (awaitingBiometric) {
    content = <BiometricUnlockScreen />;
  } else {
    content = (
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <PushNotificationBridge />
        {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      {content}
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={statusBarBg} />
    </PaperProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider>
                <ModalProvider>
                  <ToastProvider>
                    <LoadingProvider>
                      <DialogApiBinder />
                      <RootNavigator />
                    </LoadingProvider>
                  </ToastProvider>
                </ModalProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
