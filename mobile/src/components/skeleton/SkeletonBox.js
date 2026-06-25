import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { brand } from '../../theme/brand';

const VARIANTS = {
  default: brand.grayLight,
  blue: `${brand.blue}20`,
  orange: `${brand.orange}18`,
  white: brand.white,
  muted: `${brand.blue}10`,
};

const SkeletonBox = ({ width, height, borderRadius = 8, style, variant = 'default' }) => {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.bone,
        {
          width,
          height,
          borderRadius,
          backgroundColor: VARIANTS[variant] || VARIANTS.default,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  bone: { overflow: 'hidden' },
});

export default SkeletonBox;
