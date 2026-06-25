import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORT_CHANNELS } from '../../utils/constants';
import CustomButton from '../CustomButton';
import { brand } from '../../theme/brand';

const SupportFallback = ({ title = 'Chat Unavailable', message, onRetry }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const emailChannel = SUPPORT_CHANNELS.find((c) => c.id === 'email');
  const whatsappChannel = SUPPORT_CHANNELS.find((c) => c.id === 'whatsapp');

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${brand.orange}18` }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={brand.orange} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>
        {message || 'We could not connect to live chat. Reach our support team using the options below.'}
      </Text>

      {whatsappChannel ? (
        <TouchableOpacity
          style={styles.channel}
          onPress={() => Linking.openURL(whatsappChannel.url)}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          <View style={styles.channelText}>
            <Text style={styles.channelName}>WhatsApp Support</Text>
            <Text style={styles.channelDesc}>Chat with us on WhatsApp</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
      ) : null}

      {emailChannel ? (
        <TouchableOpacity
          style={styles.channel}
          onPress={() => Linking.openURL(emailChannel.url)}
          activeOpacity={0.8}
        >
          <Ionicons name="mail-outline" size={22} color={brand.blue} />
          <View style={styles.channelText}>
            <Text style={styles.channelName}>Email Support</Text>
            <Text style={styles.channelDesc}>{emailChannel.url.replace('mailto:', '')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
      ) : null}

      {onRetry ? (
        <CustomButton title="Try Live Chat Again" onPress={onRetry} style={styles.retryBtn} />
      ) : null}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 24,
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelText: { flex: 1 },
  channelName: { fontSize: 15, fontWeight: '700', color: colors.text },
  channelDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  retryBtn: { marginTop: 16, width: '100%' },
});

export default SupportFallback;
