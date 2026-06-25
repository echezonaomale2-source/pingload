import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { authService } from '../../services/authService';
import { useDialog } from '../../hooks/useDialog';

const ChangePasswordScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (newPassword !== confirmPassword) {
      dialog.alertError('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      dialog.alertError('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      dialog.showSuccess({
        title: 'Success',
        message: 'Password changed successfully',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Change Password</Text>
      <FormInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
      <FormInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <FormInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <CustomButton title="Update Password" onPress={handleChange} loading={loading} />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 24 },
});

export default ChangePasswordScreen;
