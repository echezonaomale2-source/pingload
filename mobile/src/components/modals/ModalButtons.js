import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { brand } from '../../theme/brand';
import { ButtonLoader } from '../loading';
import { useGlobalLoading } from '../../context/LoadingProvider';

export const ModalButton = ({ title, onPress, variant = 'primary', loading, disabled, style }) => {
  const globalLoading = useGlobalLoading();
  const isBusy = loading || globalLoading;
  const showInlineLoader = loading && !globalLoading;
  const variants = {
    primary: { bg: brand.blue, text: brand.white },
    secondary: { bg: brand.orange, text: brand.white },
    cancel: { bg: brand.grayLight, text: '#4B5563' },
    danger: { bg: brand.error, text: brand.white },
  };
  const v = variants[variant] || variants.primary;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: v.bg }, (disabled || isBusy) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || isBusy}
      activeOpacity={0.85}
    >
      {showInlineLoader ? (
        <ButtonLoader size={22} />
      ) : (
        <Text style={[styles.btnText, { color: v.text }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export const ModalButtonRow = ({ children }) => (
  <View style={styles.row}>{children}</View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
