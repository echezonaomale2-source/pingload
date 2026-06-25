import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../hooks/useDialog';
import ScreenHeader from '../../components/ScreenHeader';
import UserAvatar from '../../components/UserAvatar';
import { ProfileSkeleton } from '../../components/skeleton';
import { authService } from '../../services/authService';
import { showAvatarPicker } from '../../utils/pickAvatar';

const MENU_ITEMS = [
  { id: 'edit', title: 'Edit Profile', icon: 'person-outline', screen: 'EditProfile' },
  { id: 'kyc', title: 'KYC Verification', icon: 'shield-checkmark-outline', screen: 'KYC' },
  { id: 'password', title: 'Change Password', icon: 'key-outline', screen: 'ChangePassword' },
  { id: 'security', title: 'Security', icon: 'lock-closed-outline', screen: 'Security' },
  { id: 'referral', title: 'Refer & Earn', icon: 'gift-outline', screen: 'Referral' },
  { id: 'livechat', title: 'Live Chat', icon: 'chatbubbles-outline', screen: 'LiveChat' },
  { id: 'support', title: 'Contact Support', icon: 'headset-outline', screen: 'Support' },
  { id: 'settings', title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
];

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser, isLoading: authLoading } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await authService.getProfile();
      updateUser(res.data.data);
      return res.data.data;
    },
    staleTime: 30000,
  });

  const isVerified = user?.isEmailVerified || user?.kycStatus === 'verified';

  if (authLoading || (isLoading && !user)) return <ProfileSkeleton />;

  const handleAvatarPress = () => {
    dialog.showActionSheet({
      title: 'Profile Photo',
      options: [
        {
          label: 'Change Photo',
          onPress: async () => {
            const avatar = await showAvatarPicker();
            if (!avatar) return;
            try {
              const res = await authService.updateAvatar(avatar);
              updateUser(res.data.data);
              dialog.notifySuccess('Profile photo updated');
            } catch (err) {
              dialog.alertError('Error', err.response?.data?.message || 'Failed to upload avatar');
            }
          },
        },
        ...(user?.avatar
          ? [{
              label: 'Remove Photo',
              destructive: true,
              onPress: async () => {
                try {
                  const res = await authService.removeAvatar();
                  updateUser(res.data.data);
                  dialog.notifySuccess('Profile photo removed');
                } catch {
                  dialog.alertError('Error', 'Failed to remove avatar');
                }
              },
            }]
          : []),
      ],
    });
  };

  const handleLogout = async () => {
    const ok = await dialog.confirm({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      destructive: true,
    });
    if (ok) logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Profile" />

        <View style={styles.profileCard}>
          <UserAvatar user={user} size={88} onPress={handleAvatarPress} showEditBadge />
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => item.screen && navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    ...shadows.card,
  },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 14 },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: colors.success },
  menu: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: colors.errorLight,
    borderRadius: 14,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.error },
});

export default ProfileScreen;
