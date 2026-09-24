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

export default function SavingsWithdrawalScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [client, setClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!client) return Alert.alert('Required', 'Please select a client');
    const value = parseFloat(amount.replace(/,/g, ''));
    if (!value || value <= 0) return Alert.alert('Required', 'Enter a valid amount');
    setLoading(true);
    try {
      const { withdrawOnlineOrQueue } = await import('../../src/services/data');
      const res = await withdrawOnlineOrQueue({
        client_id: client.id,
        amount: value,
        reason: reason || undefined,
        notes: reason || undefined,
      });
      if (res?.success) {
        Alert.alert('Success', res.message || 'Withdrawal recorded', [
          { text: 'OK', onPress: () => { setAmount(''); setReason(''); } },
        ]);
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
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.banner, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
          <Ionicons name="arrow-down-circle" size={22} color="#EF4444" />
          <Text style={[styles.bannerText, { color: '#DC2626' }]}>
            Process a savings withdrawal
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Client</Text>
        <ClientPicker selected={client} onSelect={setClient} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (₦)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Reason</Text>
        <TextInput
          style={[styles.input, styles.notes, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Reason for withdrawal..."
          placeholderTextColor={colors.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
        />

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.btnText}>Process Withdrawal</Text>
            )}
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
  notes: { minHeight: 80, textAlignVertical: 'top' },
  btn: { paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
