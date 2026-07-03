import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PingloadLogo from '../../components/PingloadLogo';
import PinPad from '../../components/PinPad';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { verifyLoginPin, getLoginPinLength } from '../../services/loginPinService';

const LoginPinUnlockScreen = () => {
  const { user, completeUnlock, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pinLength, setPinLength] = useState(4);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    getLoginPinLength().then(setPinLength);
  }, []);

  useEffect(() => {
    if (pin.length !== pinLength || verifying) return;

    const verify = async () => {
      setVerifying(true);
      setError('');
      const valid = await verifyLoginPin(pin);
      setVerifying(false);

      if (valid) {
        completeUnlock();
        return;
      }

      setAttempts((prev) => prev + 1);
      setPin('');
      setError('Incorrect PIN. Please try again.');
    };

    verify();
  }, [pin, pinLength, verifying, completeUnlock]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PingloadLogo size="small" />
        <Text style={styles.title}>
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.subtitle}>Enter your login PIN</Text>

        <PinPad pinLength={pinLength} value={pin} onChange={setPin} disabled={verifying} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {attempts >= 3 && (
          <TouchableOpacity style={styles.fallbackBtn} onPress={logout}>
            <Text style={styles.fallbackText}>Sign in with password</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  error: { color: colors.error, fontSize: 13, marginTop: 16, textAlign: 'center' },
  fallbackBtn: { marginTop: 28, paddingVertical: 12, paddingHorizontal: 20 },
  fallbackText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default LoginPinUnlockScreen;
