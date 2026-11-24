import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageAdapter, createKotaStore, useStoreState } from '@kota/shared';

/**
 * Store único da app mobile — MESMA camada partilhada da Web.
 * - Persistência: AsyncStorage
 * - Tempo real entre dispositivos: passe `sync: createSupabaseSync(supabase)` (ver README).
 *   Sem backend, a app funciona 100% offline/local (modo demonstração).
 */
export const store = createKotaStore({
  storage: createAsyncStorageAdapter(AsyncStorage),
  storageKey: 'kota-edu-mobile-v3',
});

export const actions = store.actions;
export const useAppState = () => useStoreState(store);
