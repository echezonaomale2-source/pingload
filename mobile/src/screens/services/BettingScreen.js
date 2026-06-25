import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BETTING_PLATFORMS } from '../../utils/constants';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import ProviderSelector from '../../components/ProviderSelector';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const BettingScreen = ({ navigation, route }) => {
  const { user, refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [platform, setPlatform] = useState(route.params?.platform || '');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFund = async () => {
    if (!platform || !customerId || !amount) {
      dialog.alertError('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await vtuService.fundBetting({
        platform, customerId, amount: parseFloat(amount), phone: user?.phoneNumber,
      });
      await refreshBalance();
      dialog.showSuccess({
        title: 'Success',
        message: 'Betting wallet funded successfully!',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Funding failed');
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

        <FormInput label="Customer ID / Username" value={customerId} onChangeText={setCustomerId} />
        <FormInput label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <CustomButton title="Fund Wallet" onPress={handleFund} loading={loading} />
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
