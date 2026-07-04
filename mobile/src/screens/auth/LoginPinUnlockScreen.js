import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import PingloadLogo from '../../components/PingloadLogo';
import PinPad from '../../components/PinPad';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { verifyLoginPin, getLoginPinLength } from '../../services/loginPinService';
import { authService } from '../../services/authService';

const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const LoginPinUnlockScreen = () => {
  const { user, completeUnlock, logout, forceLoginPinSetup } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pinLength, setPinLength] = useState(4);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lockStatus, setLockStatus] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const verifyingRef = useRef(false);

  const deviceInfo = useMemo(() => {
    const parts = [Device.modelName, Device.osName, Device.osVersion].filter(Boolean);
    return parts.join(' / ') || 'Unknown device';
  }, []);

  const refreshLockStatus = useCallback(async () => {
    try {
      const res = await authService.getLoginPinStatus();
      const status = res.data.data;
      setLockStatus(status);
      setRemainingSeconds(status.remainingSeconds || 0);
      if (status.isLocked) {
        setError('Your account is temporarily locked. Please try again later or sign in with password.');
      }
      if (status.requireLoginPinReset) {
        await forceLoginPinSetup();
        return;
      }
    } catch {
      // Offline — allow local verify only; backend sync on next success/failure
    }
  }, [forceLoginPinSetup]);

  useEffect(() => {
    getLoginPinLength().then(setPinLength);
    refreshLockStatus();
  }, [refreshLockStatus, forceLoginPinSetup]);

  useEffect(() => {
    if (!lockStatus?.isLocked || remainingSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          refreshLockStatus();
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockStatus?.isLocked, remainingSeconds, refreshLockStatus]);

  useEffect(() => {
    if (pin.length !== pinLength || verifying || verifyingRef.current) return;
    if (lockStatus?.isLocked) return;

    const verify = async () => {
      verifyingRef.current = true;
      setVerifying(true);
      setError('');
      setWarning('');

      const valid = await verifyLoginPin(pin);

      if (valid) {
        try {
          await authService.recordLoginPinSuccess({ deviceInfo });
        } catch {
          // Best effort
        }
        verifyingRef.current = false;
        setVerifying(false);
        completeUnlock();
        return;
      }

      try {
        const res = await authService.recordLoginPinFailure({ deviceInfo });
        const status = res.data?.data;
        if (status) {
          setLockStatus(status);
          setRemainingSeconds(status.remainingSeconds || 0);
        }
        setError(res.data?.message || 'Incorrect PIN. Please try again.');
        if (status?.failedAttempts === 3 && !status?.isLocked) {
          setWarning('Warning: One more incorrect PIN attempt may temporarily lock your account.');
        }
      } catch (err) {
        const status = err.response?.data?.data;
        const message = err.response?.data?.message || 'Incorrect PIN. Please try again.';
        if (status) {
          setLockStatus(status);
          setRemainingSeconds(status.remainingSeconds || 0);
        }
        setError(message);
        if (status?.failedAttempts >= 3 && !status?.isLocked) {
          setWarning('Warning: One more incorrect PIN attempt may temporarily lock your account.');
        }
      }

      setPin('');
      verifyingRef.current = false;
      setVerifying(false);
    };

    verify();
  }, [pin, pinLength, verifying, lockStatus?.isLocked, completeUnlock, deviceInfo]);

  const isLocked = lockStatus?.isLocked && remainingSeconds > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PingloadLogo size="small" />
        <Text style={styles.title}>
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.subtitle}>Enter your login PIN</Text>

        {isLocked ? (
          <View style={styles.lockBox}>
            <Text style={styles.lockTitle}>Account Temporarily Locked</Text>
            <Text style={styles.lockTimer}>{formatCountdown(remainingSeconds)}</Text>
            <Text style={styles.lockHint}>Try again when the timer ends or sign in with your password.</Text>
          </View>
        ) : (
          <PinPad pinLength={pinLength} value={pin} onChange={setPin} disabled={verifying} />
        )}

        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.fallbackBtn} onPress={logout}>
          <Text style={styles.fallbackText}>Sign in with password</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  warning: { color: colors.warning || '#E6A817', fontSize: 13, marginTop: 16, textAlign: 'center', fontWeight: '600' },
  error: { color: colors.error, fontSize: 13, marginTop: 16, textAlign: 'center' },
  lockBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: `${colors.error}12`,
    width: '100%',
  },
  lockTitle: { fontSize: 16, fontWeight: '700', color: colors.error, textAlign: 'center' },
  lockTimer: { fontSize: 36, fontWeight: '800', color: colors.error, marginVertical: 12 },
  lockHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  fallbackBtn: { marginTop: 28, paddingVertical: 12, paddingHorizontal: 20 },
  fallbackText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default LoginPinUnlockScreen;
