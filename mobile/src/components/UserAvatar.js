import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const UserAvatar = ({
  user,
  size = 76,
  onPress,
  showEditBadge = false,
  loading = false,
  uploadProgress = null,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const label = user?.fullName?.charAt(0)?.toUpperCase() || 'U';
  const avatarUri = user?.avatar;

  useEffect(() => {
    setImageError(false);
  }, [avatarUri]);

  const imageKey = avatarUri
    ? (avatarUri.startsWith('data:')
      ? `data-${avatarUri.length}-${avatarUri.slice(-24)}`
      : avatarUri)
    : 'none';

  const showImage = Boolean(avatarUri) && !imageError;
  const content = showImage ? (
    <Image
      key={imageKey}
      source={{ uri: avatarUri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setImageError(true)}
    />
  ) : (
    <Avatar.Text size={size} label={label} style={{ backgroundColor: colors.primary }} />
  );

  const avatarBody = (
    <View style={{ width: size, height: size }}>
      {content}
      {loading && (
        <View style={[styles.overlay, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator color="#fff" />
          {typeof uploadProgress === 'number' && (
            <Text style={styles.progressText}>{Math.max(0, Math.min(100, uploadProgress))}%</Text>
          )}
        </View>
      )}
    </View>
  );

  if (!onPress && !showEditBadge) {
    return avatarBody;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={styles.wrap}
      disabled={loading}
    >
      {avatarBody}
      {showEditBadge && !loading && (
        <View style={[styles.badge, { backgroundColor: colors.secondary, borderColor: colors.card }]}>
          <Ionicons name="camera" size={14} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
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

export default React.memo(UserAvatar);
