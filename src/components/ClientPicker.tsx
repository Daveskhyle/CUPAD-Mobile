import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useThemeStore } from '../store/theme';
import { SPACING, RADIUS } from '../constants/config';
import type { Client } from '../types';

type Props = { selected: Client | null; onSelect: (c: Client) => void };

export function ClientPicker({ selected, onSelect }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Client[]>([]);
  const [error, setError] = useState('');

  const loadClients = async (query = '') => {
    setLoading(true); setError('');
    try {
      const res = await api.getClients({ q: query.trim() || undefined, limit: 100, offset: 0 });
      if (!res.success) throw new Error(res.error || 'Unable to load clients.');
      // The API scope is authoritative for the signed-in user; this also
      // keeps the picker safe if an unexpected inactive record is returned.
      setResults((res.data || []).filter((c) => String(c.status || '').toLowerCase() === 'active'));
    } catch (e: any) {
      setResults([]); setError(e?.message || 'Unable to load assigned clients.');
    } finally { setLoading(false); }
  };

  const openPicker = () => { setOpen(true); setQ(''); loadClients(); };

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => { if (q.trim()) loadClients(q); }, 300);
    return () => clearTimeout(timer);
  }, [q, open]);

  return <>
    <TouchableOpacity style={[styles.trigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} onPress={openPicker} activeOpacity={0.8}>
      <Ionicons name="person-outline" size={20} color={colors.textMuted} />
      <Text style={[styles.triggerText, { color: selected ? colors.text : colors.textMuted }]} numberOfLines={1}>
        {selected ? `${selected.name} (${selected.id})` : 'Select active client'}
      </Text>
      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
    </TouchableOpacity>

    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <View><Text style={[styles.modalTitle, { color: colors.text }]}>Select Client</Text><Text style={[styles.modalSub, { color: colors.textSecondary }]}>Active clients assigned to you</Text></View>
          <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={25} color={colors.text} /></TouchableOpacity>
        </View>
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={19} color={colors.textMuted} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search name, phone or ID..." placeholderTextColor={colors.textMuted} value={q} onChangeText={setQ} autoFocus returnKeyType="search" />
          {q.length > 0 && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></TouchableOpacity>}
        </View>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{loading ? 'Loading clients…' : `${results.length} active client${results.length === 1 ? '' : 's'}`}</Text>
          <TouchableOpacity onPress={() => loadClients(q)}><Ionicons name="refresh-outline" size={18} color={colors.primary} /></TouchableOpacity>
        </View>
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ padding: SPACING.md, paddingTop: 4, flexGrow: results.length ? 0 : 1 }}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => loadClients(q)}
          ListEmptyComponent={<View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons name="people-outline" size={42} color={colors.textMuted} />}<Text style={[styles.emptyTitle, { color: colors.text }]}>{loading ? 'Loading clients' : error ? 'Could not load clients' : q ? 'No matching active clients' : 'No active clients found'}</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error || (q ? 'Try another name, phone number or client ID.' : 'There are no active clients assigned to your CO account.')}</Text>{!loading && error ? <TouchableOpacity onPress={() => loadClients(q)} style={[styles.retryBtn, { backgroundColor: colors.primary }]}><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}</View>}
          renderItem={({ item }) => <TouchableOpacity style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { onSelect(item); setOpen(false); }} activeOpacity={0.75}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text><Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>{item.id} • {item.phone || 'No phone'}</Text>{item.union ? <Text style={[styles.union, { color: colors.textMuted }]} numberOfLines={1}>{item.union}</Text> : null}</View>
            <View style={styles.activeBadge}><View style={styles.activeDot} /><Text style={styles.activeText}>ACTIVE</Text></View>
          </TouchableOpacity>}
        />
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 14 },
  triggerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  modal: { flex: 1, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '800' },
  modalSub: { fontSize: 11, marginTop: 2 },
  searchRow: { flexDirection: 'row', marginHorizontal: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12, minHeight: 50, alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 15 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 10 },
  resultCount: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 8, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 3 },
  union: { fontSize: 10, marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  activeText: { color: '#059669', fontSize: 8, fontWeight: '900' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, minHeight: 260 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  emptyText: { fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'center' },
  retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '800' },
});