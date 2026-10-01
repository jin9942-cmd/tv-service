import { useSyncExternalStore } from 'react';
import { createStore } from '../lib/storage';
import type { Tier } from '../config/entitlements';

export interface AuthState {
  tier: Tier;
  displayName: string | null;
}

export interface DemoSettings {
  /** Simulates a day without any live tournament. */
  noLive: boolean;
  /** Points every player at a missing file to exercise the error UI. */
  forceVideoError: boolean;
}

export interface ProgressEntry {
  key: string;
  title: string;
  subtitle: string;
  url: string;
  image?: string;
  position: number;
  duration: number;
  updatedAt: number;
}

export const authStore = createStore<AuthState>('auth', { tier: 'guest', displayName: null });
export const demoStore = createStore<DemoSettings>('settings', { noLive: false, forceVideoError: false });
export const progressStore = createStore<Record<string, ProgressEntry>>('progress', {});

export function useStore<T>(store: { get: () => T; subscribe: (l: () => void) => () => void }): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function saveProgress(entry: Omit<ProgressEntry, 'updatedAt'>) {
  progressStore.set((prev) => ({ ...prev, [entry.key]: { ...entry, updatedAt: Date.now() } }));
}

export function clearProgress(key: string) {
  progressStore.set((prev) => {
    const next = { ...prev };
    delete next[key];
    return next;
  });
}
