import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NETWORKS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import { detectNetworkFromPhone, NETWORK_LABELS } from '../../utils/networkDetection';
import NetworkSelector from '../../components/NetworkSelector';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { TransactionPinModal } from '../../components/modals';
import { LogoLoader } from '../../components/loading';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const dedupeDataPlans = (plans) => {
  const seen = new Set();
  return (plans || []).filter((plan) => {
    const code = plan.variation_code;
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
};

const GROUP_ORDER = ['daily', 'weekly', 'monthly', 'yearly'];
const GROUP_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  other: 'Other',
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
      const ordered = GROUP_ORDER.map((category) => {
        const match = groups.find((g) => g.category === category);
        return match || { category, label: GROUP_LABELS[category], plans: [] };
      });
      const otherGroup = groups.find((g) => g.category === 'other');
      if (otherGroup?.plans?.length) {
        ordered.push(otherGroup);
      }
      setPlanGroups(ordered);
      const firstWithPlans = ordered.find((g) => g.plans.length > 0);
      setActiveCategory(firstWithPlans?.category || 'daily');
    } catch {
      setPlanGroups([]);
      dialog.alertError('Error', 'Could not load data plans. Please try again.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePhoneChange = useCallback((value) => {
    setPhone(value);
    const detected = detectNetworkFromPhone(value);
    if (detected) {
      setNetworkHint(`Detected: ${NETWORK_LABELS[detected] || detected}`);
      if (!network || network !== detected) {
        fetchPlans(detected);
      }
    } else if (value.replace(/\D/g, '').length >= 4) {
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
        phone,
        variationCode: selectedPlan.variation_code,
        amount: parseFloat(selectedPlan.variation_amount),
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
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false}>
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

        {network && !loadingPlans && (
          <View style={styles.segmentRow}>
            {GROUP_ORDER.map((category) => {
              const group = planGroups.find((g) => g.category === category);
              const count = group?.plans?.length || 0;
              const isActive = category === activeCategory;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.segment,
                    isActive && styles.segmentActive,
                    count === 0 && styles.segmentDisabled,
                  ]}
                  onPress={() => count > 0 && handleCategoryChange(category)}
                  disabled={count === 0}
                >
                  <Text style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                    count === 0 && styles.segmentTextDisabled,
                  ]}
                  >
                    {GROUP_LABELS[category]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeGroup?.plans?.length ? activeGroup.plans.map((plan, index) => (
          <TouchableOpacity
            key={`${plan.variation_code}-${index}`}
            style={[styles.planItem, selectedPlan?.variation_code === plan.variation_code && styles.planActive]}
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
          <Text style={styles.emptyPlans}>No {GROUP_LABELS[activeCategory]?.toLowerCase()} plans for this network.</Text>
        ) : null}

        {planGroups.find((g) => g.category === 'other')?.plans?.length > 0 && (
          <>
            <Text style={styles.otherHeading}>Other Plans</Text>
            {planGroups.find((g) => g.category === 'other').plans.map((plan, index) => (
              <TouchableOpacity
                key={`other-${plan.variation_code}-${index}`}
                style={[styles.planItem, selectedPlan?.variation_code === plan.variation_code && styles.planActive]}
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
            ))}
          </>
        )}

        <CustomButton
          title={selectedPlan ? `Buy ${selectedPlan.name}` : 'Buy Data'}
          onPress={handlePurchase}
          loading={loading}
          disabled={!selectedPlan}
        />
        <TransactionPinModal visible={showPin} onClose={() => setShowPin(false)} onConfirm={confirmPurchase} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  networkHint: { fontSize: 12, color: colors.primary, marginTop: -12, marginBottom: 12, fontWeight: '600' },
  loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 14, textAlign: 'center' },
  plansLoading: { alignItems: 'center', paddingVertical: 24 },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentDisabled: {
    opacity: 0.45,
  },
  segmentText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },
  segmentTextDisabled: { color: colors.textSecondary },
  emptyPlans: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
  otherHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
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
});

export default DataScreen;
