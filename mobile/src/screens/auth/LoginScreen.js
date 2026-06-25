import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import PingloadLogo from '../../components/PingloadLogo';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { enrollBiometric, getBiometricSupport } from '../../services/biometricService';
import { authService } from '../../services/authService';

const LoginScreen = ({ navigation }) => {
  const { login, updateUser } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const offerBiometricEnrollment = async () => {
    const support = await getBiometricSupport();
    if (!support.available) return;

    const enable = await dialog.confirm({
      title: 'Enable Biometric Login?',
      message: `Use ${support.label} for faster and secure access to Pingload on this device.`,
      confirmText: 'Enable',
      cancelText: 'Not Now',
    });

    if (!enable) return;

    const enrolled = await enrollBiometric();
    if (!enrolled.success) {
      dialog.showWarning({ title: 'Biometric Setup Failed', message: enrolled.error });
      return;
    }

    try {
      const res = await authService.updateSettings({ biometricEnabled: true });
      updateUser(res.data.data);
      dialog.showSuccess({
        title: 'Biometric Login Enabled',
        message: `${support.label} is now active for Pingload on this device.`,
      });
    } catch {
      dialog.showWarning({
        title: 'Saved Locally Only',
        message: 'Biometrics enabled on device, but server preference could not be updated.',
      });
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      await offerBiometricEnrollment();
    } catch (err) {
      dialog.alertError('Login Failed', getApiErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <PingloadLogo size="small" />
          </View>

          <Text style={styles.title}>Welcome Back 👋</Text>
          <Text style={styles.subtitle}>Sign in to your Pingload account</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FormInput
            label="Email or Phone Number"
            value={email}
            onChangeText={setEmail}
            icon="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            icon="lock"
            secureTextEntry
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <Checkbox.Android
                status={rememberMe ? 'checked' : 'unchecked'}
                onPress={() => setRememberMe(!rememberMe)}
                color={colors.primary}
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <CustomButton title="Login" onPress={handleLogin} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Sign Up</Text>
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
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 28 },
  error: { color: colors.error, textAlign: 'center', marginBottom: 16, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: -4 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { fontSize: 13, color: colors.textSecondary, marginLeft: -4 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  link: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
});

export default LoginScreen;
