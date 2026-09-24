import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform key/value storage.
 * - Native: expo-secure-store
 * - Web: localStorage or in-memory fallback
 */
const memory = new Map<string, string>();

export async function storageGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
      return memory.get(key) ?? null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    memory.set(key, value);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // keep memory value
  }
}

export async function storageDelete(key: string): Promise<void> {
  try {
    memory.delete(key);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
