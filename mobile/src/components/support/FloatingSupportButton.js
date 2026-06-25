import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../../theme/brand';

const FloatingSupportButton = ({ onPress, bottomOffset = 16 }) => {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(insets.bottom + bottomOffset), [insets.bottom, bottomOffset]);

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityLabel="Open live chat support"
      accessibilityRole="button"
    >
      <Ionicons name="chatbubbles" size={26} color={brand.white} />
      <View style={styles.dot} />
    </TouchableOpacity>
  );
};

const createStyles = (bottom) => StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.blue,
    borderWidth: 2,
    borderColor: brand.white,
  },
});

export default FloatingSupportButton;
