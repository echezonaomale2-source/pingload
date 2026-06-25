import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { faqService } from '../../services/faqService';
import { PageLoader } from '../../components/loading';

const FaqScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => faqService.getFaqs(),
  });

  const faqs = data?.data?.data || [];

  if (isLoading) return <PageLoader message="Loading FAQs..." />;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>FAQ</Text>
      <Text style={styles.subtitle}>Frequently asked questions</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {faqs.map((faq) => (
          <TouchableOpacity
            key={faq._id}
            style={styles.item}
            onPress={() => setExpanded(expanded === faq._id ? null : faq._id)}
            activeOpacity={0.8}
          >
            <View style={styles.questionRow}>
              <Text style={styles.question}>{faq.question}</Text>
              <Ionicons name={expanded === faq._id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
            </View>
            {expanded === faq._id && <Text style={styles.answer}>{faq.answer}</Text>}
          </TouchableOpacity>
        ))}
        {faqs.length === 0 && <Text style={styles.empty}>No FAQs available yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  item: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 10 },
  questionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  question: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 },
  answer: { fontSize: 14, color: colors.textSecondary, marginTop: 12, lineHeight: 20 },
  empty: { textAlign: 'center', color: colors.textLight, marginTop: 32 },
});

export default FaqScreen;
