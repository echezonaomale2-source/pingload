import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import PingloadLogo from '../../components/PingloadLogo';
import PinPad from '../../components/PinPad';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getLoginPinLength, cacheLoginPinLength } from '../../services/loginPinService';
import { authService } from '../../services/authService';

const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const LoginPinUnlockScreen = () => {
  const { user, completeUnlock, logout, openForgotLoginPin, forceLoginPinSetup } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pinLength, setPinLength] = useState(user?.loginPinLength || 4);
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
      if (status.loginPinLength === 4 || status.loginPinLength === 6) {
        setPinLength(status.loginPinLength);
        await cacheLoginPinLength(status.loginPinLength);
      }
      if (status.isLocked) {
        setError('Your account is temporarily locked. Use Forgot PIN or sign in with password.');
      }
      if (status.requireLoginPinReset) {
        setError('Please reset your Login PIN with email verification.');
      }
      if (!status.hasLoginPin) {
        await forceLoginPinSetup();
      }
    } catch {
      // Offline — status refresh is best-effort.
    }
  }, [forceLoginPinSetup]);

  useEffect(() => {
    if (user?.loginPinLength === 4 || user?.loginPinLength === 6) {
      setPinLength(user.loginPinLength);
    } else {
      getLoginPinLength().then(setPinLength);
    }
    refreshLockStatus();
  }, [refreshLockStatus, user?.loginPinLength]);

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
    if (lockStatus?.isLocked || lockStatus?.requireLoginPinReset) return;

    const verify = async () => {
      verifyingRef.current = true;
      setVerifying(true);
      setError('');
      setWarning('');

      try {
        await authService.verifyLoginPin({ pin, deviceInfo });
        verifyingRef.current = false;
        setVerifying(false);
        completeUnlock();
        return;
      } catch (err) {
        const status = err.response?.data?.data;
        const message = err.response?.data?.message || 'Incorrect PIN. Please try again.';
        const code = err.response?.data?.code;

        if (code === 'LOGIN_PIN_NOT_SET') {
          await forceLoginPinSetup();
          return;
        }

        if (code === 'LOGIN_PIN_RESET_REQUIRED' || status?.requireLoginPinReset) {
          setLockStatus(status || { requireLoginPinReset: true });
          setError('Please reset your Login PIN with email verification.');
          setPin('');
          verifyingRef.current = false;
          setVerifying(false);
          return;
        }

        if (status) {
          setLockStatus(status);
          setRemainingSeconds(status.remainingSeconds || 0);
          if (status.loginPinLength === 4 || status.loginPinLength === 6) {
            setPinLength(status.loginPinLength);
          }
        }
        setError(message);
        if (status?.failedAttempts === 3 && !status?.isLocked) {
          setWarning('Warning: One more incorrect PIN attempt may temporarily lock your account.');
        }
      }

      setPin('');
      verifyingRef.current = false;
      setVerifying(false);
    };

    verify();
  }, [pin, pinLength, verifying, lockStatus?.isLocked, lockStatus?.requireLoginPinReset, completeUnlock, deviceInfo, forceLoginPinSetup]);

  const isLocked = lockStatus?.isLocked && remainingSeconds > 0;
  const needsReset = Boolean(lockStatus?.requireLoginPinReset);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PingloadLogo size="small" />
        <Text style={styles.title}>
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.subtitle}>
          {needsReset ? 'Reset required before unlock' : 'Enter your login PIN'}
        </Text>

        {!isLocked && !needsReset && !user?.loginPinLength && !lockStatus?.loginPinLength ? (
          <View style={styles.lengthRow}>
            {[4, 6].map((len) => (
              <TouchableOpacity
                key={len}
                style={[styles.lengthBtn, pinLength === len && styles.lengthBtnActive]}
                onPress={() => {
                  setPinLength(len);
                  setPin('');
                }}
                disabled={verifying}
              >
                <Text style={[styles.lengthText, pinLength === len && styles.lengthTextActive]}>{len} digits</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {isLocked ? (
          <View style={styles.lockBox}>
            <Text style={styles.lockTitle}>Account Temporarily Locked</Text>
            <Text style={styles.lockTimer}>{formatCountdown(remainingSeconds)}</Text>
            <Text style={styles.lockHint}>Try again when the timer ends, reset your PIN, or sign in with your password.</Text>
          </View>
        ) : needsReset ? (
          <View style={styles.lockBox}>
            <Text style={styles.lockTitle}>Login PIN Reset Required</Text>
            <Text style={styles.lockHint}>Use Forgot Login PIN to verify your email and set a new PIN.</Text>
          </View>
        ) : (
          <PinPad pinLength={pinLength} value={pin} onChange={setPin} disabled={verifying} />
        )}

        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.forgotBtn} onPress={openForgotLoginPin}>
          <Text style={styles.forgotText}>Forgot Login PIN?</Text>
        </TouchableOpacity>

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
  lengthRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
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
  forgotBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 20 },
  forgotText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  fallbackBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 20 },
  fallbackText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});

export default LoginPinUnlockScreen;
