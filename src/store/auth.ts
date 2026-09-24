import { create } from 'zustand';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  biometricLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (payload: { full_name?: string; email?: string; current_password?: string; new_password?: string; profile_pic?: string }) => Promise<User>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(username, password);
      if (res.success && res.user) {
        set({ user: res.user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      }
      set({ error: res.error || 'Invalid credentials', isLoading: false, isAuthenticated: false });
      return false;
    } catch (e: any) {
      const message = e?.message || e?.response?.data?.error || 'Network error. Please try again.';
      set({ error: message, isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  biometricLogin: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = await api.getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return false;
      }
      const user = await api.me();
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      }
      await api.clearToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    } catch {
      set({ isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  logout: async () => {
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    try {
      await api.logout();
    } catch {
      try { await api.clearToken(); } catch { /* ignore */ }
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await api.getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }
      const user = await api.me();
      if (user) set({ user, isAuthenticated: true, isLoading: false });
      else {
        await api.clearToken();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      try { await api.clearToken(); } catch { /* ignore */ }
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: async (payload) => {
    const updated = await api.updateProfile(payload);
    // Keep existing authenticated data such as resolved location names when
    // an older API response does not include those fields.
    const current = useAuthStore.getState().user;
    const merged: User = { ...(current || {}), ...updated } as User;
    set({ user: merged, error: null });

    // Re-fetch /me so Header, Profile and Dashboard all use the same server state.
    try {
      const fresh = await api.me();
      if (fresh) {
        const latest: User = { ...merged, ...fresh } as User;
        set({ user: latest, error: null });
        return latest;
      }
    } catch {
      // The successful update is still retained locally.
    }
    return merged;
  },

  clearError: () => set({ error: null }),
}));
