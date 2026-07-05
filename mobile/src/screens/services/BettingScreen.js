import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BETTING_PLATFORMS } from '../../utils/constants';
import { normalizePhone } from '../../utils/networkDetection';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import ProviderSelector from '../../components/ProviderSelector';
import { TransactionPinModal } from '../../components/modals';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const MIN_AMOUNT = 100;

const platformColors = Object.fromEntries(
  BETTING_PLATFORMS.map((item) => [item.id, item.color])
);

const mapApiPlatforms = (items = []) => items.map((item) => ({
  id: item.id,
  name: item.name,
  color: platformColors[item.id] || '#EF4444',
  minAmount: item.minAmount || MIN_AMOUNT,
  maxAmount: item.maxAmount,
}));

const BettingScreen = ({ navigation, route }) => {
  const { user, refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [platform, setPlatform] = useState(route.params?.platform || '');
  const [customerId, setCustomerId] = useState('');
  const [phone, setPhone] = useState(normalizePhone(user?.phoneNumber || ''));
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const selectedPlatform = platforms.find((item) => item.id === platform);
  const minAmount = selectedPlatform?.minAmount || MIN_AMOUNT;

  const loadPlatforms = useCallback(async () => {
    setPlatformsLoading(true);
    try {
      const response = await vtuService.getBettingPlatforms();
      const items = mapApiPlatforms(response.data?.data || []);
      setPlatforms(items);
      if (!platform && items.length === 1) {
        setPlatform(items[0].id);
      } else if (platform && !items.some((item) => item.id === platform)) {
        setPlatform('');
      }
    } catch {
      setPlatforms([]);
    } finally {
      setPlatformsLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

  const handleFund = () => {
    if (!platforms.length) {
      dialog.alertError('Unavailable', 'Betting funding is not available right now. Please try again later.');
      return;
    }
    if (!platform || !customerId || !amount || !phone) {
      dialog.alertError('Missing Details', 'Please fill in all fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < minAmount) {
      dialog.alertError('Invalid Amount', `Minimum betting funding is ₦${minAmount}`);
      return;
    }
    if (selectedPlatform?.maxAmount && parsedAmount > selectedPlatform.maxAmount) {
      dialog.alertError('Invalid Amount', `Maximum betting funding is ₦${selectedPlatform.maxAmount}`);
      return;
    }
    setShowPin(true);
  };

  const confirmFund = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.fundBetting({
        platform,
        customerId: customerId.trim(),
        amount: parseFloat(amount),
        phone: normalizePhone(phone),
        pin,
      });
      await refreshBalance();
      handleVtuPurchaseResult({
        response,
        dialog,
        navigation,
        successTitle: 'Betting Wallet Funded',
        successFallback: 'Your betting wallet was funded successfully!',
      });
    } catch (err) {
      handleVtuPurchaseError(err, dialog, 'Betting funding failed');
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
        <Text style={styles.title}>Betting Wallet</Text>
        <Text style={styles.subtitle}>Fund your betting account instantly</Text>

        {platformsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading platforms...</Text>
          </View>
        ) : platforms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Betting funding unavailable</Text>
            <Text style={styles.emptyText}>
              No betting platforms are enabled on our payment provider yet. Please check back later or contact support.
            </Text>
            <CustomButton title="Retry" onPress={loadPlatforms} />
          </View>
        ) : (
          <>
            <ProviderSelector
              label="Select Platform"
              providers={platforms}
              selected={platform}
              onSelect={setPlatform}
              columns={2}
            />

            <FormInput
              label="Customer ID / Username"
              value={customerId}
              onChangeText={setCustomerId}
              autoCapitalize="none"
            />
            <FormInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="08012345678"
            />
            <FormInput
              label="Amount (₦)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={`Minimum ₦${minAmount}`}
            />
            <CustomButton title="Fund Wallet" onPress={handleFund} loading={loading} />
          </>
        )}

        <TransactionPinModal
          visible={showPin}
          onClose={() => setShowPin(false)}
          onConfirm={confirmFund}
          loading={loading}
          title="Authorize Betting Payment"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});

export default BettingScreen;
