import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import { SPACING } from '../../src/constants/config';
import { useThemeStore } from '../../src/store/theme';
import type { Portfolio, Loan, Transaction } from '../../src/types';

function formatMoney(amount: number | undefined | null) {
  if (amount == null) return '₦0';
  return (
    '₦' +
    Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

export default function ClientPortfolioScreen() {
  const colors = useThemeStore((s) => s.colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const [p, l, t] = await Promise.all([
        api.getPortfolio(id),
        api.getLoans(id).catch(() => []),
        api.getTransactions(id).catch(() => []),
      ]);
      setPortfolio(p);
      setLoans(l);
      setTransactions(t);
    } catch (e: any) {
      setError(
        e?.response?.data?.error || e?.message || 'Failed to load portfolio'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={'#3B82F6'} />
      </View>
    );
  }

  if (error || !portfolio) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error || 'Client not found'}</Text>
      </View>
    );
  }

  const { client, savings, loans: loanSummary } = portfolio;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          colors={['#3B82F6']}
        />
      }
    >
      {/* Client Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(client.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.clientName}>{client.name}</Text>
        <Text style={styles.clientId}>ID: {client.id}</Text>
        {client.phone && (
          <Text style={styles.clientMeta}>{client.phone}</Text>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
          <Text style={styles.summaryLabel}>Savings</Text>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>
            {formatMoney(savings.balance)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>
            {formatMoney(loanSummary.outstanding)}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={styles.summaryLabel}>Total Deposits</Text>
          <Text style={[styles.summaryValue, { color: '#2563EB' }]}>
            {formatMoney(savings.total_deposits)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#F3E8FF' }]}>
          <Text style={styles.summaryLabel}>Loans</Text>
          <Text style={[styles.summaryValue, { color: '#7C3AED' }]}>
            {loanSummary.count}
          </Text>
        </View>
      </View>

      {/* Loans List */}
      {loans.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Loans</Text>
          {loans.map((loan) => (
            <View key={String(loan.id)} style={[styles.listCard, { backgroundColor: colors.card }]}>
              <View style={styles.listRow}>
                <Text style={[styles.listLabel, { color: colors.textSecondary }]}>Principal</Text>
                <Text style={[styles.listValue, { color: colors.text }]}>
                  {formatMoney(loan.principal)}
                </Text>
              </View>
              <View style={styles.listRow}>
                <Text style={[styles.listLabel, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.listValue, { color: '#FFC107' }]}>
                  {formatMoney(loan.remaining_balance)}
                </Text>
              </View>
              <View style={styles.listRow}>
                <Text style={[styles.listLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={styles.listValue}>{loan.status || '—'}</Text>
              </View>
              {loan.due_date && (
                <View style={styles.listRow}>
                  <Text style={[styles.listLabel, { color: colors.textSecondary }]}>Due</Text>
                  <Text style={styles.listValue}>{loan.due_date}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          {transactions.slice(0, 15).map((tx, idx) => (
            <View key={`${tx.transaction_id}-${idx}`} style={[styles.txCard, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txType, { color: colors.text }]}>
                  {tx.source.toUpperCase()} • {tx.type}
                </Text>
                <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  {
                    color:
                      tx.type?.toLowerCase().includes('deposit') ||
                      tx.type?.toLowerCase().includes('repayment')
                        ? '#4CAF50'
                        : '#1E293B',
                  },
                ]}
              >
                {formatMoney(tx.amount)}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  headerCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clientId: {
    fontSize: 13,
    color: '#A0AEC0',
    marginTop: 4,
  },
  clientMeta: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  listLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  listValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  txType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  txDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
