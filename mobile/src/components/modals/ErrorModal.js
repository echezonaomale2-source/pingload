import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import ModalShell from './ModalShell';
import { ModalButton } from './ModalButtons';
import { brand } from '../../theme/brand';

const ErrorModal = ({ visible, title = 'Error', message, buttonText = 'OK', onClose }) => (
  <ModalShell visible={visible} onClose={onClose} title={title}>
    <View style={[styles.iconWrap, { backgroundColor: `${brand.error}15` }]}>
      <Ionicons name="close-circle" size={48} color={brand.error} />
    </View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <ModalButton title={buttonText} onPress={onClose} variant="primary" style={styles.fullBtn} />
  </ModalShell>
);

const styles = StyleSheet.create({
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  message: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  fullBtn: { width: '100%', marginTop: 20, flex: undefined },
});

export default ErrorModal;
