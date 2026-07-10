import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getServiceLabel,
  getStatusLabel,
  getTransactionTitle,
} from '../../utils/formatters';
import { transactionService } from '../../services/transactionService';
import { PageLoader } from '../../components/loading';

const DetailRow = ({ label, value, valueColor }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
};

const TransactionDetailsScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionService.getTransactionById(id),
  });

  const tx = data?.data?.data;
  const purchaseDetails = tx?.metadata?.purchaseDetails || {};

  const purchaseDetailRows = useMemo(() => {
    const rows = [];
    const add = (label, value) => {
      if (value !== null && value !== undefined && String(value).trim()) {
        rows.push({ label, value: String(value) });
      }
    };
    add('Phone', purchaseDetails.phone);
    add('Customer', purchaseDetails.customerName);
    add('Meter token', purchaseDetails.token);
    add('Units', purchaseDetails.units);
    add('Product', purchaseDetails.productName);
    if (purchaseDetails.pins?.length) {
      purchaseDetails.pins.forEach((pin, index) => {
        add(`PIN ${index + 1}`, pin.pin || pin.serial);
      });
    } else {
      add('PIN / Code', purchaseDetails.purchasedCode);
    }
    return rows;
  }, [purchaseDetails]);

  if (isLoading) return <PageLoader message="Loading details..." />;

  if (isError || !tx) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Could not load transaction</Text>
          <Text style={styles.errorText}>
            {error?.response?.data?.message || error?.message || 'Please try again.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isRefund = tx.transactionType === 'refund';
  const statusColor = getStatusColor(tx.status, tx.transactionType);
  const isCredit = tx.transactionType === 'credit' || isRefund;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.amountCard}>
        <View style={[styles.statusIcon, { backgroundColor: `${statusColor}20` }]}>
          <Ionicons
            name={isRefund ? 'refresh-circle' : tx.status === 'successful' ? 'checkmark-circle' : tx.status === 'failed' ? 'close-circle' : 'time'}
            size={48}
            color={statusColor}
          />
        </View>
        <Text style={[styles.amount, isCredit && { color: colors.success }]}>
          {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
        </Text>
        <Text style={styles.title}>{getTransactionTitle(tx)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel(tx.status, tx.transactionType)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.details}>
        <DetailRow label="Reference ID" value={tx.reference} />

        {isRefund ? (
          <>
            <DetailRow label="Refund Reference" value={tx.refundReference || tx.reference} />
            <DetailRow label="Original Transaction Reference" value={tx.originalTransactionReference || '—'} />
            <DetailRow label="Refund Amount" value={formatCurrency(tx.refundAmount || tx.amount)} valueColor={colors.success} />
            <DetailRow label="Refund Date" value={formatDate(tx.refundedAt || tx.createdAt)} />
            <DetailRow label="Refund Reason" value={tx.refundReason || '—'} />
            {tx.originalTransaction ? (
              <>
                <DetailRow label="Original Service" value={getServiceLabel(tx.originalTransaction.service)} />
                <DetailRow label="Original Amount" value={formatCurrency(tx.originalTransaction.amount)} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <DetailRow label="Service" value={getServiceLabel(tx.service)} />
            <DetailRow label="Type" value={tx.transactionType} />
            <DetailRow label="Amount" value={formatCurrency(tx.amount)} />
            <DetailRow label="Date" value={formatDate(tx.createdAt)} />
            <DetailRow label="Status" value={getStatusLabel(tx.status, tx.transactionType)} valueColor={statusColor} />
            {tx.description ? <DetailRow label="Description" value={tx.description} /> : null}
            {purchaseDetailRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
            {tx.linkedRefund ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Refund Details</Text>
                </View>
                <DetailRow label="Refund Reference" value={tx.linkedRefund.reference} />
                <DetailRow label="Refund Amount" value={formatCurrency(tx.linkedRefund.amount)} valueColor={colors.success} />
                <DetailRow label="Refund Date" value={formatDate(tx.linkedRefund.refundedAt || tx.linkedRefund.createdAt)} />
                <DetailRow label="Refund Reason" value={tx.linkedRefund.refundReason || tx.metadata?.refundReason || '—'} />
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: 16 },
  amountCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amount: { fontSize: 32, fontWeight: '800', color: colors.text },
  title: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  statusText: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  details: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: '60%', textAlign: 'right' },
  sectionHeader: { paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

export default TransactionDetailsScreen;
