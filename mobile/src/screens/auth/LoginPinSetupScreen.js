import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PingloadLogo from '../../components/PingloadLogo';
import PinPad from '../../components/PinPad';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { enrollBiometric, getBiometricSupport } from '../../services/biometricService';
import { authService } from '../../services/authService';

const LoginPinSetupScreen = () => {
  const { finishLoginPinSetup, updateUser } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pinLength, setPinLength] = useState(4);
  const [step, setStep] = useState('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const offerBiometricEnrollment = async () => {
    const support = await getBiometricSupport();
    if (!support.available) return;

    const enable = await dialog.confirm({
      title: 'Enable Biometric Login?',
      message: `Use ${support.label} for faster access next time you open Pingload.`,
      confirmText: 'Enable',
      cancelText: 'Skip',
    });
    if (!enable) return;

    const enrolled = await enrollBiometric();
    if (!enrolled.success) return;

    try {
      const res = await authService.updateSettings({ biometricEnabled: true });
      updateUser(res.data.data);
    } catch {
      // Local biometric still works.
    }
  };

  const savePin = async (confirmedPin) => {
    setSaving(true);
    try {
      await finishLoginPinSetup(confirmedPin);
      await offerBiometricEnrollment();
    } catch {
      dialog.alertError('Setup Failed', 'Could not save your login PIN. Please try again.');
      setStep('create');
      setPin('');
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  };

  const handlePinChange = (next) => {
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

    savePin(next);
  };

  const activeValue = step === 'create' ? pin : confirmPin;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PingloadLogo size="small" />
        <Text style={styles.title}>{step === 'create' ? 'Create Login PIN' : 'Confirm Login PIN'}</Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? `Choose a ${pinLength}-digit PIN for quick and secure access`
            : 'Re-enter your PIN to confirm'}
        </Text>

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

        <PinPad
          pinLength={pinLength}
          value={activeValue}
          onChange={handlePinChange}
          disabled={saving}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
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

export default LoginPinSetupScreen;
