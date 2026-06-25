import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from './TabNavigator';
import FundWalletScreen from '../screens/wallet/FundWalletScreen';
import AirtimeScreen from '../screens/services/AirtimeScreen';
import DataScreen from '../screens/services/DataScreen';
import ElectricityScreen from '../screens/services/ElectricityScreen';
import TVScreen from '../screens/services/TVScreen';
import EducationScreen from '../screens/services/EducationScreen';
import BettingScreen from '../screens/services/BettingScreen';
import MoreServicesScreen from '../screens/services/MoreServicesScreen';
import TransactionDetailsScreen from '../screens/history/TransactionDetailsScreen';
import ReferralScreen from '../screens/referral/ReferralScreen';
import SupportScreen from '../screens/support/SupportScreen';
import LiveChatScreen from '../screens/support/LiveChatScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SecurityScreen from '../screens/profile/SecurityScreen';
import TransactionPinScreen from '../screens/profile/TransactionPinScreen';
import KycScreen from '../screens/profile/KycScreen';
import FaqScreen from '../screens/support/FaqScreen';
import TransferScreen from '../screens/wallet/TransferScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen name="FundWallet" component={FundWalletScreen} />
    <Stack.Screen name="Airtime" component={AirtimeScreen} />
    <Stack.Screen name="Data" component={DataScreen} />
    <Stack.Screen name="Electricity" component={ElectricityScreen} />
    <Stack.Screen name="TV" component={TVScreen} />
    <Stack.Screen name="Education" component={EducationScreen} />
    <Stack.Screen name="Betting" component={BettingScreen} />
    <Stack.Screen name="MoreServices" component={MoreServicesScreen} />
    <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
    <Stack.Screen name="Referral" component={ReferralScreen} />
    <Stack.Screen name="Support" component={SupportScreen} />
    <Stack.Screen name="LiveChat" component={LiveChatScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Security" component={SecurityScreen} />
    <Stack.Screen name="TransactionPin" component={TransactionPinScreen} />
    <Stack.Screen name="KYC" component={KycScreen} />
    <Stack.Screen name="FAQ" component={FaqScreen} />
    <Stack.Screen name="Transfer" component={TransferScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
