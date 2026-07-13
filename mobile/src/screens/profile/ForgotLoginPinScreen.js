import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import OtpResendTimer from '../../components/OtpResendTimer';
import { authService } from '../../services/authService';
import { setLoginPin } from '../../services/loginPinService';
import { useDialog } from '../../hooks/useDialog';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const DEFAULT_EXPIRY_SECONDS = 600;

/**
 * Forgot Login PIN — OTP verification then set a new account PIN.
 * Works as a stack screen (Security) or as a root gate (app unlock).
 */
const ForgotLoginPinScreen = ({ navigation, asRootGate = false }) => {
  const dialog = useDialog();
  const { user, finishLoginPinReset, closeForgotLoginPin, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [otpRequired, setOtpRequired] = useState(true);
  const [step, setStep] = useState('request');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLength, setPinLength] = useState(4);
  const [deliveryChannel, setDeliveryChannel] = useState('email');
  const [expirySeconds, setExpirySeconds] = useState(DEFAULT_EXPIRY_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [otpExpired, setOtpExpired] = useState(false);

  useEffect(() => {
    authService.getConfig()
      .then((res) => setOtpRequired(res.data.data?.otpRequired ?? true))
      .catch(() => setOtpRequired(true));
  }, []);

  const maskedContact = useMemo(() => {
    if (deliveryChannel === 'sms' && user?.phoneNumber) {
      const phone = user.phoneNumber;
      return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
    }
    if (user?.email) {
      const [name, domain] = user.email.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    return 'your registered contact';
  }, [user, deliveryChannel]);

  const goBack = () => {
    if (asRootGate) {
      closeForgotLoginPin();
      return;
    }
    navigation.goBack();
  };

  const sendResetCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.forgotLoginPin();
      setDeliveryChannel(res.data.data?.channel || 'email');
      setExpirySeconds(res.data.data?.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      dialog.showSuccess({
        title: 'Verification Code Sent',
        message: res.data.message || 'Check your email for the code.',
      });
      setStep('reset');
      setOtpExpired(false);
    } catch (err) {
      dialog.alertError('Request Failed', getApiErrorMessage(err, 'Could not send verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (otpRequired) {
      await sendResetCode();
      return;
    }
    setStep('reset');
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authService.forgotLoginPin();
      setDeliveryChannel(res.data.data?.channel || deliveryChannel);
      setExpirySeconds(res.data.data?.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      dialog.notifySuccess(res.data.message || 'A new code has been sent.', 'Code Sent');
      setOtpExpired(false);
    } catch (err) {
      dialog.alertError('Resend Failed', getApiErrorMessage(err, 'Could not resend code'));
    } finally {
      setResending(false);
    }
  };

  const handleReset = async () => {
    if (otpRequired && otpExpired) {
      setError('Your code has expired. Please request a new one.');
      return;
    }
    if (pin.length !== pinLength || confirmPin.length !== pinLength) {
      setError(`PIN must be exactly ${pinLength} digits`);
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (otpRequired && otp.length !== 6) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authService.resetLoginPinWithOtp(otpRequired ? otp : undefined, pin);
      await setLoginPin(pin);
      dialog.showSuccess({
        title: 'Login PIN Reset',
        message: 'Your Login PIN has been updated on your account. It will work on all your devices.',
        onClose: () => {
          if (asRootGate) {
            finishLoginPinReset(res.data.data);
            return;
          }
          navigation.goBack();
        },
      });
    } catch (err) {
      dialog.alertError('Reset Failed', getApiErrorMessage(err, 'Could not reset login PIN'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="lock-open-outline" size={40} color={colors.primary} />
        </View>

        <Text style={styles.title}>Reset Login PIN</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'We will send a verification code to confirm it is you before setting a new Login PIN.'
            : otpRequired
              ? `Enter the 6-digit code sent to ${maskedContact} and choose a new Login PIN.`
              : 'Choose a new Login PIN.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'request' ? (
          <>
            <CustomButton
              title={otpRequired ? 'Send Verification Code' : 'Continue'}
              onPress={handleRequest}
              loading={loading}
            />
            {asRootGate ? (
              <TouchableOpacity style={styles.fallbackBtn} onPress={logout}>
                <Text style={styles.fallbackText}>Sign in with password</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <>
            {otpRequired ? (
              <>
                <FormInput
                  label="Verification Code"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!otpExpired}
                />
                <OtpResendTimer
                  onResend={handleResend}
                  resending={resending}
                  expirySeconds={expirySeconds}
                  onExpired={() => setOtpExpired(true)}
                />
              </>
            ) : null}

            <View style={styles.lengthRow}>
              {[4, 6].map((len) => (
                <TouchableOpacity
                  key={len}
                  style={[styles.lengthBtn, pinLength === len && styles.lengthBtnActive]}
                  onPress={() => {
                    setPinLength(len);
                    setPin('');
                    setConfirmPin('');
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.lengthText, pinLength === len && styles.lengthTextActive]}>{len} digits</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormInput
              label="New Login PIN"
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, pinLength))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={pinLength}
            />
            <FormInput
              label="Confirm Login PIN"
              value={confirmPin}
              onChangeText={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, pinLength))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={pinLength}
            />
            <CustomButton title="Reset Login PIN" onPress={handleReset} loading={loading} style={styles.resetBtn} />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  flex: { flex: 1 },
  backBtn: { marginBottom: 16 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 22,
    textAlign: 'center',
  },
  error: { color: colors.error, marginBottom: 16, fontSize: 14, textAlign: 'center' },
  lengthRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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
  resetBtn: { marginTop: 16 },
  fallbackBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
  fallbackText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default ForgotLoginPinScreen;
