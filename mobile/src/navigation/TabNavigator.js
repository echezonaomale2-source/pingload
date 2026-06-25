import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/home/HomeScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { notificationService } from '../services/transactionService';

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 56;

const getBottomInset = (insets) => {
  if (insets.bottom > 0) return insets.bottom;
  if (Platform.OS === 'android') {
    return initialWindowMetrics?.insets?.bottom ?? 16;
  }
  return 0;
};

const ThemedTabBar = (props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = getBottomInset(insets);

  return (
    <View
      style={[
        styles.tabBarShell,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <BottomTabBar
        {...props}
        insets={{ ...props.insets, bottom: 0 }}
        style={[
          props.style,
          styles.tabBar,
          { backgroundColor: 'transparent' },
        ]}
      />
    </View>
  );
};

const TabNavigator = () => {
  const { colors } = useTheme();

  const { data: notifData } = useQuery({
    queryKey: ['notificationCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 15000,
  });
  const unreadCount = notifData?.data?.data?.unreadCount || 0;

  return (
    <Tab.Navigator
      tabBar={(props) => <ThemedTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT,
          paddingTop: 6,
          paddingBottom: 0,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          height: TAB_BAR_HEIGHT - 6,
          paddingVertical: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            History: focused ? 'time' : 'time-outline',
            Wallet: focused ? 'wallet' : 'wallet-outline',
            Notifications: focused ? 'notifications' : 'notifications-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarShell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
  },
  tabBar: {
    borderTopWidth: 0,
  },
});

export default TabNavigator;
