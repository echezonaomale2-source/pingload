import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import { walletService } from '../services/walletService';
import { isBiometricEnabledLocally } from '../services/biometricService';
import { hasLoginPin, setLoginPin, clearLoginPin } from '../services/loginPinService';
import { syncDeviceTokenWithBackend, updateAppBadgeCount } from '../services/pushNotificationService';
import { unregisterPushOnLogout, flushPendingNotificationNavigation } from '../hooks/usePushNotifications';
import { clearPendingNotificationNav } from '../utils/pendingNotificationNav';
import { onAppLocked, onSessionExpired } from '../utils/appLockEvents';

const BOOTSTRAP_TIMEOUT_MS = 12000;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsLoginPinSetup, setNeedsLoginPinSetup] = useState(false);
  const [awaitingUnlock, setAwaitingUnlock] = useState(null);
  const bootstrapAbortRef = useRef(null);

  const activateSession = useCallback(() => {
    setAwaitingUnlock(null);
    setNeedsLoginPinSetup(false);
    setIsAuthenticated(true);
    syncDeviceTokenWithBackend().catch(() => {});
    flushPendingNotificationNavigation().catch(() => {});
  }, []);

  const applyUnlockGate = useCallback(async (userData, { forcePinSetup = false } = {}) => {
    if (forcePinSetup || userData.requireLoginPinReset) {
      if (userData.requireLoginPinReset) {
        await clearLoginPin();
      }
      setNeedsLoginPinSetup(true);
      setAwaitingUnlock(null);
      setIsAuthenticated(false);
      return;
    }

    const pinExists = await hasLoginPin();
    if (!pinExists) {
      setNeedsLoginPinSetup(true);
      setAwaitingUnlock(null);
      setIsAuthenticated(false);
      return;
    }

    const localBiometric = await isBiometricEnabledLocally();
    if (userData.biometricEnabled && localBiometric) {
      setAwaitingUnlock('biometric');
    } else {
      setAwaitingUnlock('pin');
    }
    setIsAuthenticated(false);
  }, []);

  const loadUser = useCallback(async () => {
    bootstrapAbortRef.current?.abort();
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;

    try {
      const token = await withTimeout(
        SecureStore.getItemAsync('token'),
        5000,
        'SecureStore read',
      );
      if (!token) return;
      if (controller.signal.aborted) return;

      const requestConfig = {
        skipGlobalLoader: true,
        skipAuthLogout: true,
        signal: controller.signal,
      };

      const [profileResult, balanceResult] = await Promise.allSettled([
        withTimeout(authService.getProfile(requestConfig), BOOTSTRAP_TIMEOUT_MS, 'Profile'),
        withTimeout(walletService.getBalance(requestConfig), BOOTSTRAP_TIMEOUT_MS, 'Wallet balance'),
      ]);

      if (controller.signal.aborted) return;

      if (profileResult.status === 'rejected') {
        const reason = profileResult.reason;
        const status = reason?.response?.status;
        if (__DEV__) console.warn('[Auth] Profile load failed:', reason?.message);

        // Only wipe the stored JWT on definitive auth failure.
        // Timeouts/network errors must not force a re-login or race a new session.
        if (status === 401) {
          await SecureStore.deleteItemAsync('token');
          setUser(null);
          setIsAuthenticated(false);
          setAwaitingUnlock(null);
          setNeedsLoginPinSetup(false);
        }
        return;
      }

      const userData = profileResult.value?.data?.data;
      if (!userData) {
        throw new Error('Invalid profile response');
      }

      if (userData.accountStatus === 'suspended') {
        await SecureStore.deleteItemAsync('token');
        setUser(null);
        setIsAuthenticated(false);
        setAwaitingUnlock(null);
        setNeedsLoginPinSetup(false);
        return;
      }

      setUser(userData);

      if (balanceResult.status === 'fulfilled') {
        setBalance(balanceResult.value?.data?.data?.balance ?? userData.walletBalance ?? 0);
      } else {
        if (__DEV__) console.warn('[Auth] Balance load failed:', balanceResult.reason?.message);
        setBalance(userData.walletBalance ?? 0);
      }

      await applyUnlockGate(userData);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (__DEV__) console.warn('[Auth] Bootstrap failed:', error?.message);
      // Non-auth bootstrap errors keep the token so the next launch can retry.
      setUser(null);
      setBalance(0);
      setIsAuthenticated(false);
      setAwaitingUnlock(null);
      setNeedsLoginPinSetup(false);
    } finally {
      if (!controller.signal.aborted) {
        setIsBootstrapping(false);
      }
    }
  }, [applyUnlockGate]);

  useEffect(() => {
    const watchdog = setTimeout(() => setIsBootstrapping(false), BOOTSTRAP_TIMEOUT_MS + 3000);
    loadUser().finally(() => clearTimeout(watchdog));
    return () => {
      clearTimeout(watchdog);
      bootstrapAbortRef.current?.abort();
    };
  }, [loadUser]);

  useEffect(() => {
    return onAppLocked(() => {
      setIsAuthenticated(false);
      if (user) {
        applyUnlockGate(user);
      }
    });
  }, [user, applyUnlockGate]);

  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setBalance(0);
      setIsAuthenticated(false);
      setAwaitingUnlock(null);
      setNeedsLoginPinSetup(false);
      updateAppBadgeCount(0).catch(() => {});
      clearPendingNotificationNav().catch(() => {});
    });
  }, []);

  const completeSession = async (userData, token, initialBalance = null, { isNewAccount = false } = {}) => {
    // Cancel any in-flight bootstrap calls so their late responses cannot race this session.
    bootstrapAbortRef.current?.abort();
    bootstrapAbortRef.current = new AbortController();

    await SecureStore.setItemAsync('token', token);

    // Resolve unlock/PIN gates before committing user into React state so RootNavigator
    // never briefly treats a logged-in user as fully unauthenticated.
    let needsSetup = Boolean(isNewAccount || userData.requireLoginPinReset);
    if (userData.requireLoginPinReset) {
      await clearLoginPin();
    }
    if (!needsSetup) {
      needsSetup = !(await hasLoginPin());
    }

    let unlockMode = null;
    if (!needsSetup) {
      const localBiometric = await isBiometricEnabledLocally();
      unlockMode = (userData.biometricEnabled && localBiometric) ? 'biometric' : 'pin';
    }

    setUser(userData);
    setBalance(initialBalance ?? userData.walletBalance ?? 0);
    setNeedsLoginPinSetup(needsSetup);
    setAwaitingUnlock(unlockMode);
    setIsAuthenticated(false);
    setIsBootstrapping(false);
  };

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { token, user: userData } = res.data.data;

    if (userData.accountStatus === 'suspended') {
      const error = new Error('Your account has been suspended. Please contact support.');
      error.response = { data: { message: error.message } };
      throw error;
    }

    await completeSession(userData, token);
    return res.data;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    const { token, user: userData } = res.data.data;
    await completeSession(userData, token, 0, { isNewAccount: true });
    return res.data;
  };

  const forceLoginPinSetup = async () => {
    await clearLoginPin();
    setNeedsLoginPinSetup(true);
    setAwaitingUnlock(null);
    setIsAuthenticated(false);
  };

  const finishLoginPinSetup = async (pin) => {
    await authService.setupLoginPin(pin);
    await setLoginPin(pin);
    setNeedsLoginPinSetup(false);
    activateSession();
  };

  const logout = async () => {
    bootstrapAbortRef.current?.abort();
    try {
      await authService.logout();
    } catch {
      // Proceed with local cleanup even if server logout fails (offline).
    }
    await unregisterPushOnLogout();
    await clearPendingNotificationNav().catch(() => {});
    await SecureStore.deleteItemAsync('token');
    await updateAppBadgeCount(0);
    setUser(null);
    setBalance(0);
    setIsAuthenticated(false);
    setAwaitingUnlock(null);
    setNeedsLoginPinSetup(false);
  };

  const logoutAndClearPin = async () => {
    await clearLoginPin();
    await logout();
  };

  const completeUnlock = () => {
    activateSession();
  };

  const switchToPinUnlock = () => {
    setAwaitingUnlock('pin');
  };

  const refreshBalance = async () => {
    try {
      const res = await walletService.getBalance();
      setBalance(res.data.data.balance);
    } catch {
      // silent fail
    }
  };

  const updateUser = (data) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        balance,
        isLoading: isBootstrapping,
        isBootstrapping,
        isAuthenticated,
        needsLoginPinSetup,
        awaitingUnlock,
        awaitingBiometric: awaitingUnlock === 'biometric',
        login,
        register,
        logout,
        logoutAndClearPin,
        refreshBalance,
        updateUser,
        loadUser,
        completeUnlock,
        switchToPinUnlock,
        forceLoginPinSetup,
        finishLoginPinSetup,
        completeBiometricUnlock: completeUnlock,
        cancelBiometricUnlock: switchToPinUnlock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
