import React, { useEffect, useRef, useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Animated, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PingloadLogo from './PingloadLogo';
import { useTheme } from '../../context/ThemeContext';

const ModalShell = ({
  visible,
  onClose,
  title,
  children,
  showLogo = true,
  showClose = true,
  animation = 'fade',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(animation === 'slide' ? 300 : 40)).current;
  const isSlide = animation === 'slide';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(isSlide ? 300 : 40);
    }
  }, [visible, fadeAnim, slideAnim, isSlide]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.root, isSlide && styles.rootSlide]}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.contentWrap, isSlide && styles.contentSlide]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              isSlide && { ...styles.sheetSlide, paddingBottom: Math.max(insets.bottom, 20) },
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {showClose && (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {showLogo && (
              <View style={styles.logoWrap}>
                <PingloadLogo />
              </View>
            )}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24 },
  rootSlide: { justifyContent: 'flex-end', padding: 0 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  contentWrap: { alignItems: 'center' },
  contentSlide: { width: '100%' },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetSlide: {
    maxWidth: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  logoWrap: { marginBottom: 16, marginTop: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
});

export default ModalShell;
