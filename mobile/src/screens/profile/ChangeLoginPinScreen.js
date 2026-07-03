import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PinPad from '../../components/PinPad';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../hooks/useDialog';
import { setLoginPin } from '../../services/loginPinService';

const ChangeLoginPinScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pinLength, setPinLength] = useState(4);
  const [step, setStep] = useState('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePinChange = async (next) => {
    if (saving) return;

    if (step === 'create') {
      setPin(next);
      if (next.length === pinLength) {
        setStep('confirm');
        setConfirmPin('');
      }
      return;
    }

    setConfirmPin(next);
    if (next.length < pinLength) return;

    if (next !== pin) {
      dialog.showWarning({ title: 'PIN Mismatch', message: 'The PINs do not match. Please try again.' });
      setStep('create');
      setPin('');
      setConfirmPin('');
      return;
    }

    setSaving(true);
    try {
      await setLoginPin(next);
      dialog.showSuccess({
        title: 'Login PIN Updated',
        message: 'Your new login PIN has been saved securely.',
        onClose: () => navigation.goBack(),
      });
    } catch {
      dialog.alertError('Update Failed', 'Could not update your login PIN.');
    } finally {
      setSaving(false);
    }
  };

  const activeValue = step === 'create' ? pin : confirmPin;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{step === 'create' ? 'New Login PIN' : 'Confirm Login PIN'}</Text>
      <Text style={styles.subtitle}>Choose a {pinLength}-digit PIN for unlocking Pingload</Text>

      <View style={styles.lengthRow}>
        {[4, 6].map((len) => (
          <TouchableOpacity
            key={len}
            style={[styles.lengthBtn, pinLength === len && styles.lengthBtnActive]}
            onPress={() => {
              if (step !== 'create' || saving) return;
              setPinLength(len);
              setPin('');
              setConfirmPin('');
            }}
            disabled={step !== 'create' || saving}
          >
            <Text style={[styles.lengthText, pinLength === len && styles.lengthTextActive]}>{len} digits</Text>
          </TouchableOpacity>
        ))}
      </View>

      <PinPad pinLength={pinLength} value={activeValue} onChange={handlePinChange} disabled={saving} />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  lengthRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  lengthBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lengthBtnActive: { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
  lengthText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  lengthTextActive: { color: colors.primary },
});

export default ChangeLoginPinScreen;
