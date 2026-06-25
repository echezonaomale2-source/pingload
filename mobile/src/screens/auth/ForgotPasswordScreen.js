import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import OtpResendTimer from '../../components/OtpResendTimer';
import { authService } from '../../services/authService';
import { useDialog } from '../../hooks/useDialog';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const ForgotPasswordScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [otpRequired, setOtpRequired] = useState(true);
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState('email');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authService.getConfig()
      .then((res) => setOtpRequired(res.data.data?.otpRequired ?? true))
      .catch(() => setOtpRequired(true));
  }, []);

  const handleSendOtp = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (otpRequired) {
        const res = await authService.forgotPassword(email.trim().toLowerCase());
        setDeliveryChannel(res.data.data?.channel || 'email');
        dialog.showSuccess({
          title: 'Reset Code Sent',
          message: res.data.message || 'Check your email or phone for the verification code.',
        });
        setStep('reset');
      } else {
        setStep('reset');
      }
    } catch (err) {
      dialog.alertError('Request Failed', getApiErrorMessage(err, 'Failed to send reset code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authService.forgotPassword(email.trim().toLowerCase());
      setDeliveryChannel(res.data.data?.channel || deliveryChannel);
      dialog.notifySuccess(res.data.message || 'A new reset code has been sent.', 'Code Sent');
    } catch (err) {
      dialog.alertError('Resend Failed', getApiErrorMessage(err, 'Could not resend reset code'));
    } finally {
      setResending(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (otpRequired && !otp) {
      setError('Please enter the OTP code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otpRequired ? otp : undefined,
        newPassword,
      });
      dialog.showSuccess({
        title: 'Password Reset',
        message: 'Your password has been updated. You can now sign in.',
        onClose: () => navigation.navigate('Login'),
      });
    } catch (err) {
      dialog.alertError('Reset Failed', getApiErrorMessage(err, 'Reset failed'));
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
          <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Enter your email to receive a reset code via Termii'
            : otpRequired
              ? `Enter the 6-digit code sent to your ${deliveryChannel === 'sms' ? 'phone' : 'email'} and your new password`
              : 'Enter your new password'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'email' ? (
          <>
            <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomButton title={otpRequired ? 'Send Reset Code' : 'Continue'} onPress={handleSendOtp} loading={loading} />
          </>
        ) : (
          <>
            {otpRequired ? (
              <>
                <FormInput label="OTP Code" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                <OtpResendTimer onResend={handleResend} resending={resending} />
              </>
            ) : null}
            <FormInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <CustomButton title="Reset Password" onPress={handleReset} loading={loading} style={styles.resetBtn} />
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
    width: 72, height: 72, borderRadius: 20, backgroundColor: `${colors.primary}12`,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 32, lineHeight: 22, textAlign: 'center' },
  error: { color: colors.error, marginBottom: 16, fontSize: 14, textAlign: 'center' },
  resetBtn: { marginTop: 16 },
});

export default ForgotPasswordScreen;
