import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { LogoLoader } from '../components/loading';
import { LOADING_MESSAGES } from '../utils/loadingMessages';
import { BRAND_TAGLINE } from '../assets/brandAssets';
import { brand } from '../theme/brand';

const SplashScreen = ({ onFinish }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [fadeAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <LogoLoader size={112} />
        <Text style={styles.wordmark}>
          <Text style={styles.wordPing}>Ping</Text>
          <Text style={styles.wordLoad}>load</Text>
        </Text>
        <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
        <Text style={styles.loading}>{LOADING_MESSAGES.DASHBOARD}</Text>
      </Animated.View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: { marginTop: 20, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  wordPing: { color: brand.blue },
  wordLoad: { color: brand.orange },
  tagline: { fontSize: 14, marginTop: 8, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
  loading: { fontSize: 13, marginTop: 16, fontWeight: '700', color: brand.blue },
});

export default SplashScreen;
