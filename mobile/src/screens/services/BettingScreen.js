import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

const BettingScreen = ({ navigation, route }) => {
  const { user, refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [platform, setPlatform] = useState(route.params?.platform || '');
  const [customerId, setCustomerId] = useState('');
  const [phone, setPhone] = useState(normalizePhone(user?.phoneNumber || ''));
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleFund = () => {
    if (!platform || !customerId || !amount || !phone) {
      dialog.alertError('Missing Details', 'Please fill in all fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < MIN_AMOUNT) {
      dialog.alertError('Invalid Amount', `Minimum betting funding is ₦${MIN_AMOUNT}`);
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

        <ProviderSelector
          label="Select Platform"
          providers={BETTING_PLATFORMS}
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
          placeholder={`Minimum ₦${MIN_AMOUNT}`}
        />
        <CustomButton title="Fund Wallet" onPress={handleFund} loading={loading} />
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
});

export default BettingScreen;
