import React, { useEffect, useState, useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

const OtpResendTimer = ({ onResend, resending, cooldownSeconds = 60 }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [seconds, setSeconds] = useState(cooldownSeconds);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleResend = async () => {
    await onResend();
    setSeconds(cooldownSeconds);
  };

  const disabled = resending || seconds > 0;

  return (
    <TouchableOpacity onPress={handleResend} disabled={disabled} style={styles.wrap}>
      <Text style={[styles.text, disabled && styles.disabled]}>
        {resending
          ? 'Sending...'
          : seconds > 0
            ? `Resend code in ${seconds}s`
            : "Didn't receive code? Resend"}
      </Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 24 },
  text: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  disabled: { color: colors.textLight },
});

export default OtpResendTimer;
