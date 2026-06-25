import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const COMING_SOON = [
  { id: 'bulk_sms', name: 'Bulk SMS', icon: 'chatbubbles', description: 'Send bulk SMS to multiple recipients' },
  { id: 'insurance', name: 'Insurance', icon: 'shield', description: 'Pay insurance premiums' },
  { id: 'flight', name: 'Flight Tickets', icon: 'airplane', description: 'Book domestic flights' },
  { id: 'cable', name: 'Internet/Cable', icon: 'globe', description: 'Pay internet and cable bills' },
];

const MoreServicesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>More Services</Text>
      <Text style={styles.subtitle}>Additional services coming soon</Text>

      {COMING_SOON.map((service) => (
        <View key={service.id} style={styles.item}>
          <View style={[styles.icon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name={service.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.name}>{service.name}</Text>
            <Text style={styles.desc}>{service.description}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Soon</Text>
          </View>
        </View>
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
    backgroundColor: colors.background, borderRadius: 12, marginBottom: 10,
  },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  content: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  desc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: `${colors.secondary}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.secondary },
});

export default MoreServicesScreen;
