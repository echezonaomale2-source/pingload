import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NETWORKS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import NetworkSelector from '../../components/NetworkSelector';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { TransactionPinModal } from '../../components/modals';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

const AirtimeScreen = ({ navigation }) => {
  const { refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handlePurchase = () => {
    if (!network || !phone || !amount) {
      dialog.alertError('Missing Details', 'Please fill in all fields');
      return;
    }
    setShowPin(true);
  };

  const confirmPurchase = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.buyAirtime({ network, phone, amount: parseFloat(amount), pin });
      await refreshBalance();
      handleVtuPurchaseResult({
        response,
        dialog,
        navigation,
        successTitle: 'Airtime Purchased',
        successFallback: 'Airtime purchased successfully!',
      });
    } catch (err) {
      handleVtuPurchaseError(err, dialog, 'Airtime purchase failed');
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
        <Text style={styles.title}>Buy Airtime</Text>
        <Text style={styles.subtitle}>Instant airtime top-up for all networks</Text>

        <NetworkSelector networks={NETWORKS} selected={network} onSelect={setNetwork} />
        <FormInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />
        <FormInput label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" />

        <View style={styles.quickGrid}>
          {QUICK_AMOUNTS.map((amt) => (
            <TouchableOpacity key={amt} style={[styles.quickBtn, amount === String(amt) && styles.quickActive]} onPress={() => setAmount(String(amt))}>
              <Text style={[styles.quickText, amount === String(amt) && styles.quickTextActive]}>₦{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <CustomButton title={`Buy ${amount ? formatCurrency(parseFloat(amount)) : 'Airtime'}`} onPress={handlePurchase} loading={loading} />
        <TransactionPinModal visible={showPin} onClose={() => setShowPin(false)} onConfirm={confirmPurchase} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
  quickActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  quickText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  quickTextActive: { color: colors.primary, fontWeight: '700' },
});

export default AirtimeScreen;
