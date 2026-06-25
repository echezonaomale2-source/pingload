import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import UserAvatar from '../../components/UserAvatar';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { showAvatarPicker } from '../../utils/pickAvatar';
import { useDialog } from '../../hooks/useDialog';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleAvatarChange = async () => {
    const avatar = await showAvatarPicker();
    if (!avatar) return;

    setAvatarLoading(true);
    try {
      const res = await authService.updateAvatar(avatar);
      updateUser(res.data.data);
      dialog.notifySuccess('Profile photo updated');
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await authService.updateProfile({ fullName, phoneNumber });
      updateUser(res.data.data);
      dialog.showSuccess({
        title: 'Success',
        message: 'Profile updated successfully',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.avatarSection}>
        <UserAvatar user={user} size={96} onPress={handleAvatarChange} showEditBadge />
        <TouchableOpacity onPress={handleAvatarChange} disabled={avatarLoading}>
          <Text style={styles.changePhoto}>{avatarLoading ? 'Uploading...' : 'Change Photo'}</Text>
        </TouchableOpacity>
      </View>

      <FormInput label="Full Name" value={fullName} onChangeText={setFullName} icon="person" />
      <FormInput label="Email" value={user?.email} editable={false} icon="email" />
      <FormInput label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" icon="phone" />
      <CustomButton title="Save Changes" onPress={handleSave} loading={loading} />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  changePhoto: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 10 },
});

export default EditProfileScreen;
