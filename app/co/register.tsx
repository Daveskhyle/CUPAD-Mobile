import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/theme';
import { SPACING, RADIUS } from '../../src/constants/config';

export default function RegisterClientScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [clientType, setClientType] = useState<'individual' | 'group'>('individual');
  const [regFee, setRegFee] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Enter client name');
    if (!phone.trim()) return Alert.alert('Required', 'Enter phone number');
    setLoading(true);
    try {
      const { registerOnlineOrQueue } = await import('../../src/services/data');
      const fee = parseFloat(regFee.replace(/,/g, '')) || 0;
      const res = await registerOnlineOrQueue({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        client_type: clientType,
        registration_fee: fee || undefined,
      });
      if (res?.success) {
        Alert.alert('Success', `Client registered. ID: ${res.client_id || '—'}`, [{
          text: 'OK',
          onPress: () => {
            setName(''); setPhone(''); setEmail(''); setAddress(''); setRegFee('');
          },
        }]);
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
          <Ionicons name="person-add" size={22} color="#3B82F6" />
          <Text style={[styles.bannerText, { color: '#2563EB' }]}>Register a new client</Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Full name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Client full name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Phone *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="080..."
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="optional@email.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
        <TextInput
          style={[styles.input, styles.notes, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Home / business address"
          placeholderTextColor={colors.textMuted}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Client type</Text>
        <View style={styles.termRow}>
          {(['individual', 'group'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.termBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
                clientType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setClientType(t)}
            >
              <Text style={{ color: clientType === t ? '#fff' : colors.text, fontWeight: '600', textTransform: 'capitalize' }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Registration fee (₦)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={regFee}
          onChangeText={setRegFee}
        />

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#3B82F6', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Client</Text>}
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
  notes: { minHeight: 70, textAlignVertical: 'top' },
  termRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  termBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center' },
  btn: { paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
