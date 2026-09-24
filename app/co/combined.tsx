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
const num = (v: any) => Number(String(v ?? '').replace(/,/g, '')) || 0;
const unionOf = (c: Client) => String(c.union ?? '').trim() || 'Unassigned';

type Settings = {
  max_installments_per_payment: number; min_installments_per_payment: number; grace_period_days: number;
  allow_partial_payments: number; allow_overpayment: number; min_savings_amount: number; max_savings_amount: number;
  allow_weekend_collection: number; max_cash_withdrawal: number; require_image_for_cash: number;
  allow_weekend_withdrawals: number; max_withdrawals_per_day: number; blocked_withdrawal_types: string | string[];
  buffer_cash: number; buffer_withdrawal: number; buffer_return: number; date_readonly: number;
};
const defaults: Settings = { max_installments_per_payment: 3, min_installments_per_payment: 1, grace_period_days: 2, allow_partial_payments: 0, allow_overpayment: 0, min_savings_amount: 100, max_savings_amount: 500000, allow_weekend_collection: 0, max_cash_withdrawal: 50000, require_image_for_cash: 1, allow_weekend_withdrawals: 0, max_withdrawals_per_day: 1, blocked_withdrawal_types: '[]', buffer_cash: 10, buffer_withdrawal: 10, buffer_return: 10, date_readonly: 0 };

type CombinedRow = Client & { loan: any; savings_balance: number; existing: { loan_amt: number; sav_amt: number; wth_type: string; wth_amt: number } };
type Edit = { savings: string; installments: string; withdrawalType: '' | 'cash' | 'withdrawal' | 'return'; withdrawal: string };
const blank = (): Edit => ({ savings: '', installments: '', withdrawalType: '', withdrawal: '' });

