import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SkeletonBox from './SkeletonBox';
import TransactionRowSkeleton from './TransactionRowSkeleton';
import { brand } from '../../theme/brand';

const TransactionHistorySkeleton = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <SkeletonBox width={180} height={24} borderRadius={8} variant="blue" />
      <SkeletonBox width={200} height={13} borderRadius={6} style={styles.gapSm} />
    </View>

    <View style={styles.filters}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={72}
          height={34}
          borderRadius={20}
          variant={i === 0 ? 'blue' : 'muted'}
        />
      ))}
    </View>

    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {Array.from({ length: 8 }).map((_, i) => (
        <TransactionRowSkeleton key={i} />
      ))}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.white },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  gapSm: { marginTop: 8 },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
});

export default TransactionHistorySkeleton;
