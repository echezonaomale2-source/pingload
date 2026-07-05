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
import { pinService } from '../../services/pinService';
import { authService } from '../../services/authService';
import { useDialog } from '../../hooks/useDialog';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const ForgotTransactionPinScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [otpRequired, setOtpRequired] = useState(true);
  const [step, setStep] = useState('request');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState('email');
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

  const sendResetCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await pinService.forgotPin();
      setDeliveryChannel(res.data.data?.channel || 'email');
      dialog.showSuccess({
        title: 'Verification Code Sent',
        message: res.data.message || 'Check your email or phone for the code.',
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
      const res = await pinService.forgotPin();
      setDeliveryChannel(res.data.data?.channel || deliveryChannel);
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
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (otpRequired && !otp) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await pinService.resetWithOtp(otpRequired ? otp : undefined, pin);
      dialog.showSuccess({
        title: 'PIN Reset',
        message: 'Your transaction PIN has been updated. Use it for your next purchase or transfer.',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Reset Failed', getApiErrorMessage(err, 'Could not reset transaction PIN'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="finger-print-outline" size={40} color={colors.primary} />
        </View>

        <Text style={styles.title}>Reset Transaction PIN</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'We will send a verification code to confirm it is you before setting a new PIN.'
            : otpRequired
              ? `Enter the 6-digit code sent to ${maskedContact} and choose a new 4-digit PIN.`
              : 'Choose a new 4-digit transaction PIN.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'request' ? (
          <CustomButton
            title={otpRequired ? 'Send Verification Code' : 'Continue'}
            onPress={handleRequest}
            loading={loading}
          />
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
                  expirySeconds={90}
                  onExpired={() => setOtpExpired(true)}
                />
              </>
            ) : null}
            <FormInput
              label="New PIN"
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
            <FormInput
              label="Confirm PIN"
              value={confirmPin}
              onChangeText={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
            <CustomButton title="Reset Transaction PIN" onPress={handleReset} loading={loading} style={styles.resetBtn} />
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
  resetBtn: { marginTop: 16 },
});

export default ForgotTransactionPinScreen;
