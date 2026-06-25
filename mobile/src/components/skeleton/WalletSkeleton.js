import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SkeletonBox from './SkeletonBox';
import TransactionRowSkeleton from './TransactionRowSkeleton';
import { brand } from '../../theme/brand';

const WalletSkeleton = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <SkeletonBox width={80} height={24} borderRadius={8} variant="blue" />
        <SkeletonBox width={140} height={13} borderRadius={6} style={styles.gapSm} />
      </View>

      <View style={styles.balanceCard}>
        <SkeletonBox width={120} height={14} borderRadius={6} variant="white" />
        <SkeletonBox width={180} height={36} borderRadius={8} variant="white" style={styles.gapMd} />
        <SkeletonBox width="100%" height={52} borderRadius={14} variant="white" style={styles.gapMd} />
        <SkeletonBox width="100%" height={44} borderRadius={12} variant="white" style={styles.gapSm} />
      </View>

      <View style={styles.section}>
        <SkeletonBox width={120} height={18} borderRadius={6} variant="blue" />
        {Array.from({ length: 5 }).map((_, i) => (
          <TransactionRowSkeleton key={i} style={styles.row} />
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.white },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  gapSm: { marginTop: 8 },
  gapMd: { marginTop: 14 },
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    backgroundColor: brand.blue,
  },
  section: { paddingHorizontal: 16, marginTop: 24, paddingBottom: 24 },
  row: { marginTop: 10 },
});

export default WalletSkeleton;
