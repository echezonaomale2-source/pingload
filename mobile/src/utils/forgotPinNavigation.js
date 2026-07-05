/** Close PIN modal and open OTP-based transaction PIN reset. */
export const navigateToForgotTransactionPin = (navigation, setShowPin) => {
  setShowPin(false);
  navigation.navigate('ForgotTransactionPin');
};
