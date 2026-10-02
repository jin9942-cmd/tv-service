// Personal activity: saved hands, followed players, watch time and earned badges.
// Kept separate from authentication (GGPass, demo) and subscription (WSOP+, demo).
// DEMO: stored in localStorage. In production the server must own this record (anti-tamper, cross-device).
import { useSyncExternalStore } from 'react';
import { createStore } from '../lib/storage';
import { track } from '../lib/analytics';
import { BADGES, MAX_SECONDS_PER_TICK, type BadgeDef } from '../config/badges';
import { authStore } from './stores';

export interface ActivityState {
  savedHands: Record<string, number>; // handId → savedAt
  followedPlayers: Record<string, number>; // playerId → followedAt
  watch: {
    totalSeconds: number;
    /** Seconds per final-table broadcast. */
    finals: Record<string, number>;
  };
  earned: Record<string, { earnedAt: number; notified: boolean }>;
  /** Every distinct hand / player ever saved or followed — badges keep counting these after an undo. */
  everSavedHands: Record<string, true>;
  everFollowedPlayers: Record<string, true>;
}

const EMPTY: ActivityState = {
  savedHands: {},
  followedPlayers: {},
  watch: { totalSeconds: 0, finals: {} },
  earned: {},
  everSavedHands: {},
  everFollowedPlayers: {},
};

export const activityStore = createStore<ActivityState>('activity', EMPTY);

export function useActivity(): ActivityState {
  return useSyncExternalStore(activityStore.subscribe, activityStore.get, activityStore.get);
}

export const isSignedIn = () => authStore.get().tier !== 'guest';

// ---------- badge progress -------------------------------------------------

export interface BadgeProgress {
  badge: BadgeDef;
  current: number;
  target: number;
  unit: string;
  earnedAt?: number;
}

export function badgeProgress(state: ActivityState): BadgeProgress[] {
  return BADGES.map((badge) => {
    const r = badge.rule;
    const earnedAt = state.earned[badge.id]?.earnedAt;
    switch (r.kind) {
      case 'watch-total':
        return { badge, current: Math.min(r.seconds, Math.floor(state.watch.totalSeconds)), target: r.seconds, unit: 'sec', earnedAt };
      case 'saved-hands':
        return { badge, current: Math.min(r.count, Object.keys(state.everSavedHands).length), target: r.count, unit: 'hands', earnedAt };
      case 'final-videos': {
        const done = Object.values(state.watch.finals).filter((s) => s >= r.secondsEach).length;
        return { badge, current: Math.min(r.count, done), target: r.count, unit: 'finals', earnedAt };
      }
      case 'followed-players':
        return { badge, current: Math.min(r.count, Object.keys(state.everFollowedPlayers).length), target: r.count, unit: 'players', earnedAt };
    }
  });
}

/** Adds newly met badges. Earned badges are never removed. */
function withBadges(state: ActivityState): ActivityState {
  let earned = state.earned;
  for (const p of badgeProgress(state)) {
    if (!earned[p.badge.id] && p.current >= p.target) {
      earned = { ...earned, [p.badge.id]: { earnedAt: Date.now(), notified: false } };
      track('badge_earned', { badge: p.badge.id });
    }
  }
  return earned === state.earned ? state : { ...state, earned };
}

function update(fn: (s: ActivityState) => ActivityState) {
  activityStore.set((prev) => withBadges(fn({ ...EMPTY, ...prev })));
}

// ---------- saves & follows ------------------------------------------------
// Keyed maps make repeated saves/follows idempotent: no duplicate records.

export function setHandSaved(handId: string, saved: boolean) {
  if (!isSignedIn()) return;
  const was = !!activityStore.get().savedHands[handId];
  if (was === saved) return;
  update((s) => {
    const savedHands = { ...s.savedHands };
    if (saved) savedHands[handId] = Date.now();
    else delete savedHands[handId];
    return { ...s, savedHands, everSavedHands: saved ? { ...s.everSavedHands, [handId]: true } : s.everSavedHands };
  });
  if (saved) track('hand_saved', { hand: handId });
}

export function setPlayerFollowed(playerId: string, followed: boolean) {
  if (!isSignedIn()) return;
  const was = !!activityStore.get().followedPlayers[playerId];
  if (was === followed) return;
  update((s) => {
    const followedPlayers = { ...s.followedPlayers };
    if (followed) followedPlayers[playerId] = Date.now();
    else delete followedPlayers[playerId];
    return {
      ...s,
      followedPlayers,
      everFollowedPlayers: followed ? { ...s.everFollowedPlayers, [playerId]: true } : s.everFollowedPlayers,
    };
  });
  if (followed) track('player_followed', { player: playerId });
}

export function markBadgeNotified(badgeId: string) {
  activityStore.set((s) =>
    s.earned[badgeId] ? { ...s, earned: { ...s.earned, [badgeId]: { ...s.earned[badgeId], notified: true } } } : s,
  );
}

export function resetActivity() {
  activityStore.reset();
}

// ---------- watch time -----------------------------------------------------

const TAB_ID = Math.random().toString(36).slice(2);
const LEASE_KEY = 'wsoptv.demo.watchLease';
const LEASE_MS = 3000;

/**
 * Only one tab may count watch time at a time. A tab takes the lease when it is free/expired
 * and renews it every tick; other tabs playing at the same moment don't count.
 */
function holdWatchLease(): boolean {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(LEASE_KEY);
    const lease = raw ? (JSON.parse(raw) as { tab: string; until: number }) : null;
    if (lease && lease.tab !== TAB_ID && lease.until > now) return false;
    localStorage.setItem(LEASE_KEY, JSON.stringify({ tab: TAB_ID, until: now + LEASE_MS }));
    return true;
  } catch {
    return true; // storage blocked → single-tab demo
  }
}

export function releaseWatchLease() {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    if (raw && (JSON.parse(raw) as { tab: string }).tab === TAB_ID) localStorage.removeItem(LEASE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Called by the player once per tick with the wall-clock and media-time deltas since the last tick.
 * Counted time = min(wall, media), so pauses (media 0), buffering (media 0) and seeks
 * (media jump, rejected) add nothing. Only visible pages, signed-in users and one tab count.
 */
export function recordWatchTick(opts: { broadcastId: string; isFinal: boolean; wallSec: number; mediaSec: number }) {
  if (!isSignedIn()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  const { wallSec, mediaSec } = opts;
  if (mediaSec <= 0 || wallSec <= 0) return;
  if (mediaSec > wallSec * 2 + 0.5) return; // a seek forward, not playback
  const add = Math.min(wallSec, mediaSec, MAX_SECONDS_PER_TICK);
  if (!holdWatchLease()) return;
  update((s) => ({
    ...s,
    watch: {
      totalSeconds: s.watch.totalSeconds + add,
      finals: opts.isFinal ? { ...s.watch.finals, [opts.broadcastId]: (s.watch.finals[opts.broadcastId] ?? 0) + add } : s.watch.finals,
    },
  }));
}
