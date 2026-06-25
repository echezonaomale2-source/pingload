import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import ModalShell from './ModalShell';
import { ModalButton, ModalButtonRow } from './ModalButtons';
import { brand } from '../../theme/brand';

const WarningModal = ({
  visible,
  title = 'Warning',
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
}) => (
  <ModalShell visible={visible} onClose={onClose} title={title}>
    <View style={[styles.iconWrap, { backgroundColor: `${brand.warning}18` }]}>
      <Ionicons name="warning" size={44} color={brand.warning} />
    </View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <ModalButtonRow>
      <ModalButton title={cancelText} onPress={onClose} variant="cancel" />
      <ModalButton title={confirmText} onPress={onConfirm} variant="secondary" />
    </ModalButtonRow>
  </ModalShell>
);

const styles = StyleSheet.create({
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  message: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});

export default WarningModal;
