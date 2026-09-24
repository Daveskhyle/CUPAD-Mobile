import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/theme';
import { loadDashboardStats, loadActivities } from '../../src/services/data';

const money = (value: unknown) => `₦${Number(value ?? 0).toLocaleString()}`;

export default function CoAnalyticsScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [statsRes, activityRes] = await Promise.all([loadDashboardStats(), loadActivities(30)]);
    setStats(statsRes.data);
    setActivities(activityRes.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const metrics = useMemo(() => [
    { label: 'Clients', value: String(stats?.clients ?? 0), icon: 'people-outline', color: '#3B82F6' },
    { label: 'Total Savings', value: money(stats?.total_savings), icon: 'wallet-outline', color: '#16A34A' },
    { label: 'Outstanding', value: money(stats?.total_loans_outstanding ?? stats?.outstanding), icon: 'alert-circle-outline', color: '#DC2626' },
    { label: 'Active Loans', value: String(stats?.active_loans ?? 0), icon: 'document-text-outline', color: '#F59E0B' },
    { label: 'Monthly Disbursed', value: money(stats?.monthly_disbursed), icon: 'cash-outline', color: '#6366F1' },
    { label: 'Net Savings', value: money(stats?.monthly_net_savings ?? stats?.net_savings_month), icon: 'trending-up-outline', color: '#0EA5E9' },
  ], [stats]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.infoBg }]}><Ionicons name="stats-chart" size={25} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>Analytics</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your portfolio and field performance</Text></View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Overview</Text>
      <View style={styles.grid}>{metrics.map((item) => <View key={item.label} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: `${item.color}15` }]}><Ionicons name={item.icon as any} size={19} color={item.color} /></View><Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text><Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{item.value}</Text></View>)}</View>

      <View style={styles.headingRow}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction Mix</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Recent activity by transaction type</Text></View></View>
      <View style={[styles.mixCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {['Saving', 'Withdrawal', 'Payment', 'Disbursement'].map((type) => { const count = activities.filter((item) => item.type === type).length; const color = type === 'Saving' ? '#16A34A' : type === 'Withdrawal' ? '#DC2626' : type === 'Payment' ? '#7C3AED' : '#2563EB'; return <View key={type} style={styles.mixRow}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.mixLabel, { color: colors.text }]}>{type}</Text><Text style={[styles.mixCount, { color: colors.textSecondary }]}>{count}</Text></View>; })}
      </View>

      <View style={[styles.note, { backgroundColor: colors.infoBg }]}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><Text style={[styles.noteText, { color: colors.primaryDark }]}>Analytics uses the same officer-scoped transaction data as the dashboard activity feed.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 36 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 17, borderRadius: 20, borderWidth: 1, marginBottom: 22 },
  heroIcon: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  title: { fontSize: 22, fontWeight: '900' }, subtitle: { fontSize: 11, marginTop: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '900', marginBottom: 9 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
  card: { width: '48.3%', minHeight: 116, borderRadius: 17, borderWidth: 1, padding: 13, marginBottom: 10 }, icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 9 }, label: { fontSize: 10, fontWeight: '700' }, value: { fontSize: 17, fontWeight: '900', marginTop: 3 },
  headingRow: { marginTop: 4 }, mixCard: { borderRadius: 17, borderWidth: 1, padding: 6, marginBottom: 14 }, mixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 }, dot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 }, mixLabel: { flex: 1, fontSize: 12, fontWeight: '800' }, mixCount: { fontSize: 12, fontWeight: '800' },
  note: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 13 }, noteText: { flex: 1, fontSize: 10, lineHeight: 15, marginLeft: 8, fontWeight: '600' },
});
