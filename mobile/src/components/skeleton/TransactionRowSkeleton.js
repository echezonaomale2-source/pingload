import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBox from './SkeletonBox';
import { brand } from '../../theme/brand';

const TransactionRowSkeleton = ({ style }) => (
  <View style={[styles.row, style]}>
    <SkeletonBox width={44} height={44} borderRadius={12} variant="blue" />
    <View style={styles.details}>
      <SkeletonBox width="68%" height={14} borderRadius={6} />
      <SkeletonBox width="42%" height={11} borderRadius={6} style={styles.gap} />
    </View>
    <View style={styles.right}>
      <SkeletonBox width={72} height={14} borderRadius={6} />
      <SkeletonBox width={56} height={18} borderRadius={10} variant="orange" style={styles.gap} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: brand.grayBorder,
  },
  details: { flex: 1, marginHorizontal: 12 },
  right: { alignItems: 'flex-end' },
  gap: { marginTop: 8 },
});

export default TransactionRowSkeleton;
