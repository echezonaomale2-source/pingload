import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { pinService } from '../../services/pinService';
import { useDialog } from '../../hooks/useDialog';

const TransactionPinScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [hasPin, setHasPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pinService.getStatus().then((res) => setHasPin(res.data.data.hasTransactionPin)).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (pin.length !== 4 || confirmPin.length !== 4) {
      dialog.alertError('Error', 'PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      dialog.alertError('Error', 'PINs do not match');
      return;
    }
    setLoading(true);
    try {
      if (hasPin) {
        await pinService.change(currentPin, pin);
        dialog.showSuccess({
          title: 'Success',
          message: 'Transaction PIN changed successfully',
          onClose: () => navigation.goBack(),
        });
      } else {
        await pinService.create(pin);
        dialog.showSuccess({
          title: 'Success',
          message: 'Transaction PIN created successfully',
          onClose: () => navigation.goBack(),
        });
      }
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Failed to save PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{hasPin ? 'Change Transaction PIN' : 'Create Transaction PIN'}</Text>
      <Text style={styles.subtitle}>A 4-digit PIN is required for purchases and transfers</Text>

      {hasPin && (
        <FormInput label="Current PIN" value={currentPin} onChangeText={(v) => setCurrentPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />
      )}
      <FormInput label="New PIN" value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />
      <FormInput label="Confirm PIN" value={confirmPin} onChangeText={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />

      <CustomButton title={hasPin ? 'Change PIN' : 'Create PIN'} onPress={handleSubmit} loading={loading} />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
});

export default TransactionPinScreen;
