import React, { useMemo } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { enrollBiometric, disableBiometric, getBiometricSupport } from '../../services/biometricService';

const SettingsScreen = ({ navigation }) => {
  const { colors, isDark, setDarkMode } = useTheme();
  const { user, updateUser, isAuthenticated } = useAuth();
  const dialog = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [biometric, setBiometric] = React.useState(user?.biometricEnabled || false);
  const [notifications, setNotifications] = React.useState(
    user?.notificationSettings || { transactions: true, promotions: true, security: true }
  );

  const handleDarkMode = (value) => setDarkMode(value);

  const handleSystemTheme = async (value) => {
    if (isAuthenticated) {
      try {
        await authService.updateSettings({ useSystemTheme: value });
        updateUser({ useSystemTheme: value });
      } catch {
        dialog.alertError('Error', 'Could not update theme preference.');
      }
    }
  };

  const handleBiometric = async (value) => {
    if (value) {
      const support = await getBiometricSupport();
      if (!support.available) {
        dialog.showWarning({
          title: 'Biometrics Unavailable',
          message: support.hasHardware
            ? 'Set up Face ID or fingerprint in your device settings first.'
            : 'This device does not support biometric authentication.',
        });
        return;
      }

      const enrolled = await enrollBiometric();
      if (!enrolled.success) {
        dialog.alertError('Setup Failed', enrolled.error || 'Could not enable biometric login.');
        return;
      }

      setBiometric(true);
      try {
        const res = await authService.updateSettings({ biometricEnabled: true });
        updateUser(res.data.data);
        dialog.showSuccess({
          title: 'Biometric Login Enabled',
          message: `${enrolled.label} is now active on this device.`,
        });
      } catch {
        setBiometric(false);
        await disableBiometric();
        dialog.alertError('Error', 'Could not save biometric preference.');
      }
      return;
    }

    setBiometric(false);
    await disableBiometric();
    try {
      const res = await authService.updateSettings({ biometricEnabled: false });
      updateUser(res.data.data);
    } catch {
      setBiometric(true);
      dialog.alertError('Error', 'Could not disable biometric login.');
    }
  };

  const handleNotificationToggle = async (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    try {
      const res = await authService.updateSettings({ notificationSettings: updated });
      updateUser(res.data.data);
    } catch {
      setNotifications(notifications);
    }
  };

  const SettingRow = ({ label, value, onValueChange, icon }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: `${colors.primary}80` }}
        thumbColor={value ? colors.primary : colors.gray}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <SettingRow
          label="Use Device Theme"
          value={user?.useSystemTheme !== false}
          onValueChange={handleSystemTheme}
          icon="phone-portrait-outline"
        />
        {user?.useSystemTheme === false ? (
          <SettingRow label="Dark Mode" value={isDark} onValueChange={handleDarkMode} icon="moon-outline" />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <SettingRow label="Biometric Login" value={biometric} onValueChange={handleBiometric} icon="finger-print-outline" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingRow label="Transactions" value={notifications.transactions} onValueChange={(v) => handleNotificationToggle('transactions', v)} icon="swap-horizontal-outline" />
        <SettingRow label="Promotions" value={notifications.promotions} onValueChange={(v) => handleNotificationToggle('promotions', v)} icon="gift-outline" />
        <SettingRow label="Security Alerts" value={notifications.security} onValueChange={(v) => handleNotificationToggle('security', v)} icon="shield-outline" />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 24 },
  section: { backgroundColor: colors.card, borderRadius: 16, padding: 4, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
});

export default SettingsScreen;
