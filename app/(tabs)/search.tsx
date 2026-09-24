import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { SPACING, RADIUS } from '../../src/constants/config';
import { useThemeStore } from '../../src/store/theme';
import type { Client } from '../../src/types';

export default function SearchScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Search', 'Please enter a name, phone or client ID');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      // Note: /clients currently requires API Key on server side.
      // For now we show a helpful message if it fails.
      const res = await api.getClients({ q: query.trim(), limit: 30 });
      if (res.success && res.data) {
        setClients(res.data);
      } else {
        setClients([]);
        Alert.alert(
          'API Notice',
          'Client search requires a server API key. Ask the admin to allow JWT for /clients or provide a key.'
        );
      }
    } catch (e: any) {
      setClients([]);
      const msg =
        e?.response?.data?.error ||
        'Could not reach the API. Check your connection or API configuration.';
      Alert.alert('Search failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const openClient = (id: string) => {
    router.push(`/client/${id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search by name, phone or ID..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={'#3B82F6'} />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          ListEmptyComponent={
            searched ? (
              <View style={styles.center}>
                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No clients found</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons name="search-outline" size={48} color="#CBD5E1" />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Search for a client to view portfolio
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => openClient(item.id)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.clientName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.clientMeta, { color: colors.textSecondary }]}>
                  {item.phone || 'No phone'} • ID: {item.id}
                </Text>
                {item.status && (
                  <Text style={styles.status}>{item.status}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: SPACING.md,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 8,
  },
  searchBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  clientMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  status: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '600',
  },
});