export default function CombinedCollectionScreen() {
  const colors = useThemeStore(s => s.colors);
  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [unions, setUnions] = useState<string[]>([]);
  const [activeUnion, setActiveUnion] = useState('');
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dateLocked = Number(settings.date_readonly) === 1 || String(settings.date_readonly).toLowerCase() === 'true';

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const active = await api.getAllClients();
      setClients(active);
      const names = Array.from(new Set(active.map(unionOf))).sort((a, b) => a.localeCompare(b));
      setUnions(names);
      setActiveUnion(prev => prev && names.includes(prev) ? prev : (names[0] || ''));
    } catch (e: any) {
      Alert.alert('Unable to load clients', e?.message || 'Please try again.');
    } finally { setLoading(false); }
  }, []);

  const loadUnion = useCallback(async () => {
    if (!activeUnion) { setRows([]); return; }
    setLoadingRows(true);
    try {
      // PHP source of truth: get_union_data supplies balances/loan state, but the
      // authorized /clients list is the source of truth for which clients render.
      const combined = await api.getCombinedUnionData(activeUnion === 'Unassigned' ? '' : activeUnion, date);
      const meta = (combined as any).__settings;
      if (meta) setSettings(prev => ({ ...prev, ...meta }));

      const byId = new Map<string, any>();
      (Array.isArray(combined) ? combined : []).forEach(item => byId.set(String(item.id), item));

      const unionClients = clients
        .filter(client => unionOf(client) === activeUnion)
        .sort((a, b) => a.name.localeCompare(b.name));

      const rendered = unionClients.map(client => {
        const data = byId.get(String(client.id));
        return {
          ...client,
          loan: data?.loan ?? null,
          savings_balance: Number(data?.savings_balance ?? 0) || 0,
          existing: data?.existing ?? { loan_amt: 0, sav_amt: 0, wth_type: '', wth_amt: 0 },
        } as CombinedRow;
      });
      setRows(rendered);
      setEdits(prev => {
        const next = { ...prev };
        rendered.forEach(r => {
          const old = next[r.id];
          if (old) return;
          const inst = Number(r.loan?.inst_amt || 0);
          const existingLoan = Number(r.existing?.loan_amt || 0);
          next[r.id] = {
            savings: r.existing?.sav_amt ? String(r.existing.sav_amt) : '',
            installments: inst > 0 && existingLoan > 0 ? String(Math.round(existingLoan / inst)) : '',
            withdrawalType: (r.existing?.wth_type || '') as Edit['withdrawalType'],
            withdrawal: r.existing?.wth_amt ? String(r.existing.wth_amt) : '',
          };
        });
        return next;
      });
    } catch (e: any) {
      Alert.alert('Unable to load union', e?.message || 'Please try again.');
      setRows([]);
    } finally { setLoadingRows(false); }
  }, [activeUnion, clients, date]);

  useFocusEffect(useCallback(() => { loadClients(); }, [loadClients]));
  useEffect(() => { loadUnion(); }, [loadUnion]);

  const refresh = async () => { setRefreshing(true); await loadClients(); setRefreshing(false); };
  const edit = (id: string, key: keyof Edit, value: string) => setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || blank()), [key]: value } }));
  const installmentAmount = (r: CombinedRow) => Number(r.loan?.inst_amt || 0);
  const remainingInstallments = (r: CombinedRow) => { const i = installmentAmount(r); return i > 0 ? Math.max(0, Math.ceil(Number(r.loan?.remaining_balance || 0) / i)) : 0; };
  const maxInstallments = (r: CombinedRow) => Math.max(0, Math.min(Number(settings.max_installments_per_payment) || 3, remainingInstallments(r) || 3));
  const blocked = () => { try { const x = Array.isArray(settings.blocked_withdrawal_types) ? settings.blocked_withdrawal_types : JSON.parse(String(settings.blocked_withdrawal_types || '[]')); return Array.isArray(x) ? x.map(v => String(v).toLowerCase()) : []; } catch { return []; } };

  const save = async (r: CombinedRow) => {
    const e = edits[r.id] || blank();
    const installments = Math.max(0, Math.floor(num(e.installments)));
    const savings = num(e.savings);
    const withdrawal = num(e.withdrawal);
    const adjustment = e.withdrawalType;
    const instAmt = installmentAmount(r);

    if (!installments && !savings && !withdrawal) { Alert.alert('No collection entered', 'Enter a loan installment, savings amount or withdrawal/return.'); return; }
    if (installments < 0 || installments > maxInstallments(r)) { Alert.alert('Installment limit', `Allowed installments for this client: 1-${maxInstallments(r)}.`); return; }
    if (installments > 0 && instAmt <= 0) { Alert.alert('No active loan', 'This client does not have an active loan installment.'); return; }
    if (installments > 0 && !Number(settings.allow_partial_payments) && Math.abs(num(e.installments) * instAmt - num(e.installments) * instAmt) > 0.01) { /* count is already installment based */ }
    if (savings > 0 && (savings < Number(settings.min_savings_amount) || savings > Number(settings.max_savings_amount))) { Alert.alert('Savings limit', `Savings must be between ${money(settings.min_savings_amount)} and ${money(settings.max_savings_amount)}.`); return; }
    if (withdrawal < 0 || savings < 0) { Alert.alert('Invalid amount', 'Negative amounts are not allowed.'); return; }
    if (installments > 0 && (adjustment === 'withdrawal' || adjustment === 'return')) { Alert.alert('Invalid combination', 'Repayment and Deduct/Return cannot be processed at the same time.'); return; }
    if (adjustment === 'cash' && withdrawal > Number(settings.max_cash_withdrawal)) { Alert.alert('Withdrawal limit', 'Cash withdrawal exceeds the maximum allowed limit.'); return; }
    if (blocked().includes(String(adjustment).toLowerCase())) { Alert.alert('Adjustment disabled', 'This adjustment type is disabled by the administrator.'); return; }

    const day = parseDate(date).getDay();
    if ((day === 0 || day === 6) && (installments > 0 || savings > 0) && !Number(settings.allow_weekend_collection)) { Alert.alert('Weekend collection disabled', 'Weekend collections are disabled.'); return; }
    if ((day === 0 || day === 6) && withdrawal > 0 && !Number(settings.allow_weekend_withdrawals)) { Alert.alert('Weekend withdrawal disabled', 'Weekend withdrawals are disabled.'); return; }

    setSavingId(r.id);
    try {
      const result = await api.saveCombinedCollection({ client_id: r.id, date, installment: installments, savings_amount: savings, withdrawal_type: adjustment, withdrawal_amount: withdrawal });
      if (!result?.success) throw new Error(result?.error || result?.message || 'Unable to save collection.');
      Alert.alert('Collection saved', `${r.name}\n${result.message || 'Transaction completed successfully.'}`);
      await loadUnion();
    } catch (e: any) {
      Alert.alert('Collection failed', e?.message || 'Unable to save collection.');
    } finally { setSavingId(null); }
  };

  const unionRows = rows;
  const loanBalance = unionRows.reduce((s, r) => s + Number(r.loan?.remaining_balance || 0), 0);
  const savingsBalance = unionRows.reduce((s, r) => s + Number(r.savings_balance || 0), 0);
  const enteredLoan = unionRows.reduce((s, r) => s + num(edits[r.id]?.installments) * installmentAmount(r), 0);
  const enteredSavings = unionRows.reduce((s, r) => s + num(edits[r.id]?.savings), 0);
  const enteredWithdrawal = unionRows.reduce((s, r) => s + num(edits[r.id]?.withdrawal), 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.header}><View><Text style={[styles.title, { color: colors.text }]}>Combined Collection</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Loan, savings and adjustment collection</Text></View><View style={[styles.badge, { backgroundColor: colors.infoBg }]}><Text style={[styles.badgeText, { color: colors.primary }]}>COMBINED</Text></View></View>

        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Summary icon="people-outline" label="CLIENTS" value={unionRows.length} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Summary icon="wallet-outline" label="SAVINGS" value={money(savingsBalance)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Summary icon="cash-outline" label="LOAN BALANCE" value={money(loanBalance)} colors={colors} />
        </View>

        <Pressable disabled={dateLocked} onPress={() => setShowDatePicker(true)} style={[styles.control, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={19} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={[styles.caption, { color: colors.textMuted }]}>COLLECTION DATE{dateLocked ? ' • LOCKED' : ' • TAP TO CHANGE'}</Text><Text style={[styles.date, { color: colors.text }]}>{date}</Text></View>
          <Ionicons name={dateLocked ? 'lock-closed' : 'chevron-forward'} size={17} color={colors.textMuted} />
        </Pressable>
        {showDatePicker && !dateLocked ? <DateTimePicker value={parseDate(date)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'calendar'} onChange={(event: DateTimePickerEvent, selected?: Date) => { if (event.type === 'set' && selected) setDate(formatDate(selected)); if (Platform.OS !== 'ios' || event.type === 'dismissed') setShowDatePicker(false); }} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {unions.map(union => { const active = union === activeUnion; const count = clients.filter(c => unionOf(c) === union).length; return <Pressable key={union} onPress={() => setActiveUnion(union)} style={[styles.tab, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Ionicons name={active ? 'people' : 'people-outline'} size={15} color={active ? '#fff' : colors.textSecondary} /><Text style={[styles.tabText, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>{union}</Text><View style={[styles.count, { backgroundColor: active ? 'rgba(255,255,255,.2)' : colors.infoBg }]}><Text style={[styles.countText, { color: active ? '#fff' : colors.primary }]}>{count}</Text></View></Pressable>; })}
        </ScrollView>

        {loading || loadingRows ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading clients...</Text></View> : unionRows.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="people-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>No clients in this union</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>The client list returned by /clients contains no active clients assigned to this union.</Text></View> : unionRows.map(r => {
          const e = edits[r.id] || blank();
          const inst = installmentAmount(r);
          const max = maxInstallments(r);
          return <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.clientHead}><View style={[styles.avatar, { backgroundColor: colors.infoBg }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{r.name.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text }]}>{r.name}</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>{r.phone || r.id}</Text></View></View>

            <View style={styles.stats}><Stat label="LOAN BALANCE" value={money(r.loan?.remaining_balance)} colors={colors} /><Stat label="INSTALLMENT" value={money(inst)} colors={colors} /><Stat label="SAVINGS BALANCE" value={money(r.savings_balance)} colors={colors} /></View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>LOAN INSTALLMENTS</Text>
            <View style={styles.choiceRow}>{Array.from({ length: Math.max(0, max) }, (_, i) => i + 1).map(n => <Pressable key={n} onPress={() => edit(r.id, 'installments', String(n))} style={[styles.choice, { borderColor: colors.border, backgroundColor: Number(e.installments) === n ? colors.primary : colors.inputBg }]}><Text style={{ color: Number(e.installments) === n ? '#fff' : colors.text, fontWeight: '800' }}>{n}</Text></Pressable>)}</View>

            <View style={styles.inputRow}><Field label="Savings" value={e.savings} onChangeText={v => edit(r.id, 'savings', v)} colors={colors} placeholder="0" /><Field label="Adjustment amount" value={e.withdrawal} onChangeText={v => edit(r.id, 'withdrawal', v)} colors={colors} placeholder="0" /></View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ADJUSTMENT TYPE</Text>
            <View style={styles.choiceRow}>{(['cash', 'withdrawal', 'return'] as const).map(type => <Pressable key={type} onPress={() => edit(r.id, 'withdrawalType', e.withdrawalType === type ? '' : type)} style={[styles.typeChoice, { borderColor: colors.border, backgroundColor: e.withdrawalType === type ? colors.primary : colors.inputBg }]}><Text style={{ color: e.withdrawalType === type ? '#fff' : colors.text, fontSize: 12, fontWeight: '800' }}>{type === 'cash' ? 'Cash' : type === 'withdrawal' ? 'Deduct' : 'Return'}</Text></Pressable>)}</View>

            <View style={styles.actions}><Pressable onPress={() => setEdits(p => ({ ...p, [r.id]: blank() }))} style={[styles.reset, { borderColor: colors.border }]}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Clear</Text></Pressable><Pressable disabled={savingId === r.id} onPress={() => save(r)} style={[styles.save, { backgroundColor: colors.primary, opacity: savingId === r.id ? 0.65 : 1 }]}>{savingId === r.id ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.saveText}>Save Collection</Text></>}</Pressable></View>
          </View>;
        })}

        <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.footerLabel, { color: colors.textSecondary }]}>TODAY'S ENTRIES</Text><Text style={[styles.footerSub, { color: colors.textMuted }]}>Loan {money(enteredLoan)} • Savings {money(enteredSavings)} • Withdrawal {money(enteredWithdrawal)}</Text></View><Text style={[styles.footerTotal, { color: colors.primary }]}>{money(enteredLoan + enteredSavings - enteredWithdrawal)}</Text></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Summary({ icon, label, value, colors }: any) { return <View style={styles.summaryItem}><Ionicons name={icon} size={18} color={colors.primary} /><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text></View>; }
function Stat({ label, value, colors }: any) { return <View style={[styles.stat, { backgroundColor: colors.infoBg }]}><Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.statValue, { color: colors.text }]}>{value}</Text></View>; }
function Field({ label, value, onChangeText, colors, placeholder }: any) { return <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} /></View>; }

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, title: { fontSize: 20, fontWeight: '900' }, subtitle: { fontSize: 12, marginTop: 2 }, badge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }, badgeText: { fontSize: 10, fontWeight: '900' },
  summary: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, summaryItem: { flex: 1, alignItems: 'center', gap: 3 }, summaryLabel: { fontSize: 9, fontWeight: '800' }, summaryValue: { fontSize: 13, fontWeight: '900' }, divider: { width: 1, height: 34 }, control: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }, caption: { fontSize: 9, fontWeight: '800' }, date: { fontSize: 15, fontWeight: '900', marginTop: 3 }, tabs: { gap: 8, paddingVertical: 4, paddingBottom: 12 }, tab: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 220 }, tabText: { fontSize: 12, fontWeight: '800' }, count: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, countText: { fontSize: 10, fontWeight: '900' }, loading: { paddingVertical: 60, alignItems: 'center', gap: 10 }, loadingText: { fontSize: 13 }, empty: { borderWidth: 1, borderRadius: 16, padding: 28, alignItems: 'center' }, emptyTitle: { fontSize: 16, fontWeight: '900', marginTop: 10 }, emptyText: { fontSize: 12, textAlign: 'center', marginTop: 5 }, card: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 12 }, clientHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontWeight: '900' }, name: { fontSize: 15, fontWeight: '900' }, meta: { fontSize: 11, marginTop: 2 }, stats: { flexDirection: 'row', gap: 7, marginTop: 12 }, stat: { flex: 1, borderRadius: 11, padding: 9 }, statLabel: { fontSize: 8, fontWeight: '800' }, statValue: { fontSize: 12, fontWeight: '900', marginTop: 3 }, fieldLabel: { fontSize: 9, fontWeight: '900', marginTop: 12, marginBottom: 6, letterSpacing: .3 }, choiceRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, choice: { width: 38, height: 34, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, typeChoice: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 }, inputRow: { flexDirection: 'row', gap: 9 }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, fontSize: 14 }, actions: { flexDirection: 'row', gap: 8, marginTop: 14 }, reset: { flex: .32, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 }, save: { flex: 1, minHeight: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, saveText: { color: '#fff', fontWeight: '900' }, footer: { borderWidth: 1, borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, footerLabel: { fontSize: 9, fontWeight: '900' }, footerSub: { fontSize: 10, marginTop: 4 }, footerTotal: { fontSize: 18, fontWeight: '900' },
});