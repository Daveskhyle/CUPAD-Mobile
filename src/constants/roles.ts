/**
 * CUPAD role definitions – mirrors the PHP web app
 * admin | zm | dzm | am | bm | co | tm | client
 */

export type Role =
  | 'admin' | 'zm' | 'dzm' | 'am' | 'bm' | 'co' | 'tm' | 'client' | string;

export interface RoleConfig {
  key: Role;
  label: string;
  shortLabel: string;
  description: string;
  scope: 'system' | 'zone' | 'area' | 'branch' | 'self';
  accent: string;
  actions: string[];
}

export const ROLES: Record<string, RoleConfig> = {
  admin: { key: 'admin', label: 'Administrator', shortLabel: 'Admin', description: 'Full system access', scope: 'system', accent: '#3B82F6', actions: ['users', 'branches', 'analytics', 'clients', 'settings', 'backup'] },
  zm: { key: 'zm', label: 'Zone Manager', shortLabel: 'ZM', description: 'Manages an entire zone', scope: 'zone', accent: '#8B5CF6', actions: ['areas', 'branches', 'analytics', 'clients', 'officers'] },
  dzm: { key: 'dzm', label: 'Deputy Zone Manager', shortLabel: 'DZM', description: 'Assists zone management', scope: 'zone', accent: '#A78BFA', actions: ['areas', 'branches', 'analytics', 'clients', 'officers'] },
  am: { key: 'am', label: 'Area Manager', shortLabel: 'AM', description: 'Manages branches in an area', scope: 'area', accent: '#06B6D4', actions: ['branches', 'analytics', 'clients', 'activities', 'officers'] },
  bm: { key: 'bm', label: 'Branch Manager', shortLabel: 'BM', description: 'Manages a single branch', scope: 'branch', accent: '#10B981', actions: ['clients', 'collect', 'savings', 'withdrawal', 'loans', 'disbursement', 'register', 'union_groups', 'analytics', 'history', 'summary', 'close_account', 'passkey'] },
  co: { key: 'co', label: 'Collection Officer', shortLabel: 'CO', description: 'Field collections & client visits', scope: 'branch', accent: '#F59E0B', actions: ['collect', 'savings', 'loans', 'disbursement', 'withdrawal', 'clients', 'register', 'union_groups', 'analytics', 'history', 'summary', 'close_account', 'passkey'] },
  tm: { key: 'tm', label: 'Territory Manager', shortLabel: 'TM', description: 'Territory-level oversight', scope: 'zone', accent: '#EC4899', actions: ['analytics', 'clients', 'branches', 'officers'] },
  client: { key: 'client', label: 'Client', shortLabel: 'Client', description: 'Member portal', scope: 'self', accent: '#6366F1', actions: ['portfolio', 'savings', 'loans', 'transactions'] },
};

export function getRoleConfig(role?: string | null): RoleConfig {
  const key = (role || 'co').toLowerCase();
  return ROLES[key] || ROLES.co;
}

export function getRoleLabel(role?: string | null): string { return getRoleConfig(role).label; }

export const ACTION_META: Record<string, { label: string; icon: string; route?: string; color: string }> = {
  users: { label: 'Manage Users', icon: 'people', color: '#3B82F6' },
  branches: { label: 'Branches', icon: 'business', color: '#06B6D4' },
  areas: { label: 'Areas', icon: 'map', color: '#8B5CF6' },
  analytics: { label: 'Analytics', icon: 'stats-chart', color: '#6366F1', route: '/co/analytics' },
  clients: { label: 'Clients', icon: 'person', color: '#10B981', route: '/(tabs)/search' },
  settings: { label: 'Settings', icon: 'settings', color: '#64748B' },
  backup: { label: 'Backup', icon: 'cloud-upload', color: '#F59E0B' },
  officers: { label: 'Officers', icon: 'briefcase', color: '#EC4899' },
  activities: { label: 'Activities', icon: 'time', color: '#14B8A6' },
  collections: { label: 'Collections', icon: 'cash', color: '#22C55E', route: '/co/combined' },
  loans: { label: 'Repay', icon: 'card', color: '#8B5CF6', route: '/co/loan-collection' },
  savings: { label: 'Savings', icon: 'wallet', color: '#22C55E', route: '/co/savings' },
  withdrawal: { label: 'Withdraw', icon: 'arrow-down-circle', color: '#EF4444', route: '/co/withdrawal' },
  disbursement: { label: 'Disburse', icon: 'cash', color: '#3B82F6', route: '/co/disbursement' },
  collect: { label: 'Collect', icon: 'layers', color: '#F59E0B', route: '/co/combined' },
  register: { label: 'Register', icon: 'person-add', color: '#6366F1', route: '/co/register' },
  union_groups: { label: 'Unions', icon: 'git-network', color: '#0EA5E9', route: '/co/union-groups' },
  history: { label: 'History', icon: 'time', color: '#64748B', route: '/co/history' },
  summary: { label: 'Client Summary', icon: 'document-text', color: '#0EA5E9', route: '/co/client-summary' },
  close_account: { label: 'Close Account', icon: 'person-remove', color: '#EF4444', route: '/co/close-account' },
  passkey: { label: 'Passkey Setup', icon: 'finger-print', color: '#3B82F6', route: '/co/passkey' },
  portfolio: { label: 'My Portfolio', icon: 'pie-chart', color: '#6366F1' },
  transactions: { label: 'Transactions', icon: 'list', color: '#64748B' },
};
