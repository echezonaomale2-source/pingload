import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORT_CHANNELS } from '../../utils/constants';
import { LiveChatButton } from '../../components/support';

const SupportScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handlePress = async (channel) => {
    if (channel.screen === 'LiveChat' || channel.id === 'chat') {
      navigation.navigate('LiveChat');
      return;
    }
    if (channel.url) {
      Linking.openURL(channel.url);
    }
  };

  const otherChannels = SUPPORT_CHANNELS.filter((c) => c.id !== 'chat');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Contact Support</Text>
      <Text style={styles.subtitle}>We're here to help you 24/7</Text>

      <LiveChatButton onPress={() => navigation.navigate('LiveChat')} />

      <TouchableOpacity style={styles.faqBtn} onPress={() => navigation.navigate('FAQ')}>
        <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.faqText}>View Frequently Asked Questions</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Other ways to reach us</Text>

      {otherChannels.map((channel) => (
        <TouchableOpacity
          key={channel.id}
          style={styles.channel}
          onPress={() => handlePress(channel)}
          activeOpacity={0.7}
        >
          <View style={[styles.icon, { backgroundColor: `${channel.color}15` }]}>
            <Ionicons name={channel.icon} size={28} color={channel.color} />
          </View>
          <View style={styles.content}>
            <Text style={styles.channelName}>{channel.name}</Text>
            <Text style={styles.channelDesc}>
              {channel.id === 'whatsapp' ? 'Chat with us on WhatsApp' :
               channel.id === 'email' ? channel.url.replace('mailto:', '') : channel.name}
            </Text>
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
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 20 },
  faqBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: colors.card, borderRadius: 14, marginTop: 16, marginBottom: 8, gap: 10,
  },
  faqText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  channel: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: colors.card, borderRadius: 14, marginBottom: 12,
  },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  content: { flex: 1 },
  channelName: { fontSize: 16, fontWeight: '700', color: colors.text },
  channelDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});

export default SupportScreen;
