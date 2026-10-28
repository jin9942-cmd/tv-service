// Global demo state. React state only — nothing is written to localStorage / sessionStorage / IndexedDB.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Access, AccountScenario, AudioTrack, OverlayLevel, Platform, StreamStatus } from '../data/types';
import { browserTz } from '../lib/time';
import { PRESENTATION, atLeast, requiredTier, type IncludedFrom, type PaidTier, type Tier } from '../data/policy';

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
  /** Optional inline action (e.g. Undo). */
  action?: { label: string; onClick: () => void };
}

/** Something saved to My List. */
export type ListKind = 'event' | 'day' | 'archive' | 'hand';
export interface ListItem {
  kind: ListKind;
  id: string;
  addedAt: number;
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
  /** WSOP+ paid tier held (or last held, for "ended") — used by the paid scenarios. */
  paidTier: PaidTier;
  /** Which WSOP+ tier includes WSOP TV's paid content (decision pending). */
  includedFrom: IncludedFrom;
  /** Mock of WSOP+'s own record: set when the WSOP+ page completes; WSOP TV re-reads it on return. */
  wsopPlusRecord: PaidTier | null;
  revealed: string[];
  // ---- added: search, My List, billing, subscription lifecycle, travel ----
  recentSearches: string[];
  myList: ListItem[];
  /** A My List save started by a guest; finished once they come back signed in. */
  pendingListAdd: Omit<ListItem, 'addedAt'> | null;
  /** Outcome of the WSOP+ mock page (demo). */
  paymentResult: 'success' | 'fail' | 'cancel';
  vpnDetected: boolean;
  abroad: boolean;
  abroadDismissed: boolean;
}

const INITIAL: AppState = {
  // Report build (v3): opens as a WSOP+ Premium member so the channels play straight away (Shift+D to change).
  scenario: PRESENTATION ? 'premium' : 'guest',
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
  progress: { 'lv-main-day3': 0.62 * 660 * 60, 'lv-mm-finaltable': 0.31 * 480 * 60, 'lv-main-day2': 0.88 * 660 * 60, 'classic-a1-finaltable': 0.45 * (9 * 3600 + 1200) },
  paidTier: PRESENTATION ? 'premium' : 'basic',
  includedFrom: 'basic',
  wsopPlusRecord: null,
  revealed: [],
  recentSearches: ['Han', 'final table', 'bluff'],
  myList: [
    { kind: 'day', id: 'lv-hr-day2', addedAt: 3 },
    { kind: 'hand', id: 'h05', addedAt: 2 },
    { kind: 'day', id: 'classic-a3-finaltable', addedAt: 1 },
    { kind: 'day', id: 'lv-ladies-finaltable', addedAt: 0 },
  ],
  pendingListAdd: null,
  paymentResult: 'success',
  vpnDetected: false,
  abroad: false,
  abroadDismissed: false,
};

/** Max simultaneous streams per account (assumed policy for the demo). */
export const MAX_STREAMS = 2;

export type Gate = 'ok' | 'login' | 'plans' | 'link' | 'restricted' | 'devices' | 'expired';

/** The viewer's WSOP+ level as WSOP TV reads it. A payment issue keeps the tier; an ended membership falls back to Free. */
export function memberTier(s: Pick<AppState, 'scenario' | 'paidTier'>): Tier {
  switch (s.scenario) {
    case 'guest':
    case 'restricted':
      return 'free';
    case 'free':
    case 'expired':
      return 'wsopFree';
    case 'basic':
    case 'premium':
      return s.scenario;
    default:
      return s.paidTier;
  }
}

/**
 * The one access check used by web, mobile and TV: play when the member's tier ≥ the content's required tier
 * (free < WSOP+ Free < Basic < Premium). `live` matters for the Split setting (live/delayed need Premium).
 */
export function gateForAccess(access: Access, s: Pick<AppState, 'scenario' | 'paidTier' | 'includedFrom'>, live = false): Gate {
  const need = requiredTier(access, s.includedFrom, live);
  if (need === 'free') return 'ok';
  if (s.scenario === 'guest') return 'login';
  if (s.scenario === 'restricted') return 'restricted';
  if (need === 'wsopFree') return 'ok';
  // Paid content
  if (s.scenario === 'unlinked') return 'link';
  if (s.scenario === 'deviceLimit') return 'devices';
  if (s.scenario === 'expired') return 'expired';
  return atLeast(memberTier(s), need) ? 'ok' : 'plans';
}

export const canWatch = (access: Access, s: Pick<AppState, 'scenario' | 'paidTier' | 'includedFrom'>, live = false) => gateForAccess(access, s, live) === 'ok';

/** Scenario for holding a WSOP+ tier (after joining / upgrading). */
export const scenarioFor = (t: PaidTier): AccountScenario => t;

interface Api {
  state: AppState;
  set: (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
  toast: (text: string, action?: Toast['action']) => void;
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
  const toast = useCallback((text: string, action?: Toast['action']) => {
    const n = ++id.current;
    setToasts((t) => [...t, { id: n, text, action }]);
    // Toasts with an action (Undo) stay a little longer.
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n)), action ? 6000 : 2800);
  }, []);

  // Finish a My List save that a guest started, once they're back signed in.
  useEffect(() => {
    if (state.scenario === 'guest' || !state.pendingListAdd) return;
    const p = state.pendingListAdd;
    setState((s) => ({ ...s, pendingListAdd: null, myList: s.myList.some((x) => x.kind === p.kind && x.id === p.id) ? s.myList : [{ ...p, addedAt: Date.now() }, ...s.myList] }));
    toast('Added to My List');
  }, [state.scenario, state.pendingListAdd, toast]);

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
