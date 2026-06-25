import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import ProviderCard from './ProviderCard';

const ProviderSelector = ({
  label,
  providers,
  selected,
  onSelect,
  columns = 2,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, columns), [colors, columns]);

  const rows = [];
  for (let i = 0; i < providers.length; i += columns) {
    rows.push(providers.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              selected={selected === provider.id}
              onPress={() => onSelect(provider.id)}
            />
          ))}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`spacer-${i}`} style={styles.spacer} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors, columns) => StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  spacer: {
    flex: 1,
  },
});

export default ProviderSelector;
