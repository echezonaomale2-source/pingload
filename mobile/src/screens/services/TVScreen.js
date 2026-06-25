import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TV_PROVIDERS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import ProviderSelector from '../../components/ProviderSelector';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { TransactionPinModal } from '../../components/modals';
import { LogoLoader } from '../../components/loading';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const FALLBACK_PACKAGES = {
  dstv: [
    { code: 'dstv-padi', name: 'DStv Padi', amount: 2950 },
    { code: 'dstv-yanga', name: 'DStv Yanga', amount: 4200 },
    { code: 'dstv-confam', name: 'DStv Confam', amount: 7400 },
    { code: 'dstv-compact', name: 'DStv Compact', amount: 12400 },
  ],
  gotv: [
    { code: 'gotv-smallie', name: 'GOtv Smallie', amount: 1575 },
    { code: 'gotv-jinja', name: 'GOtv Jinja', amount: 3300 },
    { code: 'gotv-jolli', name: 'GOtv Jolli', amount: 4850 },
    { code: 'gotv-max', name: 'GOtv Max', amount: 7200 },
  ],
  startimes: [
    { code: 'nova', name: 'Nova', amount: 1200 },
    { code: 'basic', name: 'Basic', amount: 2500 },
    { code: 'smart', name: 'Smart', amount: 3500 },
    { code: 'classic', name: 'Classic', amount: 4500 },
  ],
};

const TVScreen = ({ navigation }) => {
  const { user, refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [provider, setProvider] = useState('');
  const [smartcard, setSmartcard] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const loadPackages = async (id) => {
    setProvider(id);
    setSelectedPackage(null);
    setCustomerName('');
    setLoadingPackages(true);
    try {
      const res = await vtuService.getTVPackages(id);
      setPackages(res.data.data?.length ? res.data.data : FALLBACK_PACKAGES[id] || []);
    } catch {
      setPackages(FALLBACK_PACKAGES[id] || []);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleVerifySmartcard = async () => {
    if (!provider || !smartcard) {
      dialog.alertError('Missing Details', 'Select provider and enter smartcard number');
      return;
    }

    setVerifying(true);
    try {
      const res = await vtuService.verifyTVSmartcard({ provider, smartcardNumber: smartcard });
      const name = res.data.data?.customerName;
      setCustomerName(name || '');
      dialog.showSuccess({
        title: 'Smartcard Verified',
        message: name
          ? `Customer: ${name}\nSmartcard: ${smartcard}`
          : 'Smartcard verified successfully.',
      });
    } catch (err) {
      dialog.alertError('Verification Failed', err.response?.data?.message || 'Could not verify smartcard');
      setCustomerName('');
    } finally {
      setVerifying(false);
    }
  };

  const handlePay = () => {
    if (!provider || !smartcard || !selectedPackage) {
      dialog.alertError('Missing Details', 'Please fill in all fields');
      return;
    }
    setShowPin(true);
  };

  const confirmPay = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.payTV({
        provider,
        smartcardNumber: smartcard,
        variationCode: selectedPackage.code,
        amount: selectedPackage.amount,
        phone: user?.phoneNumber,
        pin,
      });
      await refreshBalance();
      handleVtuPurchaseResult({
        response,
        dialog,
        navigation,
        successTitle: 'TV Subscription Paid',
        successFallback: 'TV subscription paid successfully!',
      });
    } catch (err) {
      handleVtuPurchaseError(err, dialog, 'TV payment failed');
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
        <Text style={styles.title}>TV Subscription</Text>
        <Text style={styles.subtitle}>Renew your DSTV, GOTV, or Startimes</Text>

        <ProviderSelector
          label="Select Provider"
          providers={TV_PROVIDERS}
          selected={provider}
          onSelect={loadPackages}
          columns={3}
        />

        <FormInput
          label="Smartcard Number"
          value={smartcard}
          onChangeText={(v) => { setSmartcard(v); setCustomerName(''); }}
          keyboardType="numeric"
        />

        {customerName ? (
          <View style={styles.verifiedBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.verifiedText}>{customerName}</Text>
          </View>
        ) : null}

        <CustomButton title="Verify Smartcard" variant="outline" onPress={handleVerifySmartcard} loading={verifying} style={styles.verifyBtn} />

        {loadingPackages && (
          <View style={styles.loadingWrap}>
            <LogoLoader size={48} />
            <Text style={styles.loadingText}>Loading packages...</Text>
          </View>
        )}

        {packages.length > 0 && (
          <>
            <Text style={styles.label}>Select Package</Text>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.code}
                style={[styles.pkgItem, selectedPackage?.code === pkg.code && styles.pkgActive]}
                onPress={() => setSelectedPackage(pkg)}
              >
                <Text style={styles.pkgName}>{pkg.name}</Text>
                <Text style={styles.pkgPrice}>{formatCurrency(pkg.amount)}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <CustomButton title="Pay Subscription" onPress={handlePay} loading={loading} disabled={!selectedPackage} />
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
  verifiedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    padding: 12, borderRadius: 12, backgroundColor: colors.successLight,
  },
  verifiedText: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  verifyBtn: { marginBottom: 16 },
  loadingWrap: { alignItems: 'center', marginBottom: 16, paddingVertical: 12 },
  loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 14 },
  pkgItem: {
    flexDirection: 'row', justifyContent: 'space-between', padding: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8,
  },
  pkgActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  pkgName: { fontSize: 14, fontWeight: '600', color: colors.text },
  pkgPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
});

export default TVScreen;
