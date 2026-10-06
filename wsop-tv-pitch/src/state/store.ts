// One in-memory store shared by the App demo and the CMS demo (refresh resets it).
// CMS writes here → the app re-renders immediately: that is the "no app release needed" story.
import { useSyncExternalStore } from 'react';
import type { HomeSection, Member, Schedule } from '../data/types';
import { defaultOffSeasonLayout, defaultSeasonLayout, schedules as seedSchedules } from '../data/mock';
import type { DisplayTz } from '../lib/time';

export type Mode = 'season' | 'offseason';

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
  schedules: Schedule[];
  layouts: Record<Mode, HomeSection[]>;
  /** When each layout set was last published from the CMS. */
  publishedAt: Record<Mode, number | null>;
  alarms: string[];
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
  schedules: seedSchedules,
  layouts: { season: defaultSeasonLayout, offseason: defaultOffSeasonLayout },
  publishedAt: { season: null, offseason: null },
  alarms: ['sc-13'],
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

export function addSchedule(s: Schedule) {
  store.set((st) => ({ schedules: [...st.schedules, s] }));
}

export function publishLayout(mode: Mode, sections: HomeSection[]) {
  store.set((s) => ({ layouts: { ...s.layouts, [mode]: sections }, publishedAt: { ...s.publishedAt, [mode]: Date.now() } }));
}
