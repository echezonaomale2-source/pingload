import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { ButtonLoader } from './loading';
import { useGlobalLoading } from '../context/LoadingProvider';

const CustomButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  icon,
  size = 'large',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const globalLoading = useGlobalLoading();
  const isBusy = loading || globalLoading;
  const showInlineLoader = loading && !globalLoading;

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        size === 'large' && styles.large,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        (disabled || isBusy) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isBusy}
      activeOpacity={0.85}
    >
      {showInlineLoader ? (
        <ButtonLoader size={26} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[
            styles.text,
            isPrimary && styles.primaryText,
            isSecondary && styles.secondaryText,
            isOutline && styles.outlineText,
          ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  large: { width: '100%' },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, fontWeight: '700' },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.white },
  outlineText: { color: colors.primary },
});

export default CustomButton;
