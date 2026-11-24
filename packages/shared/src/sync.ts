import type { Order, StorageAdapter, SyncAdapter, SyncDelta } from './types';

/** Armazenamento em localStorage (Web). Devolve undefined fora do browser. */
export function createLocalStorageAdapter(): StorageAdapter | undefined {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return undefined;
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
    };
  } catch {
    return undefined;
  }
}

/** Adapta @react-native-async-storage/async-storage (ou qualquer API getItem/setItem assíncrona). */
export function createAsyncStorageAdapter(asyncStorage: {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
}): StorageAdapter {
  return {
    getItem: (k) => asyncStorage.getItem(k),
    setItem: (k, v) => asyncStorage.setItem(k, v),
    removeItem: (k) => asyncStorage.removeItem(k),
  };
}

/**
 * Sincronização entre separadores/janelas do mesmo browser (BroadcastChannel).
 * Permite abrir a Visão Cliente num separador e o KDS noutro, em tempo real, sem backend.
 */
export function createBroadcastSync(channelName = 'kota-edu'): SyncAdapter | undefined {
  const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
  if (!BC) return undefined;
  const bc = new BC(channelName);
  const handlers = new Set<(d: SyncDelta) => void>();
  bc.onmessage = (e: MessageEvent) => handlers.forEach((h) => h(e.data as SyncDelta));
  return {
    name: 'BroadcastChannel (local)',
    publish: (delta) => bc.postMessage(delta),
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

/** Subconjunto da API do @supabase/supabase-js usado pelo adaptador (evita dependência direta). */
export interface SupabaseLike {
  from(table: string): any;
  channel(name: string): any;
  removeChannel(channel: any): any;
}

/**
 * Adaptador Supabase (tempo real). Esquema SQL em `supabase/schema.sql`.
 *
 *   import { createClient } from '@supabase/supabase-js';
 *   const sync = createSupabaseSync(createClient(URL, ANON_KEY));
 *   const store = createKotaStore({ storage, sync });
 *
 * Firebase/Firestore: implemente a mesma interface `SyncAdapter` (publish/subscribe/fetchInitial).
 */
export function createSupabaseSync(client: SupabaseLike, opts: { ordersTable?: string; kvTable?: string; days?: number } = {}): SyncAdapter {
  const ordersTable = opts.ordersTable ?? 'kota_orders';
  const kvTable = opts.kvTable ?? 'kota_kv';
  const days = opts.days ?? 8;

  return {
    name: 'Supabase Realtime',
    publish(delta) {
      if (delta.orders?.length) {
        client
          .from(ordersTable)
          .upsert(delta.orders.map((o: Order) => ({ id: o.id, data: o, updated_at: o.updatedAt })))
          .then(() => undefined);
      }
      if (delta.menu) client.from(kvTable).upsert({ key: 'menu', data: delta.menu.items, rev: delta.menu.rev }).then(() => undefined);
      if (delta.zones) client.from(kvTable).upsert({ key: 'zones', data: delta.zones.items, rev: delta.zones.rev }).then(() => undefined);
    },
    subscribe(handler) {
      const ch = client
        .channel('kota-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: ordersTable }, (p: any) => {
          if (p.new?.data) handler({ orders: [p.new.data as Order] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: kvTable }, (p: any) => {
          const row = p.new;
          if (!row) return;
          if (row.key === 'menu') handler({ menu: { rev: row.rev, items: row.data } });
          if (row.key === 'zones') handler({ zones: { rev: row.rev, items: row.data } });
        })
        .subscribe();
      return () => client.removeChannel(ch);
    },
    async fetchInitial() {
      const since = Date.now() - days * 24 * 3600_000;
      const [orders, kv] = await Promise.all([
        client.from(ordersTable).select('data').gte('updated_at', since),
        client.from(kvTable).select('key,data,rev'),
      ]);
      const delta: SyncDelta = {};
      if (orders?.data?.length) delta.orders = orders.data.map((r: { data: Order }) => r.data);
      for (const row of kv?.data ?? []) {
        if (row.key === 'menu') delta.menu = { rev: row.rev, items: row.data };
        if (row.key === 'zones') delta.zones = { rev: row.rev, items: row.data };
      }
      return delta;
    },
  };
}
