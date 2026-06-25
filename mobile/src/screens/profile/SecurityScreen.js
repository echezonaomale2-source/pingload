import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const SecurityScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const items = [
    { icon: 'key-outline', title: 'Change Password', desc: 'Update your account password', screen: 'ChangePassword' },
    { icon: 'finger-print-outline', title: 'Transaction PIN', desc: 'Set a 4-digit PIN for transactions', screen: 'TransactionPin' },
    { icon: 'phone-portrait-outline', title: 'Biometric Login', desc: 'Use fingerprint or face ID', screen: 'Settings' },
    { icon: 'shield-checkmark-outline', title: 'Two-Factor Auth', desc: 'Add an extra layer of security', screen: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Security</Text>
      <Text style={styles.subtitle}>Manage your account security settings</Text>

      {items.map((item) => (
        <TouchableOpacity
          key={item.title}
          style={styles.item}
          onPress={() => item.screen && navigation.navigate(item.screen)}
        >
          <View style={styles.iconBox}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDesc}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  item: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: colors.card, borderRadius: 12, marginBottom: 10,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  content: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});

export default SecurityScreen;
