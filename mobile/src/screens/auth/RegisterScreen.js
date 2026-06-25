import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { authService, OTP_PURPOSE } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../utils/constants';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [form, setForm] = useState({
    fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', referralCode: '',
  });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateForm = () => {
    const { fullName, email, phoneNumber, password, confirmPassword } = form;
    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!agreedTerms) {
      setError('Please agree to the Terms & Conditions');
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    const payload = {
      fullName: form.fullName,
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber,
      password: form.password,
      referralCode: form.referralCode || undefined,
    };

    setLoading(true);
    setError('');

    try {
      const configRes = await authService.getConfig();
      const otpRequired = configRes.data.data?.otpRequired ?? true;

      if (otpRequired) {
        const otpRes = await authService.sendOtp({
          email: payload.email,
          phone: payload.phoneNumber,
          purpose: OTP_PURPOSE.REGISTRATION,
        });
        const channel = otpRes.data.data?.channel;
        navigation.navigate('OtpVerification', {
          ...payload,
          deliveryChannel: channel,
        });
        return;
      }

      await register(payload);
      dialog.showSuccess({
        title: 'Welcome to Pingload',
        message: 'Your account has been created successfully.',
        onClose: () => navigation.navigate('Login'),
      });
    } catch (err) {
      dialog.alertError('Registration Failed', getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Pingload and start saving today</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FormInput label="Full Name" value={form.fullName} onChangeText={(v) => updateForm('fullName', v)} icon="person" />
          <FormInput label="Email Address" value={form.email} onChangeText={(v) => updateForm('email', v)} icon="email" keyboardType="email-address" autoCapitalize="none" />
          <FormInput label="Phone Number" value={form.phoneNumber} onChangeText={(v) => updateForm('phoneNumber', v)} icon="phone" keyboardType="phone-pad" />
          <FormInput label="Password" value={form.password} onChangeText={(v) => updateForm('password', v)} icon="lock" secureTextEntry />
          <FormInput label="Confirm Password" value={form.confirmPassword} onChangeText={(v) => updateForm('confirmPassword', v)} icon="lock" secureTextEntry />
          <FormInput label="Referral Code (Optional)" value={form.referralCode} onChangeText={(v) => updateForm('referralCode', v)} icon="gift" autoCapitalize="characters" />

          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedTerms(!agreedTerms)}>
            <Checkbox.Android
              status={agreedTerms ? 'checked' : 'unchecked'}
              onPress={() => setAgreedTerms(!agreedTerms)}
              color={colors.secondary}
            />
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <CustomButton title="Continue" variant="secondary" onPress={handleContinue} loading={loading} style={styles.btn} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 24 },
  error: { color: colors.error, marginBottom: 16, fontSize: 14 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  termsText: { fontSize: 13, color: colors.textSecondary, flex: 1, marginLeft: -4 },
  termsLink: { color: colors.secondary, fontWeight: '700', textDecorationLine: 'underline' },
  btn: { marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  link: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
});

export default RegisterScreen;
