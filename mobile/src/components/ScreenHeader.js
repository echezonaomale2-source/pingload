import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

const ScreenHeader = ({ title, subtitle }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});

export default ScreenHeader;
