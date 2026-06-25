import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import OtpResendTimer from '../../components/OtpResendTimer';
import { authService, OTP_PURPOSE } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const channelLabel = (channel) => {
  if (channel === 'sms') return 'your phone number';
  if (channel === 'email') return 'your email';
  return 'your email or phone';
};

const OtpVerificationScreen = ({ navigation, route }) => {
  const { register } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    email,
    fullName,
    phoneNumber,
    password,
    referralCode,
    deliveryChannel = 'email',
  } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.verifyOtp({
        email,
        otp,
        phone: phoneNumber,
        purpose: OTP_PURPOSE.REGISTRATION,
      });
      await register({ fullName, email, phoneNumber, password, referralCode: referralCode || undefined });
      dialog.showSuccess({
        title: 'Account Created',
        message: 'Welcome to Pingload! Your account is ready.',
      });
    } catch (err) {
      dialog.alertError('Verification Failed', getApiErrorMessage(err, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authService.sendOtp({
        email,
        phone: phoneNumber,
        purpose: OTP_PURPOSE.REGISTRATION,
      });
      dialog.notifySuccess(
        res.data.message || 'A new verification code has been sent.',
        'Code Sent'
      );
    } catch (err) {
      dialog.alertError('Resend Failed', getApiErrorMessage(err, 'Could not resend verification code'));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name={deliveryChannel === 'sms' ? 'phone-portrait-outline' : 'mail'} size={48} color={colors.primary} />
        </View>

        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {channelLabel(deliveryChannel)}
          {'\n'}
          {deliveryChannel === 'sms' ? phoneNumber : email}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FormInput
          label="OTP Code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <CustomButton title="Verify & Create Account" onPress={handleVerify} loading={loading} />
        <OtpResendTimer onResend={handleResend} resending={resending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  flex: { flex: 1 },
  backBtn: { marginBottom: 24 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 22 },
  error: { color: colors.error, textAlign: 'center', marginBottom: 16, fontSize: 14 },
});

export default OtpVerificationScreen;
