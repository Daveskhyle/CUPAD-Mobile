import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ClientPicker } from '../../src/components/ClientPicker';
import { useThemeStore } from '../../src/store/theme';
import { SPACING, RADIUS } from '../../src/constants/config';
import type { Client } from '../../src/types';

export default function DisbursementScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [client, setClient] = useState<Client | null>(null);
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('10');
  const [installments, setInstallments] = useState('12');
  const [termType, setTermType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!client) return Alert.alert('Required', 'Please select a client');
    const p = parseFloat(principal.replace(/,/g, ''));
    if (!p || p <= 0) return Alert.alert('Required', 'Enter principal amount');
    const rate = parseFloat(interest) || 0;
    const n = parseInt(installments, 10) || 1;
    const total = p * (1 + rate / 100);
    setLoading(true);
    try {
      const { disburseOnlineOrQueue } = await import('../../src/services/data');
      const res = await disburseOnlineOrQueue({
        client_id: client.id,
        principal: p,
        interest_rate: rate,
        num_installments: n,
        loan_term_type: termType,
      });
      if (res?.success) {
        Alert.alert(
          'Success',
          res.message || `Loan disbursed. Total payable ₦${Number(res.total_payable || total).toLocaleString()}`,
          [{ text: 'OK', onPress: () => { setPrincipal(''); } }]
        );
      } else {
        Alert.alert('Error', res?.error || 'Failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed. Deploy API v1.2?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.banner, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
          <Ionicons name="cash" size={22} color="#3B82F6" />
          <Text style={[styles.bannerText, { color: '#2563EB' }]}>Disburse a new loan</Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Client</Text>
        <ClientPicker selected={client} onSelect={setClient} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Principal (₦)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={principal}
          onChangeText={setPrincipal}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Interest rate (%)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="10"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={interest}
          onChangeText={setInterest}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Number of installments</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="12"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={installments}
          onChangeText={setInstallments}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Term type</Text>
        <View style={styles.termRow}>
          {(['daily', 'weekly', 'monthly'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.termBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
                termType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setTermType(t)}
            >
              <Text style={{ color: termType === t ? '#fff' : colors.text, fontWeight: '600', textTransform: 'capitalize' }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Disburse Loan</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.md, paddingBottom: 40 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md, marginBottom: 20 },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  termRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  termBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center' },
  btn: { paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
