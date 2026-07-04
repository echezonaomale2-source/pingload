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

const DataScreen = ({ navigation }) => {
  const { refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [planGroups, setPlanGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
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
      setPlanGroups(groups);
      setExpandedGroups(Object.fromEntries(groups.map((g, i) => [g.category, i === 0])));
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

  const toggleGroup = (category) => {
    setExpandedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
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

        {planGroups.map((group) => (
          <View key={group.category} style={styles.groupSection}>
            <TouchableOpacity style={styles.groupHeader} onPress={() => toggleGroup(group.category)}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              <Ionicons
                name={expandedGroups[group.category] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedGroups[group.category] && group.plans.map((plan, index) => (
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
            ))}
          </View>
        ))}

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
  groupSection: { marginBottom: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
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
