import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/walletService';
import ScreenHeader from '../../components/ScreenHeader';
import TransactionItem from '../../components/TransactionItem';
import CustomButton from '../../components/CustomButton';
import { WalletSkeleton } from '../../components/skeleton';

const WalletScreen = ({ navigation }) => {
  const { balance, refreshBalance } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);


  const { data, isLoading } = useQuery({
    queryKey: ['walletHistory'],
    queryFn: () => walletService.getHistory(),
  });

  const history = data?.data?.data || [];

  if (isLoading) return <WalletSkeleton />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Wallet" subtitle="Manage your funds" />

        <LinearGradient colors={['#0057D9', '#003DA5']} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <CustomButton
            title="Fund Wallet"
            onPress={() => navigation.navigate('FundWallet')}
            style={styles.fundBtn}
          />
          <TouchableOpacity style={styles.transferBtn} onPress={() => navigation.navigate('Transfer')}>
            <Ionicons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.transferText}>Transfer</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet History</Text>
          {history.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>No funding history yet</Text>
            </View>
          ) : (
            history.map((tx) => (
              <TransactionItem
                key={tx._id}
                transaction={tx}
                onPress={() => navigation.navigate('TransactionDetails', { id: tx._id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  balanceCard: {
    marginHorizontal: 16, borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: '#0057D9', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, elevation: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  balanceAmount: { color: colors.white, fontSize: 36, fontWeight: '800', marginVertical: 12 },
  fundBtn: { width: '100%', marginTop: 8 },
  transferBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  transferText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  section: { paddingHorizontal: 16, marginTop: 24, paddingBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 32, backgroundColor: colors.card, borderRadius: 12 },
  emptyText: { color: colors.textLight, marginTop: 8, fontSize: 14 },
});

export default WalletScreen;
