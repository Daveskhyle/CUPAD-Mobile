/**
 * Online-only data service.
 *
 * Local SQLite/offline persistence has been removed. All data is read from
 * and written to the CUPAD API.
 */
import { api } from '../api/client';

export type StatsSource = 'network' | 'none';

function emptyStats() {
  return {
    monthly_net_savings: 0,
    monthly_disbursed: 0,
    active_loans: 0,
    total_savings: 0,
    total_loans_outstanding: 0,
    portfolio_net: 0,
    clients: 0,
    savings_today: 0,
    collected_today: 0,
    collected_month: 0,
    net_savings_month: 0,
    outstanding: 0,
    unions: [],
  };
}

export async function loadDashboardStats(): Promise<{
  data: any | null;
  source: StatsSource;
  error?: string;
}> {
  try {
    const data = await api.getDashboardStats();
    if (data) return { data, source: 'network' };

    return {
      data: emptyStats(),
      source: 'none',
      error: 'No dashboard statistics returned by the API.',
    };
  } catch (e: any) {
    return {
      data: emptyStats(),
      source: 'none',
      error: e?.response?.data?.error || e?.message || 'Could not load stats',
    };
  }
}

export async function loadActivities(limit = 40): Promise<{
  data: any[];
  source: StatsSource;
  error?: string;
}> {
  try {
    const data = await api.getActivities(limit);
    return {
      data: Array.isArray(data) ? data : [],
      source: 'network',
    };
  } catch (e: any) {
    return {
      data: [],
      source: 'none',
      error: e?.response?.data?.error || e?.message || 'Could not load activity',
    };
  }
}

export async function searchClients(q: string, limit = 30): Promise<{
  data: any[];
  source: StatsSource;
  error?: string;
}> {
  try {
    const res = await api.getClients({ q, limit });
    return {
      data: Array.isArray(res?.data) ? res.data : [],
      source: 'network',
    };
  } catch (e: any) {
    return {
      data: [],
      source: 'none',
      error: e?.response?.data?.error || e?.message || 'Search failed',
    };
  }
}

export async function collectSavingsOnlineOrQueue(payload: {
  client_id: string;
  amount: number;
  notes?: string;
}) {
  const res = await api.collectSavings(payload);
  if (res?.success) return { ...res, queued: false };
  throw new Error(res?.error || 'Failed to collect savings');
}

export async function withdrawOnlineOrQueue(payload: any) {
  const res = await api.withdrawSavings(payload);
  if (res?.success) return { ...res, queued: false };
  throw new Error(res?.error || 'Failed to withdraw savings');
}

export async function collectLoanOnlineOrQueue(payload: any) {
  const res = await api.collectLoan(payload);
  if (res?.success) return { ...res, queued: false };
  throw new Error(res?.error || 'Failed to collect loan payment');
}

export async function disburseOnlineOrQueue(payload: any) {
  const res = await api.disburseLoan(payload);
  if (res?.success) return { ...res, queued: false };
  throw new Error(res?.error || 'Failed to disburse loan');
}

export async function registerOnlineOrQueue(payload: any) {
  const res = await api.registerClient(payload);
  if (res?.success) return { ...res, queued: false };
  throw new Error(res?.error || 'Failed to register client');
}
