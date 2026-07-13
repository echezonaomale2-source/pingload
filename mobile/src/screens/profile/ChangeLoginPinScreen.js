import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PinPad from '../../components/PinPad';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../hooks/useDialog';
import { authService } from '../../services/authService';
import { setLoginPin, getLoginPinLength } from '../../services/loginPinService';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const ChangeLoginPinScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentPinLength, setCurrentPinLength] = useState(4);
  const [pinLength, setPinLength] = useState(4);
  const [step, setStep] = useState('current');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authService.getLoginPinStatus();
        const len = res.data.data?.loginPinLength;
        if (len === 4 || len === 6) {
          setCurrentPinLength(len);
          setPinLength(len);
          return;
        }
      } catch {
        // fall through
      }
      const cached = await getLoginPinLength();
      setCurrentPinLength(cached);
      setPinLength(cached);
    })();
  }, []);

  const handlePinChange = async (next) => {
    if (saving) return;

    if (step === 'current') {
      setCurrentPin(next);
      if (next.length === currentPinLength) {
        setStep('create');
        setPin('');
      }
      return;
    }

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
      await authService.changeLoginPin(currentPin, next);
      await setLoginPin(next);
      dialog.showSuccess({
        title: 'Login PIN Updated',
        message: 'Your new login PIN has been saved to your account and works on all your devices.',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Update Failed', getApiErrorMessage(err, 'Could not update your login PIN.'));
      setStep('current');
      setCurrentPin('');
      setPin('');
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  };

  const activeValue = step === 'current' ? currentPin : step === 'create' ? pin : confirmPin;
  const activeLength = step === 'current' ? currentPinLength : pinLength;
  const title = step === 'current'
    ? 'Current Login PIN'
    : step === 'create'
      ? 'New Login PIN'
      : 'Confirm Login PIN';
  const subtitle = step === 'current'
    ? 'Enter your current Login PIN to continue'
    : `Choose a ${pinLength}-digit PIN for unlocking Pingload`;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {step !== 'current' ? (
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
      ) : null}

      <PinPad pinLength={activeLength} value={activeValue} onChange={handlePinChange} disabled={saving} />

      <TouchableOpacity
        style={styles.forgotBtn}
        onPress={() => navigation.navigate('ForgotLoginPin')}
        disabled={saving}
      >
        <Text style={styles.forgotText}>Forgot Login PIN?</Text>
      </TouchableOpacity>
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
  forgotBtn: { marginTop: 28, alignItems: 'center', paddingVertical: 12 },
  forgotText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default ChangeLoginPinScreen;
