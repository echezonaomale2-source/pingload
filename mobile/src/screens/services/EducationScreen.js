import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { EDUCATION_EXAMS } from '../../utils/constants';
import { normalizePhone } from '../../utils/networkDetection';
import { formatCurrency } from '../../utils/formatters';
import { handleVtuPurchaseError, handleVtuPurchaseResult } from '../../utils/vtuHelpers';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import ProviderSelector from '../../components/ProviderSelector';
import { TransactionPinModal } from '../../components/modals';
import { LogoLoader } from '../../components/loading';
import { vtuService } from '../../services/vtuService';
import { useAuth } from '../../context/AuthContext';
import { navigateToForgotTransactionPin } from '../../utils/forgotPinNavigation';
import { useDialog } from '../../hooks/useDialog';

const EducationScreen = ({ navigation, route }) => {
  const { user, refreshBalance } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;

  const initialExam = route.params?.exam || 'waec';
  const [products, setProducts] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(initialExam);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [billersCode, setBillersCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const productsLoadedRef = useRef(false);
  const preselectDoneRef = useRef(false);

  const loadProducts = useCallback(async ({ force = false, showError = true } = {}) => {
    const isInitial = !productsLoadedRef.current || force;
    if (isInitial) setLoadingProducts(true);
    if (force) setRefreshing(true);
    setLoadError('');

    try {
      const res = await vtuService.getEducationProducts();
      const list = res.data.data || [];
      const examList = res.data.exams || [];
      setProducts(list);
      setExams(examList);
      productsLoadedRef.current = true;

      if (!preselectDoneRef.current) {
        preselectDoneRef.current = true;
        const preferredExam = route.params?.exam;
        const preferredCode = route.params?.productCode;
        const preselect = preferredCode
          ? list.find((p) => p.productCode === preferredCode)
          : list.find((p) => p.examType === (preferredExam || initialExam));
        if (preselect) {
          setSelectedProduct(preselect);
          setSelectedExam(preselect.examType);
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Could not load education products.';
      setLoadError(message);
      if (showError && !productsLoadedRef.current) {
        dialogRef.current.alertError('Error', message);
      }
    } finally {
      setLoadingProducts(false);
      setRefreshing(false);
    }
  }, [initialExam, route.params?.exam, route.params?.productCode]);

  useEffect(() => {
    loadProducts({ force: false, showError: true });
  }, [loadProducts]);

  const filteredProducts = useMemo(
    () => products.filter((product) => product.examType === selectedExam),
    [products, selectedExam]
  );

  const selectedExamInfo = exams.find((exam) => exam.id === selectedExam);

  const amount = useMemo(() => {
    if (!selectedProduct) return 0;
    const qty = parseInt(quantity || '1', 10);
    return selectedProduct.amount * (Number.isFinite(qty) ? qty : 1);
  }, [selectedProduct, quantity]);

  const examProviders = useMemo(() => {
    const fromApi = exams.length
      ? exams
      : products.map((p) => ({ id: p.examType, name: String(p.examType || '').toUpperCase() }));
    const ids = [...new Set([
      ...EDUCATION_EXAMS.map((e) => e.id),
      ...fromApi.map((e) => e.id).filter(Boolean),
    ])];
    const withProducts = ids.filter((id) =>
      products.some((p) => p.examType === id)
      || exams.some((e) => e.id === id)
    );
    const sourceIds = withProducts.length ? withProducts : ids.slice(0, 4);
    return sourceIds.map((id) => {
      const known = EDUCATION_EXAMS.find((exam) => exam.id === id);
      const api = fromApi.find((exam) => exam.id === id);
      return known || { id, name: api?.name || String(id).toUpperCase(), color: '#0F766E' };
    });
  }, [exams, products]);

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    setSelectedProduct(null);
  };

  const handlePurchase = () => {
    if (!selectedProduct) {
      dialog.alertError('Missing Product', 'Please select an education product');
      return;
    }
    if (!normalizePhone(phone).match(/^0[789][01]\d{8}$/)) {
      dialog.alertError('Invalid Phone', 'Enter a valid Nigerian phone number');
      return;
    }
    if (selectedProduct.requiresBillersCode && !billersCode.trim()) {
      dialog.alertError('Required', `${selectedProduct.billersCodeLabel || 'Profile code'} is required`);
      return;
    }
    setShowPin(true);
  };

  const confirmPurchase = async (pin) => {
    setShowPin(false);
    setLoading(true);
    try {
      const response = await vtuService.buyEducationPin({
        productId: selectedProduct._id || selectedProduct.id,
        productCode: selectedProduct.productCode,
        quantity: parseInt(quantity || '1', 10),
        amount,
        phone: normalizePhone(phone),
        billersCode: billersCode.trim() || undefined,
        pin,
      });
      await refreshBalance();
      handleVtuPurchaseResult({
        response,
        dialog,
        navigation,
        successTitle: 'Education PIN Purchased',
        successFallback: 'Your education PIN has been purchased successfully.',
      });
    } catch (err) {
      handleVtuPurchaseError(err, dialog, 'Education purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProducts({ force: true, showError: true })}
          />
        )}
      >
        <Text style={styles.title}>Education Pins</Text>
        <Text style={styles.subtitle}>WAEC, NECO, NABTEB, and JAMB ePINs</Text>

        {loadingProducts && products.length === 0 ? (
          <View style={styles.loadingWrap}>
            <LogoLoader size={48} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : loadError && products.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.emptyText}>{loadError}</Text>
            <CustomButton title="Retry" onPress={() => loadProducts({ force: true })} style={{ marginTop: 12 }} />
          </View>
        ) : (
          <>
            <ProviderSelector
              label="Select Exam Body"
              providers={examProviders}
              selected={selectedExam}
              onSelect={handleExamChange}
              columns={examProviders.length >= 4 ? 4 : 3}
            />

            {selectedExamInfo && selectedExamInfo.available === false ? (
              <View style={styles.unavailableCard}>
                <Ionicons name="information-circle-outline" size={22} color={colors.warning} />
                <Text style={styles.unavailableText}>
                  {selectedExamInfo.unavailableReason || `${selectedExam.toUpperCase()} is currently unavailable.`}
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Select Product</Text>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product._id || product.productCode}
                style={[styles.productCard, selectedProduct?.productCode === product.productCode && styles.productActive]}
                onPress={() => setSelectedProduct(product)}
              >
                <View style={styles.productTop}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{formatCurrency(product.amount)}</Text>
                </View>
                {product.description ? <Text style={styles.productDesc}>{product.description}</Text> : null}
                <Text style={styles.productMeta}>{String(product.examType || '').toUpperCase()}</Text>
              </TouchableOpacity>
            ))}

            {filteredProducts.length === 0 ? (
              <Text style={styles.emptyText}>
                {selectedExamInfo?.available === false
                  ? `${selectedExam.toUpperCase()} products are not available yet.`
                  : 'No education products are available right now. Pull to refresh or sync exams in admin.'}
              </Text>
            ) : null}

            <FormInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />

            {selectedProduct?.requiresBillersCode ? (
              <FormInput
                label={selectedProduct.billersCodeLabel || 'Profile Code'}
                value={billersCode}
                onChangeText={setBillersCode}
                placeholder="Enter profile code"
              />
            ) : null}

            {selectedProduct && selectedProduct.maxQuantity > 1 ? (
              <FormInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            ) : null}

            <CustomButton
              title={selectedProduct ? `Buy ${selectedProduct.name} — ${formatCurrency(amount)}` : 'Buy PIN'}
              onPress={handlePurchase}
              loading={loading}
              disabled={!selectedProduct}
            />
          </>
        )}

        <TransactionPinModal visible={showPin} onClose={() => setShowPin(false)} onConfirm={confirmPurchase} loading={loading} onForgotPin={() => navigateToForgotTransactionPin(navigation, setShowPin)} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.warning ? `${colors.warning}15` : colors.inputBg,
    marginBottom: 16,
  },
  unavailableText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24 },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  productCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    backgroundColor: colors.inputBg,
  },
  productActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  productTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  productName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  productPrice: { fontSize: 15, fontWeight: '800', color: colors.primary },
  productDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
  productMeta: { fontSize: 11, fontWeight: '700', color: colors.secondary, marginTop: 8 },
  emptyText: { textAlign: 'center', color: colors.textLight, marginVertical: 24 },
});

export default EducationScreen;
