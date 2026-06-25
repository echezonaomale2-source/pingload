import React, { useMemo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ProviderCard = ({ provider, selected, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = provider.color || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && {
          borderColor: accent,
          backgroundColor: `${accent}12`,
          shadowColor: accent,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {selected && (
        <View style={[styles.checkBadge, { backgroundColor: accent }]}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      )}

      <View style={[styles.logoWrap, { backgroundColor: colors.background }]}>
        <Image source={provider.logo} style={styles.logo} resizeMode="contain" />
      </View>

      <Text
        style={[styles.name, selected && { color: accent, fontWeight: '800' }]}
        numberOfLines={2}
      >
        {provider.name}
      </Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 132,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logo: {
    width: 56,
    height: 56,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 17,
  },
});

export default ProviderCard;
