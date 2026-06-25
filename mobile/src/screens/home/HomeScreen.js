import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../../utils/colors';
import { SERVICES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { transactionService, notificationService } from '../../services/transactionService';
import BalanceCard from '../../components/BalanceCard';
import ServiceGrid from '../../components/ServiceGrid';
import TransactionItem from '../../components/TransactionItem';
import PromoBanner from '../../components/PromoBanner';
import { FloatingSupportButton } from '../../components/support';
import { HomeDashboardSkeleton } from '../../components/skeleton';
import { useDialog } from '../../hooks/useDialog';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const HomeScreen = ({ navigation }) => {
  const { user, balance, refreshBalance } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => transactionService.getTransactions({ limit: 5 }),
  });

  const { data: notifData } = useQuery({
    queryKey: ['notificationCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 15000,
  });
  const unreadCount = notifData?.data?.data?.unreadCount || 0;

  const transactions = data?.data?.data || [];

  if (isLoading) return <HomeDashboardSkeleton />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); refreshBalance(); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.fullName?.split(' ')[0] || 'User'} 👋
            </Text>
            <Text style={styles.subGreeting}>What would you like to do today?</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <BalanceCard
          balance={balance}
          onFundPress={() => navigation.navigate('FundWallet')}
          onWithdrawPress={() => dialog.showWarning({ title: 'Coming Soon', message: 'Withdrawals will be available soon.' })}
          onHistoryPress={() => navigation.navigate('History')}
        />

        <ServiceGrid services={SERVICES} onServicePress={(s) => s.screen && navigation.navigate(s.screen)} />
        <PromoBanner />

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <TransactionItem
                key={tx._id}
                transaction={tx}
                onPress={() => navigation.navigate('TransactionDetails', { id: tx._id })}
              />
            ))
          )}
        </View>
      </ScrollView>
      <FloatingSupportButton onPress={() => navigation.navigate('LiveChat')} bottomOffset={24} />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: colors.text },
  subGreeting: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  recentSection: { paddingHorizontal: 16, marginTop: 22, paddingBottom: 28 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recentTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: colors.card,
    borderRadius: 14,
    ...shadows.sm,
  },
  emptyText: { color: colors.textLight, marginTop: 8, fontSize: 14 },
});

export default HomeScreen;
