import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../src/store/theme';
import { api } from '../../src/api/client';
import type { Client } from '../../src/types';

const money = (v: any) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parseDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); const x = new Date(); x.setHours(12, 0, 0, 0); if (y && m && d) x.setFullYear(y, m - 1, d); return x; };
const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Settings = { min_savings_amount: number; max_savings_amount: number; allow_weekend_collection: number; savings_date_readonly: number };
type Row = Client & { savings_balance: number; loan_outstanding: number; amount: string };
const defaultSettings: Settings = { min_savings_amount: 100, max_savings_amount: 1000000, allow_weekend_collection: 0, savings_date_readonly: 0 };

export default function SavingsCollectionScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [unions, setUnions] = useState<string[]>([]);
  const [activeUnion, setActiveUnion] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dateLocked = Number(settings.savings_date_readonly) === 1 || String(settings.savings_date_readonly).toLowerCase() === 'true';

  const loadUnions = useCallback(async () => {
    setLoading(true);
    try {
      const active = await api.getAllClients();
      setClients(active);
      const names = Array.from(new Set(active.map((c: any) => c.union === null || c.union === undefined || c.union === '' ? 'Unassigned' : String(c.union)))).sort((a, b) => a.localeCompare(b));
      setUnions(names);
      setActiveUnion((prev) => prev && names.includes(prev) ? prev : (names[0] || ''));
    } catch (e: any) {
      Alert.alert('Unable to load clients', e?.message || 'Please try again.');
    } finally { setLoading(false); }
  }, []);

  const loadUnion = useCallback(async () => {
    if (!activeUnion) { setRows([]); return; }
    setLoadingRows(true);
    try {
      // Use the same combined endpoint as Combined Collection.
      // The API now reads the persistent savings.balance account value.
      // Unassigned is represented by an empty union filter on the API.
      const unionParam = activeUnion === 'Unassigned' ? '' : activeUnion;
      const combinedRows = await api.getCombinedUnionData(unionParam, date);
      const apiSettings = (combinedRows as any).__settings;
      if (apiSettings?.savings || apiSettings?.date_readonly !== undefined) {
        setSettings((prev) => ({
          ...prev,
          ...(apiSettings?.savings || {}),
          savings_date_readonly: apiSettings?.date_readonly ? 1 : prev.savings_date_readonly,
        }));
      }

      const byId = new Map<string, any>();
      (Array.isArray(combinedRows) ? combinedRows : []).forEach((item: any) => byId.set(String(item.id), item));

      const loaded = clients
        .filter((c) => (String(c.union || '').trim() || 'Unassigned') === activeUnion)
        .map((client) => {
          const item = byId.get(String(client.id));
          const savings = Number(item?.savings_balance ?? 0);
          const loan = Number(item?.loan?.remaining_balance ?? 0);
          return {
            ...client,
            savings_balance: Number.isFinite(savings) ? savings : 0,
            loan_outstanding: Number.isFinite(loan) ? loan : 0,
            amount: '',
          };
        });
      setRows(loaded.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      Alert.alert('Unable to load union', e?.message || 'Please try again.');
      setRows([]);
    } finally { setLoadingRows(false); }
  }, [activeUnion, clients, date]);

  useFocusEffect(useCallback(() => { loadUnions(); }, [loadUnions]));
  useEffect(() => { loadUnion(); }, [loadUnion]);

  const refresh = async () => { setRefreshing(true); await loadUnions(); setRefreshing(false); };
  const filtered = rows;
  const totalEntered = filtered.reduce((sum, r) => sum + (Number(String(r.amount).replace(/,/g, '')) || 0), 0);
  const totalBalances = filtered.reduce((sum, r) => sum + Number(r.savings_balance || 0), 0);
  const enteredCount = filtered.filter((r) => Number(String(r.amount).replace(/,/g, '')) > 0).length;

  const setRow = (id: string, value: string) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, amount: value } : r));

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (dateLocked) return;
    if (event.type === 'set' && selected) setDate(formatDate(selected));
    if (Platform.OS !== 'ios' || event.type === 'dismissed') setShowDatePicker(false);
  };

  const openDatePicker = () => {
    if (dateLocked) { Alert.alert('Date locked', 'The administrator has locked the savings collection date.'); return; }
    setShowDatePicker(true);
  };

  const saveRow = async (row: Row) => {
    const amount = Number(String(row.amount).replace(/,/g, '')) || 0;
    if (amount < settings.min_savings_amount || amount > settings.max_savings_amount) {
      Alert.alert('Savings limit', `Savings must be between ${money(settings.min_savings_amount)} and ${money(settings.max_savings_amount)}.`);
      return;
    }
    const day = parseDate(date).getDay();
    if ((day === 0 || day === 6) && !Number(settings.allow_weekend_collection)) {
      Alert.alert('Weekend collection disabled', 'The administrator has disabled weekend savings collections.');
      return;
    }
    setSavingId(row.id);
    try {
      const existing = await api.getSavings(row.id);
      const duplicate = existing.some((tx: any) => String(tx?.type || '').toLowerCase() === 'deposit' && String(tx?.date || '').slice(0, 10) === date);
      if (duplicate) { Alert.alert('Duplicate transaction', `${row.name} already has a savings collection for ${date}.`); return; }
      const res = await api.collectSavings({ client_id: row.id, amount, date });
      if (!res?.success) throw new Error(res?.error || res?.message || 'Unable to save savings collection.');
      Alert.alert('Collection saved', `${row.name}\n${res.message || 'Savings recorded successfully.'}`);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, savings_balance: Number(r.savings_balance || 0) + amount, amount: '' } : r));
    } catch (e: any) {
      Alert.alert('Collection failed', e?.message || 'Unable to save savings collection.');
    } finally { setSavingId(null); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.sectionHeader}><View><Text style={[styles.title, { color: colors.text }]}>Savings Collection</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Union-based daily collection register</Text></View><View style={[styles.pill, { backgroundColor: colors.infoBg }]}><Text style={[styles.pillText, { color: colors.primary }]}>SAVINGS</Text></View></View>
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}><Summary icon="people-outline" label="CLIENTS" value={filtered.length} colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><Summary icon="wallet-outline" label="BALANCE" value={money(totalBalances)} colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><Summary icon="cash-outline" label="TODAY" value={money(totalEntered)} colors={colors} /></View>
        <View style={[styles.control, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.controlIcon, { backgroundColor: colors.infoBg }]}><Ionicons name="calendar-outline" size={18} color={colors.primary} /></View><Pressable style={{ flex: 1 }} onPress={openDatePicker}><Text style={[styles.caption, { color: colors.textMuted }]}>COLLECTION DATE{dateLocked ? ' • LOCKED' : ' • TAP TO CHANGE'}</Text><Text style={[styles.dateValue, { color: colors.text }]}>{date}</Text></Pressable><Ionicons name={dateLocked ? 'lock-closed' : 'chevron-forward'} size={17} color={colors.textMuted} /></View>
        {showDatePicker && Platform.OS === 'android' ? <DateTimePicker value={parseDate(date)} mode="date" display="calendar" onChange={handleDateChange} /> : null}
        {showDatePicker && Platform.OS === 'ios' ? <DateTimePicker value={parseDate(date)} mode="date" display="spinner" onChange={handleDateChange} /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{unions.map((union) => { const active = union === activeUnion; const count = clients.filter((c) => (String(c.union || '').trim() || 'Unassigned') === union).length; return <Pressable key={union} onPress={() => setActiveUnion(union)} style={[styles.tab, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Ionicons name={active ? 'people' : 'people-outline'} size={15} color={active ? '#fff' : colors.textSecondary} /><Text style={[styles.tabText, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>{union}</Text><View style={[styles.count, { backgroundColor: active ? 'rgba(255,255,255,.2)' : colors.infoBg }]}><Text style={[styles.countText, { color: active ? '#fff' : colors.primary }]}>{count}</Text></View></Pressable>; })}</ScrollView>
        {loading || loadingRows ? <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading clients...</Text></View> : filtered.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="people-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>No clients in this union</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Select another union or check the client assignment.</Text></View> : filtered.map((row) => <View key={row.id} style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.clientTop}><View style={[styles.avatar, { backgroundColor: colors.infoBg }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{row.name.split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[styles.clientName, { color: colors.text }]}>{row.name}</Text><Text style={[styles.clientMeta, { color: colors.textSecondary }]}>{row.phone || row.id}</Text></View></View><View style={styles.clientStats}><View style={[styles.clientStat, { backgroundColor: colors.infoBg }]}><View style={styles.statIcon}><Ionicons name="wallet-outline" size={15} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.statLabel, { color: colors.textMuted }]}>SAVINGS BALANCE</Text><Text style={[styles.statValue, { color: colors.text }]}>{money(row.savings_balance)}</Text></View></View><View style={[styles.clientStat, { backgroundColor: colors.inputBg, borderColor: colors.border }]}><View style={[styles.statIcon, { backgroundColor: colors.card }]}><Ionicons name="cash-outline" size={15} color="#B91C1C" /></View><View style={{ flex: 1 }}><Text style={[styles.statLabel, { color: colors.textMuted }]}>LOAN OUTSTANDING</Text><Text style={[styles.statValue, { color: colors.text }]}>{money(row.loan_outstanding)}</Text></View></View></View><View style={styles.amountRow}><View style={[styles.amountWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}><Text style={[styles.currency, { color: colors.primary }]}>₦</Text><TextInput value={row.amount} onChangeText={(v) => setRow(row.id, v)} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.amountInput, { color: colors.text }]} /></View><Pressable onPress={() => saveRow(row)} disabled={savingId === row.id} style={[styles.collectBtn, { backgroundColor: colors.primary, opacity: savingId === row.id ? 0.65 : 1 }]}>{savingId === row.id ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.collectText}>Collect</Text></>}</Pressable></View></View>)}
        <View style={[styles.footerTotal, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.footerLabel, { color: colors.textSecondary }]}>ENTERED COLLECTIONS</Text><Text style={[styles.footerCount, { color: colors.text }]}>{enteredCount} client{enteredCount === 1 ? '' : 's'}</Text></View><Text style={[styles.footerAmount, { color: colors.primary }]}>{money(totalEntered)}</Text></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Summary({ icon, label, value, colors }: any) { return <View style={styles.summaryItem}><Ionicons name={icon} size={18} color={colors.primary} /><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 40 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, title: { fontSize: 20, fontWeight: '900' }, subtitle: { fontSize: 12, marginTop: 2 }, pill: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }, pillText: { fontSize: 10, fontWeight: '900' }, summary: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, summaryItem: { flex: 1, alignItems: 'center', gap: 3 }, summaryLabel: { fontSize: 9, fontWeight: '800' }, summaryValue: { fontSize: 13, fontWeight: '900' }, divider: { width: 1, height: 34 }, control: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, controlIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, caption: { fontSize: 9, fontWeight: '800' }, dateValue: { fontSize: 15, fontWeight: '900', marginTop: 2 }, tabs: { gap: 8, paddingBottom: 10 }, tab: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }, tabText: { fontSize: 12, fontWeight: '800', maxWidth: 130 }, count: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, countText: { fontSize: 10, fontWeight: '900' }, loading: { paddingVertical: 60, alignItems: 'center', gap: 10 }, loadingText: { fontSize: 12 }, empty: { borderWidth: 1, borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 10 }, emptyTitle: { fontSize: 16, fontWeight: '900', marginTop: 8 }, emptyText: { fontSize: 12, textAlign: 'center', marginTop: 4 }, clientCard: { borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 10 }, clientTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 13, fontWeight: '900' }, clientName: { fontSize: 15, fontWeight: '900' }, clientMeta: { fontSize: 11, marginTop: 2 }, clientStats: { flexDirection: 'row', gap: 8, marginTop: 12 }, clientStat: { flex: 1, borderRadius: 13, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, statLabel: { fontSize: 8, fontWeight: '900' }, statValue: { fontSize: 14, fontWeight: '900', marginTop: 2 }, amountRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, amountWrap: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }, currency: { fontSize: 17, fontWeight: '900' }, amountInput: { flex: 1, fontSize: 16, fontWeight: '800', paddingVertical: 0, paddingHorizontal: 8 }, collectBtn: { minWidth: 104, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, collectText: { color: '#fff', fontSize: 13, fontWeight: '900' }, footerTotal: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, footerLabel: { fontSize: 9, fontWeight: '900' }, footerCount: { fontSize: 12, fontWeight: '800', marginTop: 3 }, footerAmount: { fontSize: 18, fontWeight: '900' },
});