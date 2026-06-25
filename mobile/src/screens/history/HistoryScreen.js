import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { transactionService } from '../../services/transactionService';
import ScreenHeader from '../../components/ScreenHeader';
import TransactionItem from '../../components/TransactionItem';
import { TransactionHistorySkeleton } from '../../components/skeleton';

const FILTERS = ['all', 'successful', 'pending', 'failed', 'refunded'];

const HistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [filter, setFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => transactionService.getTransactions({ status: filter }),
  });

  const transactions = data?.data?.data || [];

  if (isLoading) return <TransactionHistorySkeleton />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Transaction History" subtitle="View all your transactions" />

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => navigation.navigate('TransactionDetails', { id: item._id })}
          />
        )}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: colors.textLight, fontSize: 14 },
});

export default HistoryScreen;
