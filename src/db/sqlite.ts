type StoredMap = Record<string, any>;

const STORAGE_PREFIX = 'cupad_mobile_';

function readStore<T extends StoredMap>(name: string): T {
  if (typeof window === 'undefined' || !window.localStorage) return {} as T;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_PREFIX + name) || '{}') as T;
  } catch {
    return {} as T;
  }
}

function writeStore(name: string, value: StoredMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(value));
  } catch {
    // Web storage may be unavailable or full; keep the app usable online.
  }
}

export async function getDb(): Promise<null> {
  return null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const store = readStore('kv');
  store[key] = { value, updated_at: Date.now() };
  writeStore('kv', store);
}

export async function kvGet<T = any>(key: string): Promise<T | null> {
  const store = readStore('kv');
  return store[key]?.value ?? null;
}

export async function cacheClients(clients: any[]): Promise<void> {
  const store: StoredMap = {};
  for (const client of clients) store[String(client.id)] = client;
  writeStore('clients_cache', store);
}

export async function searchClientsLocal(q: string, limit = 30): Promise<any[]> {
  const store = readStore('clients_cache');
  const query = String(q || '').trim().toLowerCase();
  return Object.values(store)
    .filter((client: any) => !query || [client?.name, client?.phone, client?.id]
      .some((value) => String(value ?? '').toLowerCase().includes(query)))
    .sort((a: any, b: any) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')))
    .slice(0, limit);
}

export async function cacheActivities(items: any[]): Promise<void> {
  const store: StoredMap = {};
  items.forEach((item: any, index: number) => {
    const id = String(item.transaction_id || item.id || `${item.type}-${item.date}-${index}`);
    store[id] = item;
  });
  writeStore('activities_cache', store);
}

export async function getActivitiesLocal(limit = 40): Promise<any[]> {
  const store = readStore('activities_cache');
  return Object.values(store)
    .sort((a: any, b: any) => String(b?.date ?? '').localeCompare(String(a?.date ?? '')))
    .slice(0, limit);
}

export async function enqueueOp(opType: string, payload: object): Promise<void> {
  const store = readStore('pending_ops');
  const ids = Object.keys(store).map(Number).filter(Number.isFinite);
  const id = ids.length ? Math.max(...ids) + 1 : 1;
  store[String(id)] = { id, op_type: opType, payload: JSON.stringify(payload), created_at: Date.now(), tries: 0 };
  writeStore('pending_ops', store);
}

export async function listPendingOps(): Promise<{ id: number; op_type: string; payload: string; tries: number }[]> {
  return Object.values(readStore('pending_ops'))
    .sort((a: any, b: any) => Number(a.id) - Number(b.id))
    .slice(0, 50);
}

export async function removePendingOp(id: number): Promise<void> {
  const store = readStore('pending_ops');
  delete store[String(id)];
  writeStore('pending_ops', store);
}

export async function bumpPendingOp(id: number, error: string): Promise<void> {
  const store = readStore('pending_ops');
  const item = store[String(id)];
  if (!item) return;
  item.tries = Number(item.tries || 0) + 1;
  item.last_error = String(error).slice(0, 500);
  store[String(id)] = item;
  writeStore('pending_ops', store);
}
