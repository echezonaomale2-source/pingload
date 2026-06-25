import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../utils/colors';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getServiceLabel,
  getTransactionTitle,
  getStatusLabel,
} from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

const TransactionItem = ({ transaction, onPress }) => {
  const { colors } = useTheme();
  const isRefund = transaction.transactionType === 'refund';
  const isCredit = transaction.transactionType === 'credit' || isRefund;
  const statusColor = getStatusColor(transaction.status, transaction.transactionType);
  const title = getTransactionTitle(transaction);

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.icon, { backgroundColor: isRefund ? `${colors.success}20` : isCredit ? colors.successLight : `${colors.primary}18` }]}>
        <Ionicons
          name={isRefund ? 'refresh-circle' : isCredit ? 'arrow-down' : 'arrow-up'}
          size={20}
          color={isRefund || isCredit ? colors.success : colors.primary}
        />
      </View>
      <View style={styles.details}>
        <Text style={[styles.service, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.date, { color: colors.textLight }]}>{formatDate(transaction.refundedAt || transaction.createdAt)}</Text>
        {isRefund && transaction.refundReason ? (
          <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={1}>{transaction.refundReason}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: isCredit ? colors.success : colors.text }]}>
          {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.status, { color: statusColor }]}>{getStatusLabel(transaction.status, transaction.transactionType)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    ...shadows.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: { flex: 1 },
  service: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  date: { fontSize: 12 },
  reason: { fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  status: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

export default TransactionItem;
