import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import FormInput from '../../components/FormInput';
import CustomButton from '../../components/CustomButton';
import { kycService } from '../../services/kycService';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';

const ID_TYPES = [
  { id: 'nin', label: 'NIN' },
  { id: 'passport', label: 'Passport' },
  { id: 'drivers_license', label: "Driver's License" },
  { id: 'voters_card', label: "Voter's Card" },
];

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.5,
    base64: true,
  });
  if (result.canceled) return null;
  return `data:image/jpeg;base64,${result.assets[0].base64}`;
};

const KycScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    dateOfBirth: '',
    address: '',
    idType: 'nin',
    idNumber: '',
    idFrontImage: null,
    idBackImage: null,
    selfieImage: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    kycService.getStatus().then((res) => setStatus(res.data.data)).catch(() => {});
  }, []);

  const handlePick = async (field) => {
    const img = await pickImage();
    if (img) setForm((f) => ({ ...f, [field]: img }));
  };

  const handleSubmit = async () => {
    if (!form.idFrontImage || !form.selfieImage) {
      dialog.alertError('Error', 'Please upload ID front and selfie photos');
      return;
    }
    setLoading(true);
    try {
      await kycService.submit(form);
      updateUser({ ...user, kycStatus: 'pending' });
      dialog.showSuccess({
        title: 'Submitted',
        message: 'Your KYC documents have been submitted for review.',
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      dialog.alertError('Error', err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const kycStatus = status?.kycStatus || user?.kycStatus;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>KYC Verification</Text>
        <View style={[styles.badge, kycStatus === 'verified' && styles.verified, kycStatus === 'rejected' && styles.rejected]}>
          <Text style={styles.badgeText}>Status: {kycStatus}</Text>
        </View>

        {status?.submission?.adminNote && kycStatus === 'rejected' && (
          <Text style={styles.note}>Note: {status.submission.adminNote}</Text>
        )}

        {kycStatus !== 'verified' && status?.submission?.status !== 'pending' && (
          <>
            <FormInput label="Full Name" value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} />
            <FormInput label="Date of Birth" value={form.dateOfBirth} onChangeText={(v) => setForm({ ...form, dateOfBirth: v })} placeholder="DD/MM/YYYY" />
            <FormInput label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
            <FormInput label="ID Number" value={form.idNumber} onChangeText={(v) => setForm({ ...form, idNumber: v })} />

            <Text style={styles.label}>ID Type</Text>
            <View style={styles.idTypes}>
              {ID_TYPES.map((t) => (
                <TouchableOpacity key={t.id} style={[styles.idBtn, form.idType === t.id && styles.idActive]} onPress={() => setForm({ ...form, idType: t.id })}>
                  <Text style={[styles.idText, form.idType === t.id && styles.idTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { field: 'idFrontImage', label: 'ID Front' },
              { field: 'idBackImage', label: 'ID Back (optional)' },
              { field: 'selfieImage', label: 'Selfie with ID' },
            ].map(({ field, label }) => (
              <TouchableOpacity key={field} style={styles.uploadBox} onPress={() => handlePick(field)}>
                {form[field] ? (
                  <Image source={{ uri: form[field] }} style={styles.preview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    <Text style={styles.uploadText}>{label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}

            <CustomButton title="Submit for Verification" onPress={handleSubmit} loading={loading} />
          </>
        )}

        {status?.submission?.status === 'pending' && (
          <Text style={styles.pending}>Your documents are under review. We'll notify you once verified.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  badge: { alignSelf: 'flex-start', marginTop: 12, marginBottom: 16, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  verified: { backgroundColor: '#D1FAE5' },
  rejected: { backgroundColor: '#FEE2E2' },
  badgeText: { fontWeight: '700', textTransform: 'capitalize', fontSize: 13 },
  note: { color: colors.error, marginBottom: 16, fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  idTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  idBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  idActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  idText: { fontSize: 12, color: colors.text },
  idTextActive: { color: colors.primary, fontWeight: '700' },
  uploadBox: { height: 100, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  uploadText: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
  preview: { width: '100%', height: '100%' },
  pending: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
});

export default KycScreen;
