import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatters';
import { referralService } from '../../services/transactionService';
import CustomButton from '../../components/CustomButton';
import { PageLoader } from '../../components/loading';
import { useDialog } from '../../hooks/useDialog';

const ReferralScreen = ({ navigation }) => {
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => referralService.getReferrals(),
  });

  const stats = data?.data?.data;

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    dialog.notifySuccess(`${label} copied to clipboard`);
  };

  if (isLoading) return <PageLoader message="Loading referrals..." />;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Refer & Earn</Text>
      <Text style={styles.subtitle}>Invite friends and earn ₦100 per referral</Text>

      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats?.totalReferrals || 0}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatCurrency(stats?.totalEarnings || 0)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <TouchableOpacity style={styles.codeRow} onPress={() => copyToClipboard(stats?.referralCode, 'Referral code')}>
          <Text style={styles.code}>{stats?.referralCode}</Text>
          <Ionicons name="copy-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Referral Link</Text>
        <TouchableOpacity style={styles.codeRow} onPress={() => copyToClipboard(stats?.referralLink, 'Referral link')}>
          <Text style={styles.link} numberOfLines={1}>{stats?.referralLink}</Text>
          <Ionicons name="copy-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>How it works</Text>
        {['Share your referral code with friends', 'They sign up using your code', 'You earn ₦100 when they make their first transaction'].map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      <CustomButton
        title="Share Now"
        variant="secondary"
        onPress={() => Share.share({ message: `Join Pingload with my code ${stats?.referralCode}: ${stats?.referralLink}` })}
        style={{ marginTop: 8 }}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  statsCard: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 24, marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  divider: { width: 1, backgroundColor: colors.border },
  codeCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  codeLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: 2 },
  link: { fontSize: 14, color: colors.primary, flex: 1, marginRight: 8 },
  howItWorks: { marginTop: 16 },
  howTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  stepText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
});

export default ReferralScreen;
