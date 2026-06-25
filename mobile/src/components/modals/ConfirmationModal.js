import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import ModalShell from './ModalShell';
import { ModalButton, ModalButtonRow } from './ModalButtons';
import { brand } from '../../theme/brand';

const ConfirmationModal = ({
  visible,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  destructive = false,
}) => (
  <ModalShell visible={visible} onClose={onClose} title={title}>
    <View style={[styles.iconWrap, { backgroundColor: destructive ? `${brand.error}15` : `${brand.blue}12` }]}>
      <Ionicons
        name={destructive ? 'trash-outline' : 'help-circle-outline'}
        size={44}
        color={destructive ? brand.error : brand.blue}
      />
    </View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <ModalButtonRow>
      <ModalButton title={cancelText} onPress={onClose} variant="cancel" />
      <ModalButton
        title={confirmText}
        onPress={onConfirm}
        variant={destructive ? 'danger' : 'primary'}
      />
    </ModalButtonRow>
  </ModalShell>
);

const styles = StyleSheet.create({
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  message: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});

export default ConfirmationModal;
