import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { walletService } from '../services/walletService';
import {
  hydrateSessionToken,
  setSessionToken,
  clearSessionToken,
} from '../services/api';
import { isBiometricEnabledLocally } from '../services/biometricService';
import { setLoginPin, clearLoginPin, cacheLoginPinLength } from '../services/loginPinService';
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
  const [showForgotLoginPin, setShowForgotLoginPin] = useState(false);
  const bootstrapAbortRef = useRef(null);

  const activateSession = useCallback(() => {
    setAwaitingUnlock(null);
    setNeedsLoginPinSetup(false);
    setShowForgotLoginPin(false);
    setIsAuthenticated(true);
    syncDeviceTokenWithBackend().catch(() => {});
    flushPendingNotificationNavigation().catch(() => {});
  }, []);

  const applyUnlockGate = useCallback(async (userData, { forcePinSetup = false } = {}) => {
    // Account-based gate: only first-time accounts without a server Login PIN need setup.
    // requireLoginPinReset must go through Forgot PIN (OTP), not free overwrite.
    if (forcePinSetup || !userData?.hasLoginPin) {
      setNeedsLoginPinSetup(true);
      setAwaitingUnlock(null);
      setShowForgotLoginPin(false);
      setIsAuthenticated(false);
      return;
    }

    if (userData.loginPinLength) {
      await cacheLoginPinLength(userData.loginPinLength);
    }

    const localBiometric = await isBiometricEnabledLocally();
    if (userData.biometricEnabled && localBiometric && !userData.requireLoginPinReset) {
      setAwaitingUnlock('biometric');
    } else {
      setAwaitingUnlock('pin');
    }
    setShowForgotLoginPin(false);
    setNeedsLoginPinSetup(false);
    setIsAuthenticated(false);
  }, []);

  const loadUser = useCallback(async () => {
    bootstrapAbortRef.current?.abort();
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;

    try {
      const token = await withTimeout(hydrateSessionToken(), 5000, 'SecureStore read');
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

        if (status === 401) {
          await clearSessionToken();
          setUser(null);
          setIsAuthenticated(false);
          setAwaitingUnlock(null);
          setNeedsLoginPinSetup(false);
          setShowForgotLoginPin(false);
        }
        return;
      }

      const userData = profileResult.value?.data?.data;
      if (!userData) {
        throw new Error('Invalid profile response');
      }

      if (userData.accountStatus === 'suspended') {
        await clearSessionToken();
        setUser(null);
        setIsAuthenticated(false);
        setAwaitingUnlock(null);
        setNeedsLoginPinSetup(false);
        setShowForgotLoginPin(false);
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
      setUser(null);
      setBalance(0);
      setIsAuthenticated(false);
      setAwaitingUnlock(null);
      setNeedsLoginPinSetup(false);
      setShowForgotLoginPin(false);
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
      setShowForgotLoginPin(false);
      updateAppBadgeCount(0).catch(() => {});
      clearPendingNotificationNav().catch(() => {});
    });
  }, []);

  const completeSession = async (userData, token, initialBalance = null, { isNewAccount = false } = {}) => {
    bootstrapAbortRef.current?.abort();
    bootstrapAbortRef.current = new AbortController();

    // Persist + cache token BEFORE any authenticated follow-up calls.
    await setSessionToken(token);

    // Gate on the account Login PIN, not device-local storage.
    const needsSetup = Boolean(isNewAccount || !userData.hasLoginPin);

    if (userData.loginPinLength) {
      await cacheLoginPinLength(userData.loginPinLength);
    }

    let unlockMode = null;
    if (!needsSetup) {
      const localBiometric = await isBiometricEnabledLocally();
      unlockMode = (userData.biometricEnabled && localBiometric && !userData.requireLoginPinReset)
        ? 'biometric'
        : 'pin';
    }

    setUser(userData);
    setBalance(initialBalance ?? userData.walletBalance ?? 0);
    setNeedsLoginPinSetup(needsSetup);
    setAwaitingUnlock(unlockMode);
    setShowForgotLoginPin(false);
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
    setNeedsLoginPinSetup(true);
    setAwaitingUnlock(null);
    setShowForgotLoginPin(false);
    setIsAuthenticated(false);
  };

  const openForgotLoginPin = () => {
    setShowForgotLoginPin(true);
    setNeedsLoginPinSetup(false);
    setAwaitingUnlock(null);
    setIsAuthenticated(false);
  };

  const closeForgotLoginPin = () => {
    setShowForgotLoginPin(false);
    setAwaitingUnlock('pin');
    setNeedsLoginPinSetup(false);
    setIsAuthenticated(false);
  };

  const finishLoginPinSetup = async (pin) => {
    const normalized = String(pin || '').trim();
    const res = await authService.setupLoginPin(normalized);
    await setLoginPin(normalized);
    const status = res?.data?.data;
    setUser((prev) => (prev ? {
      ...prev,
      hasLoginPin: true,
      loginPinLength: status?.loginPinLength || normalized.length,
      requireLoginPinReset: false,
    } : prev));
    setNeedsLoginPinSetup(false);
    activateSession();
  };

  const finishLoginPinReset = async (status = null) => {
    if (status?.loginPinLength) {
      await cacheLoginPinLength(status.loginPinLength);
    }
    setUser((prev) => (prev ? {
      ...prev,
      hasLoginPin: true,
      loginPinLength: status?.loginPinLength || prev.loginPinLength,
      requireLoginPinReset: false,
    } : prev));
    setShowForgotLoginPin(false);
    activateSession();
  };

  const logout = async () => {
    bootstrapAbortRef.current?.abort();
    // Unregister device token BEFORE server logout revokes the JWT.
    await unregisterPushOnLogout();
    try {
      await authService.logout();
    } catch {
      // Proceed with local cleanup even if server logout fails (offline).
    }
    await clearPendingNotificationNav().catch(() => {});
    await clearSessionToken();
    await updateAppBadgeCount(0);
    setUser(null);
    setBalance(0);
    setIsAuthenticated(false);
    setAwaitingUnlock(null);
    setNeedsLoginPinSetup(false);
    setShowForgotLoginPin(false);
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
        showForgotLoginPin,
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
        finishLoginPinReset,
        openForgotLoginPin,
        closeForgotLoginPin,
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
