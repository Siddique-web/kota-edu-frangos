import { createBroadcastSync, createKotaStore, createLocalStorageAdapter, useStoreState } from '@kota/shared';

/**
 * Store único da aplicação Web.
 * - Persistência: localStorage
 * - Tempo real entre separadores: BroadcastChannel
 * - Para produção: troque `sync` por `createSupabaseSync(supabaseClient)` (ver README).
 */
export const store = createKotaStore({
  storage: createLocalStorageAdapter(),
  storageKey: 'kota-edu-web-v3',
  sync: createBroadcastSync('kota-edu'),
});

export const actions = store.actions;
export const useAppState = () => useStoreState(store);
