import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ELECTRICITY_PROVIDERS } from '../../utils/constants';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { TransactionPinModal } from '../../components/modals';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
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

  const [provider, setProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleVerifyMeter = async () => {
    if (!provider || !meterNumber) {
      dialog.alertError('Missing Details', 'Select provider and enter meter number');
      return;
    }

    setVerifying(true);
    try {
      const res = await vtuService.verifyElectricityMeter({ provider, meterNumber, meterType });
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
    setShowPin(true);
  };

  const confirmPay = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.payElectricity({
        provider,
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pay Electricity</Text>
        <Text style={styles.subtitle}>Pay your electricity bills instantly</Text>

        <Text style={styles.label}>Select Provider</Text>
        <View style={styles.providerGrid}>
          {ELECTRICITY_PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.providerBtn, provider === p.id && styles.providerActive]}
              onPress={() => { setProvider(p.id); setCustomerName(''); }}
            >
              <Text style={[styles.providerText, provider === p.id && styles.providerTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
        <FormInput label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" />

        <CustomButton title="Pay Bill" onPress={handlePay} loading={loading} />
        <TransactionPinModal visible={showPin} onClose={() => setShowPin(false)} onConfirm={confirmPay} loading={loading} />
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
});

export default ElectricityScreen;
