// Global demo state. React state only — nothing is written to localStorage / sessionStorage / IndexedDB.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AccountScenario, AudioTrack, OverlayLevel, Platform, StreamStatus } from '../data/types';
import { browserTz } from '../lib/time';

export interface Device {
  id: string;
  name: string;
  kind: 'web' | 'mobile' | 'tv';
  lastActive: string;
  current?: boolean;
  streaming?: boolean;
}

export interface Toast {
  id: number;
  text: string;
}

export interface LoginRequest {
  reason: string;
  /** Where to land after the GGPASS round-trip. */
  returnTo?: string;
}

export interface AppState {
  scenario: AccountScenario;
  /** Demo override for the hero broadcast. */
  streamMode: Exclude<StreamStatus, 'upcoming'>;
  regionBlocked: boolean;
  platform: Platform;
  tvPreview: boolean;
  tz: string;
  spoilerFree: boolean;
  overlayDefault: OverlayLevel;
  audioDefault: AudioTrack;
  ccDefault: boolean;
  notifyLiveStart: boolean;
  notifyFollowed: boolean;
  followed: Record<string, { notify: boolean }>;
  reminders: string[];
  devices: Device[];
  /** Day id → seconds watched. */
  progress: Record<string, number>;
  plan: 'monthly' | 'annual' | null;
  revealed: string[];
}

const INITIAL: AppState = {
  scenario: 'guest',
  streamMode: 'delayed',
  regionBlocked: false,
  platform: 'web',
  tvPreview: false,
  tz: browserTz(),
  spoilerFree: false,
  overlayDefault: 'basic',
  audioDefault: 'en',
  ccDefault: false,
  notifyLiveStart: true,
  notifyFollowed: true,
  followed: { p04: { notify: true } },
  reminders: [],
  devices: [
    { id: 'd1', name: 'Chrome on macOS', kind: 'web', lastActive: 'Active now', current: true },
    { id: 'd2', name: 'iPhone 15', kind: 'mobile', lastActive: '2 hours ago', streaming: true },
    { id: 'd3', name: 'Living Room Apple TV', kind: 'tv', lastActive: 'Yesterday', streaming: true },
    { id: 'd4', name: 'Pixel 8', kind: 'mobile', lastActive: '3 days ago' },
  ],
  progress: { 'lv-main-day3': 0.62 * 660 * 60, 'lv-mm-finaltable': 0.31 * 480 * 60, 'lv-main-day2': 0.88 * 660 * 60 },
  plan: null,
  revealed: [],
};

/** Max simultaneous streams per account (assumed policy for the demo). */
export const MAX_STREAMS = 2;

export type Gate = 'ok' | 'login' | 'plans' | 'link' | 'restricted' | 'devices';
/** What happens when a viewer presses play (soft paywall). */
export const gateFor = (s: AccountScenario): Gate =>
  ({ guest: 'login', noSub: 'plans', active: 'ok', unlinked: 'link', restricted: 'restricted', deviceLimit: 'devices' })[s] as Gate;

interface Api {
  state: AppState;
  set: (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
  toast: (text: string) => void;
  toasts: Toast[];
  login: LoginRequest | null;
  requireLogin: (req: LoginRequest) => void;
  closeLogin: () => void;
  signedIn: boolean;
  isRevealed: (key: string) => boolean;
  reveal: (key: string) => void;
}

const Ctx = createContext<Api | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [login, setLogin] = useState<LoginRequest | null>(null);
  const id = useRef(0);

  const set = useCallback<Api['set']>((patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);
  const toast = useCallback((text: string) => {
    const n = ++id.current;
    setToasts((t) => [...t, { id: n, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n)), 2800);
  }, []);

  // Turning spoiler-free back on hides anything revealed earlier.
  useEffect(() => {
    if (state.spoilerFree) setState((s) => (s.revealed.length ? { ...s, revealed: [] } : s));
  }, [state.spoilerFree]);

  const api = useMemo<Api>(
    () => ({
      state,
      set,
      toast,
      toasts,
      login,
      requireLogin: setLogin,
      closeLogin: () => setLogin(null),
      signedIn: state.scenario !== 'guest',
      isRevealed: (key) => !state.spoilerFree || state.revealed.includes(key),
      reveal: (key) => set((s) => ({ revealed: [...s.revealed, key] })),
    }),
    [state, set, toast, toasts, login],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AppProvider missing');
  return ctx;
}

/** Re-render every `ms` (for countdowns and live clocks). */
export function useTick(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
