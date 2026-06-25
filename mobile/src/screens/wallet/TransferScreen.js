import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { TransactionPinModal } from '../../components/modals';
import { walletService } from '../../services/walletService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const TransferScreen = ({ navigation }) => {
  const { refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTransfer = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      await walletService.transfer({
        recipient,
        amount: parseFloat(amount),
        pin,
        note,
      });
      await refreshBalance();
      dialog.showSuccess({
        title: 'Success',
        message: 'Transfer completed successfully!',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Transfer Funds</Text>
      <Text style={styles.subtitle}>Send money to another Pingload user</Text>

      <FormInput label="Recipient Email or Phone" value={recipient} onChangeText={setRecipient} placeholder="user@email.com or 08012345678" autoCapitalize="none" />
      <FormInput label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <FormInput label="Note (optional)" value={note} onChangeText={setNote} />

      <CustomButton
        title="Transfer"
        onPress={() => {
          if (!recipient || !amount) {
            dialog.alertError('Error', 'Please fill in recipient and amount');
            return;
          }
          setShowPin(true);
        }}
        loading={loading}
      />

      <TransactionPinModal visible={showPin} onClose={() => setShowPin(false)} onConfirm={handleTransfer} loading={loading} title="Authorize Transfer" />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
});

export default TransferScreen;
