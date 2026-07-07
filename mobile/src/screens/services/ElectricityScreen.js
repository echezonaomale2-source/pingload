import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ELECTRICITY_PROVIDERS } from '../../utils/constants';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import ProviderSelector from '../../components/ProviderSelector';
import { TransactionPinModal } from '../../components/modals';
import { LogoLoader } from '../../components/loading';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { navigateToForgotTransactionPin } from '../../utils/forgotPinNavigation';
import { useDialog } from '../../hooks/useDialog';

const METER_TYPES = [
  { id: 'prepaid', name: 'Prepaid' },
  { id: 'postpaid', name: 'Postpaid' },
];

const ElectricityScreen = ({ navigation }) => {
  const { user, refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [provider, setProvider] = useState(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const loadProviders = useCallback(async (showError = false) => {
    setLoadingProviders(true);
    try {
      const res = await vtuService.getElectricityPlans();
      const apiProviders = res.data.data || [];
      const merged = apiProviders.map((p) => {
        const meta = ELECTRICITY_PROVIDERS.find((item) => item.id === p.id) || {};
        return { ...meta, ...p, id: p.id, name: p.name };
      });
      setProviders(merged);
    } catch {
      setProviders([]);
      if (showError) {
        dialog.alertError('Error', 'Could not load electricity providers. Pull to refresh.');
      }
    } finally {
      setLoadingProviders(false);
    }
  }, [dialog]);

  useFocusEffect(
    useCallback(() => {
      loadProviders(false);
    }, [loadProviders])
  );

  const handleVerifyMeter = async () => {
    if (!provider || !meterNumber) {
      dialog.alertError('Missing Details', 'Select provider and enter meter number');
      return;
    }

    setVerifying(true);
    try {
      const res = await vtuService.verifyElectricityMeter({
        provider: provider.id,
        meterNumber,
        meterType,
      });
      const name = res.data.data?.customerName;
      setCustomerName(name || '');
      dialog.showSuccess({
        title: 'Meter Verified',
        message: name
          ? `Customer: ${name}\nMeter: ${meterNumber}`
          : 'Meter verified successfully. You can proceed to payment.',
      });
    } catch (err) {
      dialog.alertError('Verification Failed', err.response?.data?.message || 'Could not verify meter number');
      setCustomerName('');
    } finally {
      setVerifying(false);
    }
  };

  const handlePay = () => {
    if (!provider || !meterNumber || !amount) {
      dialog.alertError('Missing Details', 'Please fill in all fields');
      return;
    }
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      dialog.alertError('Invalid Amount', 'Enter a valid amount');
      return;
    }
    if (value < provider.minAmount || value > provider.maxAmount) {
      dialog.alertError(
        'Amount Out of Range',
        `Amount must be between ₦${provider.minAmount} and ₦${provider.maxAmount}`
      );
      return;
    }
    setShowPin(true);
  };

  const confirmPay = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.payElectricity({
        provider: provider.id,
        meterNumber,
        meterType,
        amount: parseFloat(amount),
        phone: user?.phoneNumber,
        pin,
      });
      await refreshBalance();
      handleVtuPurchaseResult({
        response,
        dialog,
        navigation,
        successTitle: 'Electricity Paid',
        successFallback: 'Electricity bill paid successfully!',
      });
    } catch (err) {
      handleVtuPurchaseError(err, dialog, 'Electricity payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loadingProviders} onRefresh={() => loadProviders(true)} />}
      >
        <Text style={styles.title}>Pay Electricity</Text>
        <Text style={styles.subtitle}>Pay your electricity bills instantly</Text>

        {loadingProviders && providers.length === 0 ? (
          <View style={styles.loadingWrap}>
            <LogoLoader size={48} />
            <Text style={styles.loadingText}>Loading providers...</Text>
          </View>
        ) : providers.length > 0 ? (
          <ProviderSelector
            label="Select Provider"
            providers={providers}
            selected={provider?.id || ''}
            onSelect={(id) => {
              setProvider(providers.find((item) => item.id === id) || null);
              setCustomerName('');
            }}
            columns={2}
          />
        ) : null}

        {!loadingProviders && providers.length === 0 && (
          <Text style={styles.emptyText}>No electricity providers available right now.</Text>
        )}

        <Text style={styles.label}>Meter Type</Text>
        <View style={styles.typeRow}>
          {METER_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeBtn, meterType === t.id && styles.typeActive]}
              onPress={() => { setMeterType(t.id); setCustomerName(''); }}
            >
              <Text style={[styles.typeText, meterType === t.id && styles.typeTextActive]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormInput label="Meter Number" value={meterNumber} onChangeText={(v) => { setMeterNumber(v); setCustomerName(''); }} keyboardType="numeric" />
        {customerName ? (
          <View style={styles.verifiedBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.verifiedText}>{customerName}</Text>
          </View>
        ) : null}

        <CustomButton title="Verify Meter" variant="outline" onPress={handleVerifyMeter} loading={verifying} style={styles.verifyBtn} />
        <FormInput
          label={provider ? `Amount (₦${provider.minAmount} – ₦${provider.maxAmount})` : 'Amount (₦)'}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <CustomButton title="Pay Bill" onPress={handlePay} loading={loading} disabled={!provider} />
        <TransactionPinModal visible={showPin} onClose={() => setShowPin(false)} onConfirm={confirmPay} loading={loading} onForgotPin={() => navigateToForgotTransactionPin(navigation, setShowPin)} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  providerBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
  providerActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  providerText: { fontSize: 13, color: colors.text },
  providerTextActive: { color: colors.primary, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  typeActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  typeText: { fontSize: 14, color: colors.text },
  typeTextActive: { color: colors.primary, fontWeight: '700' },
  verifiedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    padding: 12, borderRadius: 12, backgroundColor: colors.successLight,
  },
  verifiedText: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  verifyBtn: { marginBottom: 16 },
  loadingWrap: { alignItems: 'center', marginBottom: 16, paddingVertical: 12 },
  loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 14 },
  emptyText: { color: colors.textSecondary, marginBottom: 16, fontSize: 14 },
});

export default ElectricityScreen;
