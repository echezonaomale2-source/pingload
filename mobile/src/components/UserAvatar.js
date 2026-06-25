import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const UserAvatar = ({ user, size = 76, onPress, showEditBadge = false }) => {
  const { colors } = useTheme();
  const label = user?.fullName?.charAt(0)?.toUpperCase() || 'U';

  const content = user?.avatar ? (
    <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <Avatar.Text size={size} label={label} style={{ backgroundColor: colors.primary }} />
  );

  if (!onPress && !showEditBadge) {
    return <View>{content}</View>;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.8 : 1} style={styles.wrap}>
      {content}
      {showEditBadge && (
        <View style={[styles.badge, { backgroundColor: colors.secondary, borderColor: colors.card }]}>
          <Ionicons name="camera" size={14} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

export default UserAvatar;
