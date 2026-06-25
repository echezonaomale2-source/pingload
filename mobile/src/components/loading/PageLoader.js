import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import LogoLoader from './LogoLoader';
import { brand } from '../../theme/brand';
import { LOADING_MESSAGES } from '../../utils/loadingMessages';

const PageLoader = ({ message = LOADING_MESSAGES.DASHBOARD }) => (
  <View style={styles.container}>
    <LogoLoader size={72} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: brand.white,
  },
  message: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '700',
    color: brand.blue,
    textAlign: 'center',
  },
});

export default PageLoader;
