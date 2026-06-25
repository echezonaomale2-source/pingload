import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';

const BalanceCard = ({ balance, onFundPress, onWithdrawPress, onHistoryPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [hidden, setHidden] = useState(false);

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.label}>Wallet Balance</Text>
        <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={12}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>
      <Text style={styles.balance}>{hidden ? '₦ ••••••' : formatCurrency(balance)}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onFundPress} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Fund Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onWithdrawPress} activeOpacity={0.8}>
          <Ionicons name="arrow-up-circle-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGhost]} onPress={onHistoryPress} activeOpacity={0.8}>
          <Ionicons name="time-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const createStyles = (colors) => StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  balance: { color: colors.white, fontSize: 34, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionBtnGhost: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  actionText: { color: colors.white, fontSize: 12, fontWeight: '600' },
});

export default BalanceCard;
