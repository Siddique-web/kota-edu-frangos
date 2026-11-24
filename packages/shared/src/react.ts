import { useEffect, useState, useSyncExternalStore } from 'react';
import type { KotaStore } from './store';
import type { AppState } from './types';

/** Subscreve o store e re-renderiza em cada alteração (funciona em React DOM e React Native). */
export function useStoreState(store: KotaStore): AppState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Relógio reativo (para cronómetros do KDS e rastreio ao vivo). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
