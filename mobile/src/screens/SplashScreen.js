import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { LogoLoader } from '../components/loading';
import { LOADING_MESSAGES } from '../utils/loadingMessages';
import { BRAND_TAGLINE } from '../assets/brandAssets';
import { brand } from '../theme/brand';

const MIN_SPLASH_MS = 900;
const MAX_SPLASH_MS = 15000;

const SplashScreen = ({ onFinish, bootstrapDone = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const minDoneRef = useRef(false);
  const finishedRef = useRef(false);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    const minTimer = setTimeout(() => {
      minDoneRef.current = true;
      if (bootstrapDone) finishSplash();
    }, MIN_SPLASH_MS);
    const maxTimer = setTimeout(() => {
      if (__DEV__) console.warn('[Splash] Max wait reached — continuing without bootstrap');
      finishSplash();
    }, MAX_SPLASH_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [fadeAnim, bootstrapDone, finishSplash]);

  useEffect(() => {
    if (bootstrapDone && minDoneRef.current) finishSplash();
  }, [bootstrapDone, finishSplash]);

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
