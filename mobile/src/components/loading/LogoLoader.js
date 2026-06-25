import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import { brand } from '../../theme/brand';
import { logoImage, logoDimensions } from '../../assets/brandAssets';

const LogoLoader = ({ size = 72, showRing = true, ringSize }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.85)).current;
  const dims = logoDimensions(size);
  const outer = ringSize || Math.max(dims.width, dims.height) + 32;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const rotateAnim = Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 2400, useNativeDriver: true })
    );
    const ringPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringOpacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulseAnim.start();
    rotateAnim.start();
    if (showRing) ringPulse.start();
    return () => {
      pulseAnim.stop();
      rotateAnim.stop();
      ringPulse.stop();
    };
  }, [pulse, rotate, ringOpacity, showRing]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.wrap, { width: outer, height: outer }]}>
      {showRing && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: outer,
              height: outer,
              borderRadius: outer / 2,
              opacity: ringOpacity,
              transform: [{ rotate: spin }],
            },
          ]}
        />
      )}
      <Animated.View style={[styles.logoShadow, { transform: [{ scale: pulse }] }]}>
        <Image source={logoImage} style={dims} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: brand.orange,
    borderTopColor: 'transparent',
    borderLeftColor: brand.blue,
  },
  logoShadow: {
    shadowColor: brand.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default LogoLoader;
