import React, { useEffect, useState, useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

const OtpResendTimer = ({
  onResend,
  resending,
  cooldownSeconds = 60,
  expirySeconds = 90,
  onExpired,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [resendCooldown, setResendCooldown] = useState(cooldownSeconds);
  const [expiryRemaining, setExpiryRemaining] = useState(expirySeconds);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setResendCooldown(cooldownSeconds);
    setExpiryRemaining(expirySeconds);
    setExpired(false);
  }, [cooldownSeconds, expirySeconds]);

  useEffect(() => {
    if (expiryRemaining <= 0) {
      setExpired(true);
      onExpired?.();
      return undefined;
    }
    const timer = setInterval(() => {
      setExpiryRemaining((s) => {
        if (s <= 1) {
          setExpired(true);
          onExpired?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryRemaining, onExpired]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    await onResend();
    setResendCooldown(cooldownSeconds);
    setExpiryRemaining(expirySeconds);
    setExpired(false);
  };

  const canResend = !resending && resendCooldown <= 0;

  return (
    <>
      <Text style={[styles.expiryText, expired && styles.expiredText]}>
        {expired
          ? 'Code expired. Request a new code to continue.'
          : `Code expires in ${expiryRemaining}s`}
      </Text>
      <TouchableOpacity onPress={handleResend} disabled={!canResend} style={styles.wrap}>
        <Text style={[styles.text, !canResend && styles.disabled]}>
          {resending
            ? 'Sending...'
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't receive code? Resend"}
        </Text>
      </TouchableOpacity>
    </>
  );
};

const createStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 16 },
  text: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  disabled: { color: colors.textLight },
  expiryText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 16 },
  expiredText: { color: colors.error, fontWeight: '600' },
});

export default OtpResendTimer;
