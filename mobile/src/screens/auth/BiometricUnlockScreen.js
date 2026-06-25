import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PingloadLogo from '../../components/PingloadLogo';
import { LogoLoader } from '../../components/loading';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authenticateWithBiometric, getBiometricSupport } from '../../services/biometricService';

const BiometricUnlockScreen = () => {
  const { completeBiometricUnlock, cancelBiometricUnlock, user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [support, setSupport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBiometricSupport().then(setSupport);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleUnlock();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    setError('');
    const result = await authenticateWithBiometric('Unlock Pingload');
    setLoading(false);

    if (result.success) {
      completeBiometricUnlock();
      return;
    }

    if (result.error !== 'Authentication cancelled') {
      setError(result.error || 'Could not verify biometrics');
    }
  };

  const iconName = support?.hasFace ? 'scan-outline' : 'finger-print-outline';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PingloadLogo size="medium" />
        <Text style={styles.title}>Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}</Text>
        <Text style={styles.subtitle}>Use {support?.label || 'biometrics'} to unlock Pingload</Text>

        <TouchableOpacity style={styles.biometricBtn} onPress={handleUnlock} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <LogoLoader size={72} />
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name={iconName} size={42} color={colors.primary} />
              </View>
              <Text style={styles.btnText}>Unlock with {support?.label || 'Biometrics'}</Text>
            </>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.fallbackBtn} onPress={cancelBiometricUnlock}>
          <Text style={styles.fallbackText}>Use Password Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 24, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 36, textAlign: 'center' },
  biometricBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  error: { color: colors.error, fontSize: 13, marginTop: 16, textAlign: 'center' },
  fallbackBtn: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 20 },
  fallbackText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});

export default BiometricUnlockScreen;
