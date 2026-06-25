import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import { walletService } from '../services/walletService';
import { isBiometricEnabledLocally } from '../services/biometricService';
import { syncDeviceTokenWithBackend, updateAppBadgeCount } from '../services/pushNotificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [awaitingBiometric, setAwaitingBiometric] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const profileRes = await authService.getProfile();
      const userData = profileRes.data.data;

      if (userData.accountStatus === 'suspended') {
        await SecureStore.deleteItemAsync('token');
        setUser(null);
        setIsAuthenticated(false);
        setAwaitingBiometric(false);
        return;
      }

      setUser(userData);

      const [localBiometric, balanceRes] = await Promise.all([
        isBiometricEnabledLocally(),
        walletService.getBalance(),
      ]);

      setBalance(balanceRes.data.data.balance);

      if (userData.biometricEnabled && localBiometric) {
        setAwaitingBiometric(true);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        setAwaitingBiometric(false);
        syncDeviceTokenWithBackend().catch(() => {});
      }
    } catch {
      await SecureStore.deleteItemAsync('token');
      setUser(null);
      setIsAuthenticated(false);
      setAwaitingBiometric(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const completeSession = async (userData, token, initialBalance = null) => {
    await SecureStore.setItemAsync('token', token);
    setUser(userData);
    setBalance(initialBalance ?? userData.walletBalance ?? 0);
    setAwaitingBiometric(false);
    setIsAuthenticated(true);
    syncDeviceTokenWithBackend().catch(() => {});
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
    await completeSession(userData, token, 0);
    return res.data;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await updateAppBadgeCount(0);
    setUser(null);
    setBalance(0);
    setIsAuthenticated(false);
    setAwaitingBiometric(false);
  };

  const completeBiometricUnlock = () => {
    setAwaitingBiometric(false);
    setIsAuthenticated(true);
    syncDeviceTokenWithBackend().catch(() => {});
  };

  const cancelBiometricUnlock = async () => {
    await logout();
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
        isLoading,
        isAuthenticated,
        awaitingBiometric,
        login,
        register,
        logout,
        refreshBalance,
        updateUser,
        loadUser,
        completeBiometricUnlock,
        cancelBiometricUnlock,
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
