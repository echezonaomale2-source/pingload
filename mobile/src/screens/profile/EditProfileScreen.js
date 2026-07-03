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
import { showAvatarPicker, withAvatarCacheBust } from '../../utils/pickAvatar';
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
  const [uploadProgress, setUploadProgress] = useState(null);

  const applyUploadedUser = (uploaded) => {
    updateUser({
      ...uploaded,
      avatar: withAvatarCacheBust(uploaded.avatar),
    });
  };

  const handleAvatarChange = async () => {
    const avatar = await showAvatarPicker();
    if (!avatar) return;

    const previousAvatar = user?.avatar;
    updateUser({ avatar });

    setAvatarLoading(true);
    setUploadProgress(0);
    try {
      const res = await authService.updateAvatarWithRetry(avatar, {
        onProgress: setUploadProgress,
      });
      applyUploadedUser(res.data.data);
      dialog.notifySuccess('Profile photo updated');
    } catch (err) {
      updateUser({ avatar: previousAvatar });
      dialog.alertError(
        'Upload Failed',
        err.response?.data?.message || err.message || 'Failed to upload photo. Please try again.'
      );
    } finally {
      setAvatarLoading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar) return;
    const ok = await dialog.confirm({
      title: 'Remove Photo',
      message: 'Remove your profile photo?',
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    setAvatarLoading(true);
    try {
      const res = await authService.removeAvatar();
      updateUser(res.data.data);
      dialog.notifySuccess('Profile photo removed');
    } catch {
      dialog.alertError('Error', 'Failed to remove avatar');
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
        <UserAvatar
          user={user}
          size={96}
          onPress={handleAvatarChange}
          showEditBadge
          loading={avatarLoading}
          uploadProgress={uploadProgress}
        />
        <TouchableOpacity onPress={handleAvatarChange} disabled={avatarLoading}>
          <Text style={styles.changePhoto}>
            {avatarLoading
              ? (typeof uploadProgress === 'number' ? `Uploading ${uploadProgress}%` : 'Uploading...')
              : 'Change Photo'}
          </Text>
        </TouchableOpacity>
        {user?.avatar ? (
          <TouchableOpacity onPress={handleRemoveAvatar} disabled={avatarLoading}>
            <Text style={styles.removePhoto}>Remove Photo</Text>
          </TouchableOpacity>
        ) : null}
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
  removePhoto: { color: colors.error, fontSize: 13, fontWeight: '600', marginTop: 8 },
});

export default EditProfileScreen;
