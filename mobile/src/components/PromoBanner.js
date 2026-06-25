import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const PromoBanner = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const banners = useMemo(() => ([
    { id: '1', title: 'Get 5% Cashback', subtitle: 'On your first data purchase', colors: [colors.primary, colors.primaryDark] },
    { id: '2', title: 'Refer & Earn ₦100', subtitle: 'Invite friends and earn rewards', colors: [colors.secondary, colors.secondaryDark] },
    { id: '3', title: 'Zero Funding Fees', subtitle: 'Fund your wallet for free today', colors: ['#10B981', '#059669'] },
  ]), [colors]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
          setActiveIndex(index);
        }}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => (
          <LinearGradient
            key={banner.id}
            colors={banner.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          </LinearGradient>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {banners.map((_, index) => (
          <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { marginTop: 20, paddingHorizontal: 16 },
  banner: {
    width: width - 32,
    borderRadius: 16,
    padding: 20,
    height: 96,
    justifyContent: 'center',
  },
  bannerTitle: { color: colors.white, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  activeDot: { backgroundColor: colors.primary, width: 18 },
});

export default PromoBanner;
