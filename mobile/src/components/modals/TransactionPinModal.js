import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import ModalShell from './ModalShell';
import { ModalButton, ModalButtonRow } from './ModalButtons';
import { brand } from '../../theme/brand';

const TransactionPinModal = ({
  visible,
  onClose,
  onConfirm,
  title = 'Enter Transaction PIN',
  subtitle = 'Enter your 4-digit PIN to authorize this transaction',
  loading = false,
}) => {
  const [pin, setPin] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (pin.length !== 4) return;
    onConfirm(pin);
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={title}
      showLogo
      animation="slide"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={28} color={brand.blue} />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        style={styles.hiddenInput}
      />
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>

      <ModalButtonRow>
        <ModalButton title="Cancel" onPress={onClose} variant="cancel" />
        <ModalButton
          title="Confirm"
          onPress={handleConfirm}
          variant="primary"
          loading={loading}
          disabled={pin.length !== 4}
        />
      </ModalButtonRow>
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: `${brand.blue}12`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: brand.grayBorder },
  dotFilled: { backgroundColor: brand.blue, borderColor: brand.blue },
});

export default TransactionPinModal;
