import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, Linking, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { enrollBiometric, disableBiometric, getBiometricSupport } from '../../services/biometricService';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../utils/constants';

const SettingsScreen = ({ navigation }) => {
  const { colors, isDark, setDarkMode } = useTheme();
  const { user, updateUser, isAuthenticated, logout } = useAuth();
  const dialog = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [biometric, setBiometric] = useState(user?.biometricEnabled || false);
  const [notifications, setNotifications] = useState(
    user?.notificationSettings || { transactions: true, promotions: true, security: true }
  );
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    setBiometric(user?.biometricEnabled || false);
    setNotifications(user?.notificationSettings || { transactions: true, promotions: true, security: true });
  }, [user?.biometricEnabled, user?.notificationSettings]);

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

  const handleDeleteAccount = async () => {
    if (!showDeleteForm) {
      setShowDeleteForm(true);
      return;
    }

    if (!deletePassword.trim()) {
      dialog.alertError('Password Required', 'Enter your password to delete your account.');
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Delete Account',
      message: 'This permanently deletes your account and personal data. Transaction records may be retained for compliance.',
      confirmText: 'Delete Account',
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await authService.deleteAccount(deletePassword);
      await logout();
      dialog.showSuccess({
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted.',
      });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Could not delete account.';
      dialog.alertError('Delete Failed', message);
    } finally {
      setDeleting(false);
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

  const LinkRow = ({ label, url, icon }) => (
    <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(url)}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {showDeleteForm ? (
          <View style={styles.deleteForm}>
            <Text style={styles.deleteHint}>
              Enter your password to permanently delete your account.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Account password"
              secureTextEntry
              autoCapitalize="none"
              style={[styles.deleteInput, { borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete Account'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowDeleteForm(false); setDeletePassword(''); }}>
              <Text style={styles.cancelDelete}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.linkRow} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={22} color={colors.error || '#DC2626'} />
              <Text style={[styles.rowLabel, styles.dangerLabel]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <LinkRow label="Terms & Conditions" url={TERMS_URL} icon="document-text-outline" />
        <LinkRow label="Privacy Policy" url={PRIVACY_POLICY_URL} icon="lock-closed-outline" />
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
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  dangerLabel: { color: colors.error || '#DC2626' },
  deleteForm: { padding: 16, gap: 12 },
  deleteHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  deleteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  deleteButton: {
    backgroundColor: colors.error || '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelDelete: { textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
});

export default SettingsScreen;
