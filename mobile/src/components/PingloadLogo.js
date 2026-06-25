import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../utils/colors';
import { logoImage, BRAND_TAGLINE, logoDimensions } from '../assets/brandAssets';

const SIZES = {
  small: 120,
  medium: 180,
  large: 240,
};

const PingloadLogo = ({ size = 'medium', showTagline = false, light = false }) => {
  const width = typeof size === 'number' ? size : (SIZES[size] || SIZES.medium);
  const dims = logoDimensions(width);
  const subColor = light ? 'rgba(255,255,255,0.9)' : colors.textSecondary;

  return (
    <View style={styles.wrap}>
      <Image source={logoImage} style={dims} resizeMode="contain" />
      {showTagline && (
        <Text style={[styles.tagline, { color: subColor }]}>{BRAND_TAGLINE}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tagline: { fontSize: 15, marginTop: 12, fontWeight: '500', textAlign: 'center' },
});

export default PingloadLogo;
