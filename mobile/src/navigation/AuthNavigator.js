import React, { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

const ONBOARDING_SEEN_KEY = 'pingload_onboarding_seen';
const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_SEEN_KEY)
      .then((value) => setInitialRoute(value === '1' ? 'Login' : 'Onboarding'))
      .catch(() => setInitialRoute('Onboarding'));
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export { ONBOARDING_SEEN_KEY };
export default AuthNavigator;
