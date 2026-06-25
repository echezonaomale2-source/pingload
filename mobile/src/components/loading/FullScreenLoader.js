import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import LogoLoader from './LogoLoader';
import { LOADING_MESSAGES } from '../../utils/loadingMessages';
import { useTheme } from '../../context/ThemeContext';

const SLOW_DELAY_MS = 3000;

const FullScreenLoader = ({
  visible,
  message = LOADING_MESSAGES.DEFAULT,
  slow = false,
  slowMessage = LOADING_MESSAGES.SLOW,
  transparent = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [localSlow, setLocalSlow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLocalSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setLocalSlow(true), SLOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, message]);

  if (!visible) return null;

  const showSlowText = slow || localSlow;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, transparent && styles.transparent]}>
        <View style={styles.card}>
          <LogoLoader size={80} />
          <Text style={styles.message}>{message}</Text>
          {showSlowText && <Text style={styles.slow}>{slowMessage}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  transparent: { backgroundColor: `${colors.background}EB` },
  card: { alignItems: 'center', maxWidth: 320 },
  message: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  slow: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FullScreenLoader;
