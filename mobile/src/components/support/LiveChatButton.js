import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brand } from '../../theme/brand';

const LiveChatButton = ({ onPress, compact = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconWrap}>
        <Ionicons name="chatbubbles" size={compact ? 22 : 26} color={brand.white} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Live Chat</Text>
        {!compact && (
          <Text style={styles.subtitle}>Chat with Pingload support — available 24/7</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={brand.white} />
    </TouchableOpacity>
  );
};

const createStyles = (colors, compact) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: compact ? 14 : 18,
    borderRadius: 16,
    backgroundColor: brand.blue,
    gap: 14,
    shadowColor: brand.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  iconWrap: {
    width: compact ? 40 : 48,
    height: compact ? 40 : 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: compact ? 15 : 17, fontWeight: '800', color: brand.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
});

export default LiveChatButton;
