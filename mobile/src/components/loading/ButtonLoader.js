import React from 'react';
import { View, StyleSheet } from 'react-native';
import LogoLoader from './LogoLoader';
import { brand } from '../../theme/brand';

const ButtonLoader = ({ color = brand.white, size = 28 }) => (
  <View style={styles.wrap}>
    <LogoLoader size={size} showRing={false} />
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', minHeight: 24 },
});

export default ButtonLoader;
