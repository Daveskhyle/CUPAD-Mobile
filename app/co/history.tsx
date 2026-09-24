import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../src/store/theme';
import { loadActivities } from '../../src/services/data';
import { SPACING, RADIUS } from '../../src/constants/config';

const typeMeta: Record<string, { icon: string; color: string; label: string }> = {
  Saving: { icon: 'arrow-down-circle-outline', color: '#16A34A', label: 'Savings' },
  Withdrawal: { icon: 'arrow-up-circle-outline', color: '#DC2626', label: 'Withdrawals' },
  Payment: { icon: 'cash-outline', color: '#7C3AED', label: 'Payments' },
  Disbursement: { icon: 'card-outline', color: '#2563EB', label: 'Disbursements' },
  Registration: { icon: 'person-add-outline', color: '#0891B2', label: 'Registrations' },
};
const filters = ['All', 'Saving', 'Withdrawal', 'Payment', 'Disbursement', 'Registration'];

export default function CoHistoryScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setNote(null);
    try {
      const res = await loadActivities(100);
      setItems(Array.isArray(res.data) ? res.data : []);
      setNote(res.error || null);
    } catch (error: any) {
      setItems([]);
      setNote(error?.message || 'Could not load activity history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = filter === 'All' || item.type === filter;
      const matchesSearch = !query || String(item.client_name || '').toLowerCase().includes(query) || String(item.type || '').toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [items, filter, search]);

  const totalAmount = useMemo(() => filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), [filteredItems]);
  const totalTransactions = items.length;
  const totalSavings = useMemo(() => items.filter((i) => i.type === 'Saving').reduce((s, i) => s + Number(i.amount || 0), 0), [items]);

  const money = (value: unknown) => `₦${Number(value || 0).toLocaleString()}`;
  const formatDate = (value: unknown) => {
    if (!value) return 'Date unavailable';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    return date.toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const filterCount = (name: string) => name === 'All' ? items.length : items.filter((i) => i.type === name).length;

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <View style={[styles.loadingIcon, { backgroundColor: colors.card }]}><ActivityIndicator size="small" color={colors.primary} /></View>
      <Text style={[styles.loadingTitle, { color: colors.text }]}>Loading history</Text>
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching your latest field transactions…</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => String(item.transaction_id || item.id || `${item.type}-${item.date}-${index}`)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primary + '16' }]}>
                <Ionicons name="time-outline" size={25} color={colors.primary} />
              </View>
              <View style={styles.heroBody}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Activity History</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Track your recent field transactions</Text>
              </View>
              <View style={[styles.livePill, { backgroundColor: colors.success + '14' }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>TRANSACTIONS</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{totalTransactions}</Text>
                <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>SAVINGS</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{money(totalSavings)}</Text>
                <Ionicons name="trending-up-outline" size={16} color={colors.success} />
              </View>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={19} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search client or transaction type"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                returnKeyType="search"
              />
              {search ? <Pressable onPress={() => setSearch('')} hitSlop={10}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable> : null}
            </View>

            {note ? (
              <View style={[styles.info, { backgroundColor: colors.infoBg }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.primary} />
                <View style={styles.infoBody}>
                  <Text style={[styles.infoText, { color: colors.primaryDark }]}>{note}</Text>
                  <Pressable onPress={() => { setRefreshing(true); void load(); }}><Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text></Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.filterHeader}>
              <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>{filteredItems.length} matching record{filteredItems.length === 1 ? '' : 's'}</Text></View>
              <Text style={[styles.total, { color: colors.primary }]}>{money(totalAmount)}</Text>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={filters}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => {
                const active = filter === item;
                return (
                  <Pressable onPress={() => setFilter(item)} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}>
                    <Text style={{ color: active ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '800' }}>{item === 'All' ? 'All' : typeMeta[item]?.label || item}</Text>
                    <View style={[styles.countPill, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : colors.background }]}><Text style={{ color: active ? '#fff' : colors.textMuted, fontSize: 10, fontWeight: '800' }}>{filterCount(item)}</Text></View>
                  </Pressable>
                );
              }}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}><Ionicons name={note ? 'cloud-offline-outline' : search || filter !== 'All' ? 'search-outline' : 'receipt-outline'} size={38} color={colors.textMuted} /></View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{note ? 'History unavailable' : search || filter !== 'All' ? 'No matching activity' : 'No activity yet'}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{note ? 'We could not retrieve your transaction history. Check your connection and try again.' : search || filter !== 'All' ? 'Try a different client name or transaction filter.' : 'Your completed field transactions will appear here.'}</Text>
            {(search || filter !== 'All') && <Pressable onPress={() => { setSearch(''); setFilter('All'); }} style={[styles.clearButton, { backgroundColor: colors.primary }]}><Text style={styles.clearButtonText}>Clear filters</Text></Pressable>}
          </View>
        }
        renderItem={({ item }) => {
          const meta = typeMeta[item.type] || { icon: 'time-outline', color: colors.primary, label: item.type || 'Activity' };
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.activityIcon, { backgroundColor: meta.color + '16' }]}><Ionicons name={meta.icon as any} size={21} color={meta.color} /></View>
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text style={[styles.client, { color: colors.text }]} numberOfLines={1}>{item.client_name || 'Unknown client'}</Text>
                  <Text style={[styles.amount, { color: meta.color }]}>{money(item.amount)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <View style={[styles.typeBadge, { backgroundColor: meta.color + '14' }]}><Text style={{ color: meta.color, fontSize: 10, fontWeight: '800' }}>{meta.label}</Text></View>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: SPACING.md, paddingBottom: 40, flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { marginTop: 14, fontSize: 16, fontWeight: '800' },
  loadingText: { marginTop: 5, fontSize: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, padding: 15, marginBottom: 10 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  heroBody: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: '900' },
  heroSubtitle: { fontSize: 11, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', gap: 9, marginBottom: 10 },
  summaryCard: { flex: 1, minHeight: 84, borderRadius: RADIUS.md, borderWidth: 1, padding: 12 },
  summaryLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  summaryValue: { fontSize: 17, fontWeight: '900', marginTop: 5, marginBottom: 4 },
  searchBox: { height: 46, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 9, paddingVertical: 0 },
  info: { flexDirection: 'row', alignItems: 'flex-start', padding: 11, borderRadius: RADIUS.md, marginBottom: 10 },
  infoBody: { flex: 1, marginLeft: 8 },
  infoText: { fontSize: 11, lineHeight: 17 },
  retryText: { fontSize: 12, fontWeight: '900', marginTop: 5 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  sectionHint: { fontSize: 10, marginTop: 2 },
  total: { fontSize: 13, fontWeight: '900' },
  filters: { gap: 8, paddingVertical: 10, paddingBottom: 13 },
  filterChip: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1 },
  countPill: { minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, padding: 12, marginBottom: 8 },
  activityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  cardBody: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  client: { flex: 1, fontSize: 14, fontWeight: '800' },
  amount: { fontSize: 14, fontWeight: '900' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, gap: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  date: { flex: 1, textAlign: 'right', fontSize: 10 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 22 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900', marginTop: 14 },
  emptyText: { fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  clearButton: { marginTop: 15, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9 },
  clearButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
