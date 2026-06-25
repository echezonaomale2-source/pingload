import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../../theme/brand';

const ICONS = {
  success: { name: 'checkmark-circle', color: brand.success, bg: `${brand.success}18` },
  error: { name: 'close-circle', color: brand.error, bg: `${brand.error}15` },
  warning: { name: 'warning', color: brand.warning, bg: `${brand.warning}18` },
  info: { name: 'information-circle', color: brand.blue, bg: `${brand.blue}12` },
};

const ToastItem = ({ toast, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const icon = ICONS[toast.type] || ICONS.info;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => onDismiss(toast.id));
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, slideAnim, onDismiss]);

  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.95} onPress={() => onDismiss(toast.id)} style={styles.toast}>
        <View style={styles.brandBar} />
        <View style={[styles.icon, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>
        <View style={styles.content}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        </View>
        <View style={styles.logoMini}>
          <Text style={styles.logoText}>P</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: 16,
    padding: 14,
    paddingLeft: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: brand.grayBorder,
  },
  brandBar: { width: 4, alignSelf: 'stretch', backgroundColor: brand.blue, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginRight: 10 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 2 },
  message: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  logoMini: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: brand.blue,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  logoText: { color: brand.white, fontWeight: '900', fontSize: 14 },
});

export default ToastItem;
