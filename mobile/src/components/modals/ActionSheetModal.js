import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import ModalShell from './ModalShell';
import { brand } from '../../theme/brand';

const ActionSheetModal = ({ visible, title, options = [], onClose }) => (
  <ModalShell visible={visible} onClose={onClose} title={title} animation="slide">
    {options.map((opt, i) => (
      <TouchableOpacity
        key={opt.label}
        style={[styles.option, i < options.length - 1 && styles.optionBorder]}
        onPress={() => { onClose(); opt.onPress?.(); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.optionText, opt.destructive && styles.destructive]}>{opt.label}</Text>
      </TouchableOpacity>
    ))}
    <TouchableOpacity style={styles.cancelOption} onPress={onClose} activeOpacity={0.7}>
      <Text style={styles.cancelText}>Cancel</Text>
    </TouchableOpacity>
  </ModalShell>
);

const styles = StyleSheet.create({
  option: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.grayBorder },
  optionText: { fontSize: 16, fontWeight: '600', color: brand.blue },
  destructive: { color: brand.error },
  cancelOption: {
    width: '100%', marginTop: 12, paddingVertical: 14, borderRadius: 14,
    backgroundColor: brand.grayLight, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
});

export default ActionSheetModal;
