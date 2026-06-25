import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import ModalShell from './ModalShell';
import { LogoLoader } from '../loading';
import { brand } from '../../theme/brand';
import { LOADING_MESSAGES } from '../../utils/loadingMessages';

const SLOW_DELAY_MS = 3000;

const LoadingModal = ({ visible, message = LOADING_MESSAGES.DEFAULT }) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, message]);

  return (
    <ModalShell visible={visible} onClose={() => {}} showClose={false} showLogo={false} title="">
      <LogoLoader size={72} />
      <Text style={styles.message}>{message}</Text>
      {slow && <Text style={styles.slow}>{LOADING_MESSAGES.SLOW}</Text>}
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  message: { fontSize: 15, fontWeight: '700', color: brand.blue, textAlign: 'center', marginTop: 16 },
  slow: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 10, lineHeight: 20 },
});

export default LoadingModal;
