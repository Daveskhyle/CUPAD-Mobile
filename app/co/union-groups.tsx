import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/theme';
import { api } from '../../src/api/client';
import { API_BASE_URL, RADIUS, SPACING } from '../../src/constants/config';

const PRIMARY = '#3B82F6';

export default function UnionGroupsScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const token = await api.getToken();
      const response = await fetch(`${API_BASE_URL}/co/union-groups`, { headers: { Authorization: `Bearer ${token || ''}`, Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok || data?.success === false) throw new Error(data?.error || 'Unable to load unions');
      setGroups(Array.isArray(data?.groups) ? data.groups : Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      Alert.alert('Unable to load groups', error?.message || 'Please check your connection and try again.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const createGroup = async () => {
    const cleanName = name.trim();
    if (!cleanName) return Alert.alert('Group name required', 'Enter a name for the union/group.');
    setSaving(true);
    try {
      const token = await api.getToken();
      const response = await fetch(`${API_BASE_URL}/co/union-groups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: cleanName, description: description.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) throw new Error(data?.error || 'Unable to create group');
      setName(''); setDescription('');
      Alert.alert('Group created', data?.message || `${cleanName} has been created successfully.`);
      await loadGroups();
    } catch (error: any) { Alert.alert('Could not create group', error?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((g) => String(g.name || g.union_name || '').toLowerCase().includes(query) || String(g.description || '').toLowerCase().includes(query));
  }, [groups, search]);

  const totalClients = groups.reduce((sum, g) => sum + Number(g.clients ?? g.client_count ?? 0), 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGroups(); }} tintColor={PRIMARY} colors={[PRIMARY]} />}>
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.heroIcon}><Ionicons name="git-network" size={25} color={PRIMARY} /></View>
        <View style={styles.heroBody}><Text style={[styles.heroTitle, { color: colors.text }]}>My Unions & Groups</Text><Text style={[styles.heroText, { color: colors.textSecondary }]}>View and manage your assigned union groups.</Text></View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="git-network-outline" size={19} color={PRIMARY} /><Text style={[styles.metricValue, { color: colors.text }]}>{groups.length}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Groups</Text></View>
        <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="people-outline" size={19} color="#22C55E" /><Text style={[styles.metricValue, { color: colors.text }]}>{totalClients}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Clients</Text></View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}><View><Text style={[styles.cardTitle, { color: colors.text }]}>Create Union / Group</Text><Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Add a new group to your current branch.</Text></View><View style={styles.smallIcon}><Ionicons name="add" size={19} color={PRIMARY} /></View></View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Group name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Ogo-Oluwa Union" placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Description <Text style={{ fontWeight: '400' }}>(optional)</Text></Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Brief description" placeholderTextColor={colors.textMuted} multiline style={[styles.input, styles.description, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
        <TouchableOpacity disabled={saving} onPress={createGroup} style={[styles.primaryButton, { backgroundColor: PRIMARY, opacity: saving ? 0.7 : 1 }]} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="add-circle-outline" size={19} color="#fff" /><Text style={styles.primaryText}>Create Group</Text></>}
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}><View><Text style={[styles.listTitle, { color: colors.text }]}>Assigned Groups</Text><Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{filteredGroups.length} group{filteredGroups.length === 1 ? '' : 's'} available</Text></View></View>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search-outline" size={19} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search groups..." placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} /></View>

      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={PRIMARY} /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your groups...</Text></View> : filteredGroups.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.emptyIcon}><Ionicons name={search ? 'search-outline' : 'git-network-outline'} size={29} color={PRIMARY} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>{search ? 'No matching groups' : 'No groups assigned'}</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{search ? 'Try a different search term.' : 'Create your first group above or ask management to assign one.'}</Text></View>
      ) : filteredGroups.map((group, index) => {
        const clientCount = Number(group.clients ?? group.client_count ?? 0);
        return <View key={String(group.id || group.uuid || group.name || index)} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.groupIcon}><Ionicons name="people-outline" size={21} color={PRIMARY} /></View>
          <View style={styles.groupBody}><Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{group.name || group.union_name || 'Unnamed group'}</Text>{group.description ? <Text style={[styles.groupDescription, { color: colors.textSecondary }]} numberOfLines={2}>{group.description}</Text> : null}<View style={styles.groupMeta}><Ionicons name="people" size={13} color="#22C55E" /><Text style={[styles.groupMetaText, { color: colors.textSecondary }]}>{clientCount} client{clientCount === 1 ? '' : 's'}</Text></View></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
        </View>;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: SPACING.md, paddingBottom: 48 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: 12 }, heroIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DBEAFE' }, heroBody: { flex: 1, marginLeft: 12 }, heroTitle: { fontSize: 20, fontWeight: '800' }, heroText: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 }, metric: { flex: 1, minHeight: 82, borderRadius: RADIUS.md, borderWidth: 1, padding: 13 }, metricValue: { fontSize: 21, fontWeight: '800', marginTop: 4 }, metricLabel: { fontSize: 11, marginTop: 1 },
  card: { padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: 22 }, cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, cardTitle: { fontSize: 16, fontWeight: '800' }, cardSubtitle: { fontSize: 11, marginTop: 3 }, smallIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 }, input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, marginBottom: 14 }, description: { minHeight: 72, textAlignVertical: 'top' }, primaryButton: { height: 48, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  listHeader: { marginBottom: 9 }, listTitle: { fontSize: 17, fontWeight: '800' }, listSubtitle: { fontSize: 11, marginTop: 2 }, searchBox: { height: 46, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 11 }, searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  groupCard: { minHeight: 78, borderRadius: RADIUS.md, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9 }, groupIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#EFF6FF' }, groupBody: { flex: 1 }, groupName: { fontSize: 14, fontWeight: '800' }, groupDescription: { fontSize: 11, marginTop: 3, lineHeight: 16 }, groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }, groupMetaText: { fontSize: 10 },
  loading: { alignItems: 'center', paddingVertical: 40 }, loadingText: { fontSize: 12, marginTop: 10 }, empty: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 30, alignItems: 'center' }, emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' }, emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 12 }, emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 5 },
});
