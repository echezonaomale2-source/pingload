import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

const PinPad = ({
  pinLength = 4,
  value = '',
  onChange,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = (key) => {
    if (disabled) return;
    if (key === 'back') {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key || value.length >= pinLength) return;
    onChange(`${value}${key}`);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length: pinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { borderColor: colors.primary },
              index < value.length && { backgroundColor: colors.primary },
            ]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {KEYS.map((key, index) => {
          if (key === '') {
            return <View key={`spacer-${index}`} style={styles.key} />;
          }
          return (
            <TouchableOpacity
              key={key === 'back' ? 'back' : key}
              style={styles.key}
              onPress={() => handlePress(key)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              {key === 'back' ? (
                <Ionicons name="backspace-outline" size={26} color={colors.text} />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 28,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius:  7,
    borderWidth: 2,
  },
  grid: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '33.33%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
  },
});

export default PinPad;
