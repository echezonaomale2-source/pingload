import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NETWORKS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
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
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const fetchPlans = async (net) => {
    setNetwork(net);
    setSelectedPlan(null);
    setLoadingPlans(true);
    try {
      const res = await vtuService.getDataPlans(net);
      setPlans(dedupeDataPlans(res.data.data));
    } catch (err) {
      setPlans([]);
      dialog.alertError('Error', 'Could not load data plans. Please try again.');
    } finally {
      setLoadingPlans(false);
    }
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
        <FormInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />

        {loadingPlans && (
          <View style={styles.plansLoading}>
            <LogoLoader size={48} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        )}

        {plans.length > 0 && (
          <View style={styles.plansSection}>
            <Text style={styles.plansTitle}>Select Plan</Text>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={`${plan.variation_code}-${index}`}
                style={[styles.planItem, selectedPlan?.variation_code === plan.variation_code && styles.planActive]}
                onPress={() => setSelectedPlan(plan)}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{formatCurrency(parseFloat(plan.variation_amount))}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 14, textAlign: 'center' },
  plansLoading: { alignItems: 'center', marginBottom: 16, paddingVertical: 12 },
  plansSection: { marginBottom: 24 },
  plansTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  planItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8,
  },
  planActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  planName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  planPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
});

export default DataScreen;
