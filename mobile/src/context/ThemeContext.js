import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { lightTheme, darkTheme } from '../theme/theme';
import { useAuth } from './AuthContext';
import { authService } from '../services/authService';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const { user, updateUser, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    const followSystem = isAuthenticated
      ? (user?.useSystemTheme !== false)
      : true;

    if (followSystem) {
      setIsDark(systemScheme === 'dark');
    } else if (isAuthenticated && user?.darkMode !== undefined) {
      setIsDark(user.darkMode);
    } else {
      setIsDark(systemScheme === 'dark');
    }
  }, [user?.darkMode, user?.useSystemTheme, isAuthenticated, systemScheme]);

  const setDarkMode = useCallback(async (value) => {
    setIsDark(value);

    if (isAuthenticated) {
      try {
        await authService.updateSettings({ darkMode: value, useSystemTheme: false });
        updateUser({ darkMode: value, useSystemTheme: false });
      } catch {
        // keep local preference even if sync fails
      }
    }
  }, [isAuthenticated, updateUser]);

  const toggleTheme = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const appTheme = isDark ? darkTheme : lightTheme;

  const paperTheme = useMemo(() => ({
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    dark: isDark,
    colors: {
      ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
      ...appTheme.paper.colors,
    },
    roundness: appTheme.paper.roundness,
  }), [isDark, appTheme]);

  const navigationTheme = useMemo(() => ({
    ...appTheme.navigation,
    dark: isDark,
  }), [isDark, appTheme]);

  const value = useMemo(() => ({
    isDark,
    colors: appTheme.colors,
    navigationTheme,
    paperTheme,
    toggleTheme,
    setDarkMode,
  }), [isDark, appTheme, navigationTheme, paperTheme, toggleTheme, setDarkMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
