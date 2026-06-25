import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ONBOARDING_SLIDES } from '../../utils/constants';
import CustomButton from '../../components/CustomButton';
import { requestPushPermissionDuringOnboarding } from '../../services/pushNotificationService';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const flatListRef = useRef(null);
  const isLast = currentIndex === ONBOARDING_SLIDES.length - 1;

  const finishOnboarding = async () => {
    setRequestingPermission(true);
    try {
      await requestPushPermissionDuringOnboarding();
    } catch {
      // User can still use the app without push notifications.
    } finally {
      setRequestingPermission(false);
      navigation.replace('Login');
    }
  };

  const handleNext = () => {
    if (!isLast) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <View style={[styles.illustration, { backgroundColor: `${item.color}10` }]}>
        <View style={[styles.iconRing, { borderColor: `${item.color}30` }]}>
          <Ionicons name={item.icon} size={72} color={item.color} />
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding} disabled={requestingPermission}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.title}
      />

      <View style={styles.footer}>
        {isLast ? (
          <View style={styles.permissionHint}>
            <Ionicons name="notifications-outline" size={18} color={colors.secondary} />
            <Text style={styles.permissionText}>
              Tap Get Started to enable alerts for transactions, promotions, and account updates.
            </Text>
          </View>
        ) : null}

        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
          ))}
        </View>

        <CustomButton
          title={requestingPermission ? 'Setting up...' : (isLast ? 'Get Started' : 'Next')}
          variant={isLast ? 'secondary' : 'primary'}
          onPress={handleNext}
          loading={requestingPermission}
          disabled={requestingPermission}
        />

        {requestingPermission ? (
          <ActivityIndicator size="small" color={colors.secondary} style={styles.loader} />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skipBtn: { position: 'absolute', top: 56, right: 24, zIndex: 1 },
  skipText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  slide: { width, alignItems: 'center', paddingHorizontal: 32, paddingTop: 100 },
  illustration: {
    width: width * 0.72,
    height: width * 0.55,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  permissionHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  permissionText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  activeDot: { backgroundColor: colors.primary, width: 24 },
  loader: { marginTop: 12 },
});

export default OnboardingScreen;
