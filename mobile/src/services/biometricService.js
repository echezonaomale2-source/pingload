import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const getBiometricSupport = async () => {
  const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  const hasFace = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );
  const hasFingerprint = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT
  );

  let label = 'Biometrics';
  if (hasFace && hasFingerprint) label = 'Face ID or Fingerprint';
  else if (hasFace) label = 'Face ID';
  else if (hasFingerprint) label = 'Fingerprint';

  return {
    available: hasHardware && isEnrolled,
    hasHardware,
    isEnrolled,
    hasFace,
    hasFingerprint,
    label,
  };
};

export const isBiometricEnabledLocally = async () => {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
};

export const setBiometricEnabledLocally = async (enabled) => {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
};

export const authenticateWithBiometric = async (promptMessage = 'Unlock Pingload') => {
  const support = await getBiometricSupport();
  if (!support.available) {
    return { success: false, error: 'Biometric authentication is not available on this device.' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use Password',
    disableDeviceFallback: false,
    fallbackLabel: 'Use Password',
  });

  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    error: result.error === 'user_cancel'
      ? 'Authentication cancelled'
      : 'Biometric authentication failed',
  };
};

export const enrollBiometric = async () => {
  const support = await getBiometricSupport();
  if (!support.hasHardware) {
    return { success: false, error: 'This device does not support biometric authentication.' };
  }
  if (!support.isEnrolled) {
    return {
      success: false,
      error: 'No biometrics enrolled on this device. Add fingerprint or Face ID in device settings first.',
    };
  }

  const auth = await authenticateWithBiometric('Confirm to enable biometric login');
  if (!auth.success) return auth;

  await setBiometricEnabledLocally(true);
  return { success: true, label: support.label };
};

export const disableBiometric = async () => {
  await setBiometricEnabledLocally(false);
  return { success: true };
};
