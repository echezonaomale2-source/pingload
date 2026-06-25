import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

/**
 * Standard screen wrapper — applies theme background and safe area.
 * Use instead of hardcoded `colors.background` imports.
 */
const ThemedScreen = ({ children, edges = ['top'], style, contentStyle }) => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, style]} edges={edges}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});

export default ThemedScreen;
