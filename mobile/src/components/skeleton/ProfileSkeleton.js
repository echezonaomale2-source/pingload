import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SkeletonBox from './SkeletonBox';
import { brand } from '../../theme/brand';

const ProfileSkeleton = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <SkeletonBox width={90} height={24} borderRadius={8} variant="blue" />
      </View>

      <View style={styles.profileCard}>
        <SkeletonBox width={88} height={88} borderRadius={44} variant="blue" />
        <SkeletonBox width={160} height={22} borderRadius={8} variant="blue" style={styles.gapMd} />
        <SkeletonBox width={200} height={14} borderRadius={6} style={styles.gapSm} />
        <SkeletonBox width={90} height={26} borderRadius={20} variant="orange" style={styles.gapMd} />
      </View>

      <View style={styles.menu}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={[styles.menuItem, i === 6 && styles.menuItemLast]}>
            <SkeletonBox width={38} height={38} borderRadius={10} variant={i % 2 === 0 ? 'blue' : 'orange'} />
            <SkeletonBox width="55%" height={15} borderRadius={6} style={styles.menuTitle} />
            <SkeletonBox width={18} height={18} borderRadius={4} variant="muted" />
          </View>
        ))}
      </View>

      <SkeletonBox width="100%" height={52} borderRadius={14} variant="muted" style={styles.logout} />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.white },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: brand.white,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: brand.grayBorder,
  },
  gapSm: { marginTop: 8 },
  gapMd: { marginTop: 14 },
  menu: {
    marginHorizontal: 16,
    backgroundColor: brand.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brand.grayBorder,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.grayBorder,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuTitle: { flex: 1, marginLeft: 14 },
  logout: { marginHorizontal: 16, marginTop: 24, marginBottom: 32 },
});

export default ProfileSkeleton;
