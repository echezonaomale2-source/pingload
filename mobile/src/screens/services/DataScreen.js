import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NETWORKS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import { detectNetworkFromPhone, NETWORK_LABELS, normalizePhone } from '../../utils/networkDetection';
import NetworkSelector from '../../components/NetworkSelector';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { TransactionPinModal } from '../../components/modals';
import { LogoLoader } from '../../components/loading';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { navigateToForgotTransactionPin } from '../../utils/forgotPinNavigation';
import { useDialog } from '../../hooks/useDialog';

const dedupeDataPlans = (plans) => {
  const seen = new Set();
  return (plans || []).filter((plan) => {
    const key = plan.planId || plan.variation_code;
    if (!plan.variation_code || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const GROUP_ORDER = [
  'daily', 'weekly', 'monthly', 'yearly',
  'social', 'night', 'sme', 'corporate', 'broadband', 'weekend', 'special', 'other',
];

const GROUP_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  social: 'Social',
  night: 'Night',
  sme: 'SME',
  corporate: 'Corporate',
  broadband: 'Broadband',
  weekend: 'Weekend',
  special: 'Special',
  other: 'Other',
};

const parsePlanAmount = (plan) => {
  const raw = plan?.variation_amount ?? plan?.amount;
  const value = Number(String(raw ?? '').replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

const isSameDataPlan = (a, b) => {
  if (!a || !b) return false;
  if (a.planId && b.planId) return a.planId === b.planId;
  return a.variation_code === b.variation_code;
};

const DataScreen = ({ navigation }) => {
  const { refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [planGroups, setPlanGroups] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [networkHint, setNetworkHint] = useState('');

  const fetchPlans = async (net) => {
    setNetwork(net);
    setSelectedPlan(null);
    setLoadingPlans(true);
    try {
      const res = await vtuService.getDataPlans(net);
      const groups = res.data.groups?.length
        ? res.data.groups
        : [{ category: 'other', label: 'All Plans', plans: dedupeDataPlans(res.data.data) }];
      const ordered = GROUP_ORDER
        .map((category) => {
          const match = groups.find((g) => g.category === category);
          return match
            ? { ...match, label: match.label || GROUP_LABELS[category] }
            : null;
        })
        .filter((g) => g?.plans?.length);
      setPlanGroups(ordered);
      setActiveCategory(ordered[0]?.category || '');
    } catch {
      setPlanGroups([]);
      dialog.alertError('Error', 'Could not load data plans. Please try again.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePhoneChange = useCallback((value) => {
    const normalized = normalizePhone(value);
    setPhone(normalized);
    const detected = detectNetworkFromPhone(normalized);
    if (detected) {
      setNetworkHint(`Detected: ${NETWORK_LABELS[detected] || detected}`);
      if (!network || network !== detected) {
        fetchPlans(detected);
      }
    } else if (normalized.replace(/\D/g, '').length >= 4) {
      setNetworkHint('Could not detect network — please select manually.');
    } else {
      setNetworkHint('');
    }
  }, [network]);

  const activeGroup = useMemo(
    () => planGroups.find((group) => group.category === activeCategory),
    [planGroups, activeCategory]
  );

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSelectedPlan(null);
  };

  const handlePurchase = () => {
    if (!network || !phone || !selectedPlan) {
      dialog.alertError('Missing Details', 'Please select network, plan, and enter phone number');
      return;
    }
    setShowPin(true);
  };

  const confirmPurchase = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.buyData({
        network,
        phone: normalizePhone(phone),
        variationCode: selectedPlan.variation_code,
        planId: selectedPlan.planId || undefined,
        amount: parsePlanAmount(selectedPlan) ?? undefined,
        pin,
      });
      await refreshBalance();
      handleVtuPurchaseResult({
        response,
        dialog,
        navigation,
        successTitle: 'Data Purchased',
        successFallback: 'Data purchased successfully!',
      });
    } catch (err) {
      handleVtuPurchaseError(err, dialog, 'Data purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Buy Data</Text>
        <Text style={styles.subtitle}>Affordable data plans for all networks</Text>

        <NetworkSelector networks={NETWORKS} selected={network} onSelect={fetchPlans} />
        <FormInput
          label="Phone Number"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          placeholder="08012345678"
        />
        {networkHint ? <Text style={styles.networkHint}>{networkHint}</Text> : null}

        {loadingPlans && (
          <View style={styles.plansLoading}>
            <LogoLoader size={48} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        )}

        {network && !loadingPlans && planGroups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.segmentScroll}
            contentContainerStyle={styles.segmentRow}
          >
            {planGroups.map((group) => {
              const isActive = group.category === activeCategory;
              return (
                <TouchableOpacity
                  key={group.category}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => handleCategoryChange(group.category)}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {group.label || GROUP_LABELS[group.category]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {activeGroup?.plans?.length ? activeGroup.plans.map((plan) => (
          <TouchableOpacity
            key={plan.planId || plan.variation_code}
            style={[styles.planItem, isSameDataPlan(selectedPlan, plan) && styles.planActive]}
            onPress={() => setSelectedPlan(plan)}
          >
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{plan.name}</Text>
              {(plan.dataSize || plan.validity) ? (
                <Text style={styles.planMeta}>
                  {[plan.dataSize, plan.validity].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Text style={styles.planPrice}>{formatCurrency(parseFloat(plan.variation_amount))}</Text>
          </TouchableOpacity>
        )) : network && !loadingPlans && activeCategory ? (
          <Text style={styles.emptyPlans}>No plans in this category.</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={selectedPlan ? `Buy ${selectedPlan.name}` : 'Buy Data'}
          onPress={handlePurchase}
          loading={loading}
          disabled={!selectedPlan}
        />
      </View>

      <TransactionPinModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={confirmPurchase}
        loading={loading}
        onForgotPin={() => navigateToForgotTransactionPin(navigation, setShowPin)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { paddingHorizontal: 24, paddingTop: 8, marginBottom: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  networkHint: { fontSize: 12, color: colors.primary, marginTop: -12, marginBottom: 12, fontWeight: '600' },
  loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 14, textAlign: 'center' },
  plansLoading: { alignItems: 'center', paddingVertical: 24 },
  segmentScroll: { marginBottom: 12, marginHorizontal: -4 },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },
  emptyPlans: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    marginTop: 8,
  },
  planActive: { borderWidth: 2, borderColor: colors.primary },
  planInfo: { flex: 1, marginRight: 12 },
  planName: { fontSize: 14, fontWeight: '700', color: colors.text },
  planMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  planPrice: { fontSize: 14, fontWeight: '800', color: colors.primary },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});

export default DataScreen;
