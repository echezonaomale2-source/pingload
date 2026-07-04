import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
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
import { usePushNotifications, flushPendingNotificationNavigation } from './src/hooks/usePushNotifications';
import { ProviderLogosProvider } from './src/context/ProviderLogosContext';
import SplashScreen from './src/screens/SplashScreen';
import BiometricUnlockScreen from './src/screens/auth/BiometricUnlockScreen';
import LoginPinSetupScreen from './src/screens/auth/LoginPinSetupScreen';
import LoginPinUnlockScreen from './src/screens/auth/LoginPinUnlockScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { transactionService, notificationService } from './src/services/transactionService';

WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 45000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
    },
  },
});

const PushNotificationBridge = () => {
  const { isAuthenticated } = useAuth();
  usePushNotifications(isAuthenticated);
  return null;
};

const DataPrefetchBridge = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    queryClient.prefetchQuery({
      queryKey: ['recentTransactions'],
      queryFn: () => transactionService.getTransactions({ limit: 5 }),
    });
    queryClient.prefetchQuery({
      queryKey: ['notificationCount'],
      queryFn: () => notificationService.getUnreadCount(),
    });
  }, [isAuthenticated, queryClient]);

  return null;
};

const RootNavigator = () => {
  const {
    isAuthenticated,
    isBootstrapping,
    awaitingUnlock,
    needsLoginPinSetup,
  } = useAuth();
  const { paperTheme, navigationTheme, isDark, colors } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => setSplashDone(true), []);
  const statusBarBg = colors?.background ?? lightColors.background;

  if (!splashDone) {
    return (
      <PaperProvider theme={paperTheme}>
        <SplashScreen onFinish={handleSplashFinish} bootstrapDone={!isBootstrapping} />
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={statusBarBg} />
      </PaperProvider>
    );
  }

  if (needsLoginPinSetup) {
    return (
      <PaperProvider theme={paperTheme}>
        <LoginPinSetupScreen />
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={statusBarBg} />
      </PaperProvider>
    );
  }

  if (awaitingUnlock === 'biometric') {
    return (
      <PaperProvider theme={paperTheme}>
        <BiometricUnlockScreen />
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={statusBarBg} />
      </PaperProvider>
    );
  }

  if (awaitingUnlock === 'pin') {
    return (
      <PaperProvider theme={paperTheme}>
        <LoginPinUnlockScreen />
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={statusBarBg} />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onReady={() => {
          flushPendingNotificationNavigation();
        }}
      >
        <PushNotificationBridge />
        <DataPrefetchBridge />
        {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
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
              <ProviderLogosProvider>
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
              </ProviderLogosProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
