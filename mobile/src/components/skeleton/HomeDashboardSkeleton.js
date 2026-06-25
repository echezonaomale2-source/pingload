import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SkeletonBox from './SkeletonBox';
import TransactionRowSkeleton from './TransactionRowSkeleton';
import { brand } from '../../theme/brand';

const HomeDashboardSkeleton = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <SkeletonBox width={180} height={22} borderRadius={8} variant="blue" />
          <SkeletonBox width={220} height={13} borderRadius={6} style={styles.gapSm} />
        </View>
        <SkeletonBox width={42} height={42} borderRadius={12} variant="muted" />
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <SkeletonBox width={110} height={13} borderRadius={6} variant="white" />
          <SkeletonBox width={22} height={22} borderRadius={11} variant="white" />
        </View>
        <SkeletonBox width={160} height={34} borderRadius={8} variant="white" style={styles.gapMd} />
        <View style={styles.balanceActions}>
          <SkeletonBox width="30%" height={40} borderRadius={12} variant="white" />
          <SkeletonBox width="30%" height={40} borderRadius={12} variant="white" />
          <SkeletonBox width="30%" height={40} borderRadius={12} variant="white" />
        </View>
      </View>

      <View style={styles.section}>
        <SkeletonBox width={80} height={18} borderRadius={6} variant="blue" />
        <View style={styles.serviceGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.serviceItem}>
              <SkeletonBox width={52} height={52} borderRadius={14} variant={i % 2 === 0 ? 'blue' : 'orange'} />
              <SkeletonBox width={48} height={10} borderRadius={5} style={styles.gapSm} />
            </View>
          ))}
        </View>
      </View>

      <SkeletonBox width="100%" height={88} borderRadius={16} variant="orange" style={styles.banner} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SkeletonBox width={150} height={18} borderRadius={6} variant="blue" />
          <SkeletonBox width={52} height={14} borderRadius={6} variant="orange" />
        </View>
        {Array.from({ length: 4 }).map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.white },
  content: { paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerText: { flex: 1, marginRight: 12 },
  gapSm: { marginTop: 8 },
  gapMd: { marginTop: 16 },
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 22,
    backgroundColor: brand.blue,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    backgroundColor: brand.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: brand.grayBorder,
  },
  serviceItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  banner: { marginHorizontal: 16, marginTop: 20 },
});

export default HomeDashboardSkeleton;
