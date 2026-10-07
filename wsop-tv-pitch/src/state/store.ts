// One in-memory store shared by the App demo and the CMS demo (refresh resets it).
// CMS writes here → the app re-renders immediately: that is the "no app release needed" story.
import { useSyncExternalStore } from 'react';
import type { HomeSection, Member, MyListItem, MyListKind, Schedule } from '../data/types';
import { continueWatching, defaultOffSeasonLayout, defaultSeasonLayout, schedules as seedSchedules } from '../data/mock';
import { seedVocab, type VocabTerm } from '../data/vocab';
import type { DisplayTz } from '../lib/time';

export type Mode = 'season' | 'offseason';
/** Viewing-location simulation: normal, regional blackout, VPN/proxy detected. */
export type Geo = 'ok' | 'blackout' | 'vpn';
export interface ContinueItem {
  vodId: string;
  progress: number;
}

export interface Toast {
  id: number;
  text: string;
  scope: 'app' | 'cms';
}

export interface State {
  member: Member;
  mode: Mode;
  noLive: boolean;
  tz: DisplayTz;
  notes: boolean;
  geo: Geo;
  /** Paid plan has lapsed: Basic/Premium members fall back to Free until they renew. */
  expired: boolean;
  schedules: Schedule[];
  layouts: Record<Mode, HomeSection[]>;
  /** When each layout set was last published from the CMS. */
  publishedAt: Record<Mode, number | null>;
  alarms: string[];
  myList: MyListItem[];
  continueList: ContinueItem[];
  vocab: VocabTerm[];
  vocabVersion: number;
  recentSearches: string[];
  push: boolean;
  nightPush: boolean;
  toasts: Toast[];
}

let state: State = {
  member: 'guest',
  mode: 'season',
  noLive: false,
  tz: 'Asia/Seoul',
  notes: false,
  geo: 'ok',
  expired: false,
  schedules: seedSchedules,
  layouts: { season: defaultSeasonLayout, offseason: defaultOffSeasonLayout },
  publishedAt: { season: null, offseason: null },
  alarms: ['sc-13'],
  // Example items so the list isn't empty in the demo.
  myList: [
    { kind: 'vod', id: 'v-01', addedAt: Date.now() - 3_600_000 },
    { kind: 'player', id: 'pl-4', addedAt: Date.now() - 7_200_000 },
  ],
  continueList: continueWatching,
  vocab: seedVocab,
  vocabVersion: 12,
  recentSearches: ['Main Event', 'Han'],
  push: true,
  nightPush: false,
  toasts: [],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const store = {
  get: () => state,
  set(patch: Partial<State> | ((s: State) => Partial<State>)) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

let toastId = 0;
export function toast(text: string, scope: Toast['scope'] = 'app') {
  const id = ++toastId;
  store.set((s) => ({ toasts: [...s.toasts, { id, text, scope }] }));
  setTimeout(() => store.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2800);
}

export function toggleAlarm(scheduleId: string) {
  store.set((s) => ({
    alarms: s.alarms.includes(scheduleId) ? s.alarms.filter((a) => a !== scheduleId) : [...s.alarms, scheduleId],
  }));
}

/** Add or remove an item from My List. Returns true when the item was added. */
export function toggleMyList(kind: MyListKind, id: string): boolean {
  const has = store.get().myList.some((x) => x.kind === kind && x.id === id);
  store.set((s) => ({
    myList: has ? s.myList.filter((x) => !(x.kind === kind && x.id === id)) : [{ kind, id, addedAt: Date.now() }, ...s.myList],
  }));
  return !has;
}

export function addSchedule(s: Schedule) {
  store.set((st) => ({ schedules: [...st.schedules, s] }));
}

export function publishLayout(mode: Mode, sections: HomeSection[]) {
  store.set((s) => ({ layouts: { ...s.layouts, [mode]: sections }, publishedAt: { ...s.publishedAt, [mode]: Date.now() } }));
}

export function removeContinue(vodId: string) {
  store.set((s) => ({ continueList: s.continueList.filter((c) => c.vodId !== vodId) }));
}
