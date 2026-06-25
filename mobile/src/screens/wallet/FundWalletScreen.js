import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../../utils/colors';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { walletService, verifyFundingWithRetry } from '../../services/walletService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Paystack', icon: 'card-outline', desc: 'Card, Bank, USSD' },
  { id: 'bank', label: 'Bank Transfer', icon: 'business-outline', desc: 'Coming soon', disabled: true },
];

const FundWalletScreen = ({ navigation }) => {
  const { refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [pendingReference, setPendingReference] = useState(null);

  const completeFunding = async (reference) => {
    const verifyRes = await verifyFundingWithRetry(reference, { attempts: 12, delayMs: 5000 });
    await refreshBalance();

    const { amount: creditedAmount, alreadyProcessed } = verifyRes.data.data;

    setPendingReference(null);
    dialog.showSuccess({
      title: alreadyProcessed ? 'Already Credited' : 'Payment Successful',
      message: alreadyProcessed
        ? `Your wallet was already credited with ${formatCurrency(creditedAmount)}.`
        : `Your wallet has been credited with ${formatCurrency(creditedAmount)}.`,
      onClose: () => navigation.goBack(),
    });
  };

  const openPaystackCheckout = async (authorizationUrl, reference) => {
    setPendingReference(reference);

    try {
      await WebBrowser.openBrowserAsync(authorizationUrl, {
        dismissButtonStyle: 'close',
        showTitle: true,
        enableBarCollapsing: true,
        createTask: false,
      });
    } catch (browserError) {
      dialog.showWarning({
        title: 'Browser Issue',
        message: 'Could not open Paystack checkout. Tap "Verify Payment" after paying in your browser.',
      });
    }

    const proceed = await dialog.confirm({
      title: 'Verify Payment?',
      message: 'Complete payment on Paystack first, then tap Verify to credit your wallet.',
      confirmText: 'Verify Payment',
      cancelText: 'Not Yet',
    });

    if (!proceed) {
      dialog.showWarning({
        title: 'Payment Pending',
        message: 'Your payment is still pending. Use "Verify Payment" when you have finished paying.',
      });
      return;
    }

    await completeFunding(reference);
  };

  const handleVerifyPending = async () => {
    if (!pendingReference) return;
    setLoading(true);
    try {
      await completeFunding(pendingReference);
    } catch (err) {
      if (err.response?.status === 402) {
        dialog.alertError(
          'Payment Pending',
          getApiErrorMessage(err, 'Payment not completed yet. Finish on Paystack and try again.')
        );
      } else {
        dialog.alertError('Verification Failed', getApiErrorMessage(err, 'Could not verify payment.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 100) {
      dialog.alertError('Invalid Amount', 'Minimum funding amount is ₦100');
      return;
    }
    if (method === 'bank') {
      dialog.showWarning({ title: 'Coming Soon', message: 'Bank transfer funding is not available yet.' });
      return;
    }

    setLoading(true);

    try {
      const configRes = await walletService.getPaymentConfig();
      if (!configRes.data.data?.configured) {
        dialog.alertError(
          'Payment Unavailable',
          'Paystack is not configured on the server. Please contact support.'
        );
        return;
      }

      const res = await walletService.fundWallet(numAmount);
      const { authorizationUrl, reference } = res.data.data;

      await openPaystackCheckout(authorizationUrl, reference);
    } catch (err) {
      dialog.alertError('Payment Failed', getApiErrorMessage(err, 'Funding failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Fund Wallet</Text>
      <Text style={styles.subtitle}>Add money to your Pingload wallet via Paystack</Text>

      {pendingReference ? (
        <View style={styles.pendingBox}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.pendingText}>Payment in progress. Complete checkout on Paystack, then verify.</Text>
          <CustomButton title="Verify Payment" onPress={handleVerifyPending} loading={loading} style={styles.verifyBtn} />
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Payment Method</Text>
      <View style={styles.methodRow}>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.methodCard, method === m.id && styles.methodCardActive, m.disabled && styles.methodDisabled]}
            onPress={() => !m.disabled && setMethod(m.id)}
            activeOpacity={0.8}
          >
            <Ionicons name={m.icon} size={24} color={method === m.id ? colors.primary : colors.textSecondary} />
            <Text style={[styles.methodLabel, method === m.id && styles.methodLabelActive]}>{m.label}</Text>
            <Text style={styles.methodDesc}>{m.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FormInput label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" icon="card" />

      <Text style={styles.quickLabel}>Quick Select</Text>
      <View style={styles.quickGrid}>
        {QUICK_AMOUNTS.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[styles.quickBtn, amount === String(amt) && styles.quickBtnActive]}
            onPress={() => setAmount(String(amt))}
          >
            <Text style={[styles.quickText, amount === String(amt) && styles.quickTextActive]}>
              ₦{amt.toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <CustomButton
        title={`Pay with Paystack ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
        onPress={handleFund}
        loading={loading}
      />

      <View style={styles.secureNote}>
        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        <Text style={styles.secureText}>Secured by Paystack · Use test card 4084084084084081</Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 24 },
  pendingBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    alignItems: 'center',
    gap: 10,
  },
  pendingText: { fontSize: 13, color: colors.text, textAlign: 'center', lineHeight: 20 },
  verifyBtn: { width: '100%', marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    ...shadows.sm,
  },
  methodCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  methodDisabled: { opacity: 0.5 },
  methodLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 6 },
  methodLabelActive: { color: colors.primary },
  methodDesc: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  quickLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  quickBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  quickText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  quickTextActive: { color: colors.primary, fontWeight: '700' },
  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  secureText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', flex: 1 },
});

export default FundWalletScreen;
