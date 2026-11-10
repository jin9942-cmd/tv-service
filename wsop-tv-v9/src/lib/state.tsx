import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { clipFor, TODAY, type Broadcast, type PlayerId, type Tier } from '../data/demo';

/* ───────────── Demo session: GGPass tier, on air / off air, reminders, resume points ───────────── */

type Session = {
  tier: Tier;
  onAir: boolean;
  reminders: string[];
  progress: Record<string, number>;
};

const KEY = 'wsop-tv-v9';
const initial: Session = { tier: 'free', onAir: true, reminders: [], progress: { 'me-d6': 2340 } };

function load(): Session {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

type SessionCtx = Session & {
  set: (patch: Partial<Session>) => void;
  toggleReminder: (id: string) => void;
  saveProgress: (id: string, t: number) => void;
  /** Today's ticker, as the on-air switch has it. */
  ticker: Broadcast[];
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Session>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* private mode: the demo still works for this visit */
    }
  }, [s]);

  const ticker = useMemo(
    () =>
      s.onAir
        ? TODAY
        : // Off air (the morning before): nothing live yet, the live broadcasts become today's upcoming cards.
          TODAY.map((b) => (b.status === 'live' ? { ...b, status: 'upcoming' as const, startsAt: b.started, sub: b.sub } : b)),
    [s.onAir],
  );

  const value: SessionCtx = {
    ...s,
    ticker,
    set: (patch) => setS((x) => ({ ...x, ...patch })),
    toggleReminder: (id) => setS((x) => ({ ...x, reminders: x.reminders.includes(id) ? x.reminders.filter((r) => r !== id) : [...x.reminders, id] })),
    saveProgress: (id, t) => setS((x) => (Math.abs((x.progress[id] ?? 0) - t) < 5 ? x : { ...x, progress: { ...x.progress, [id]: t } })),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error('SessionProvider missing');
  return c;
}

/* ───────────── Live table simulation (stands in for the EBS feed: chip counts + hand history) ───────────── */

export type Action = { pid: PlayerId; text: string };
export type Hand = {
  no: number;
  time: string;
  street: { name: string; board?: string; actions: Action[] }[];
  winner: PlayerId;
  pot: number;
  eliminated?: PlayerId;
};
export type Table = {
  hand: number;
  chips: Partial<Record<PlayerId, number>>;
  out: { pid: PlayerId; place: number }[];
  history: { hand: number; chips: Partial<Record<PlayerId, number>> }[];
  log: Hand[];
  updatedAt: number;
  level: number;
};

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function cards(r: () => number, n: number, used: Set<string>) {
  const out: string[] = [];
  while (out.length < n) {
    const c = RANKS[Math.floor(r() * 13)] + SUITS[Math.floor(r() * 4)];
    if (!used.has(c)) {
      used.add(c);
      out.push(c);
    }
  }
  return out;
}

const round = (n: number) => Math.max(25_000, Math.round(n / 25_000) * 25_000);
const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, '')}M` : `${Math.round(n / 1000)}K`);

/** One simulated hand. Total chips never change; a short stack can bust (not below 3 players). */
function playHand(t: Table, b: Broadcast, r: () => number, clock: number, noBust = false): Table {
  const alive = b.seats.map((s) => s.pid).filter((p) => (t.chips[p] ?? 0) > 0);
  const bb = b.blinds[1] * (1 + t.level * 0.25);
  const i = Math.floor(r() * alive.length);
  let j = Math.floor(r() * (alive.length - 1));
  if (j >= i) j++;
  // A hand that has an edited clip is played by the players in that clip, and the clip's first player wins it.
  const clip = clipFor(b.id, t.hand + 1);
  const forced = clip && clip.players.length > 1 && clip.players.every((p) => alive.includes(p)) ? clip.players : undefined;
  const a = forced ? forced[0] : alive[i];
  const c = forced ? forced[1] : alive[j];
  const ca = t.chips[a]!;
  const cc = t.chips[c]!;
  const used = new Set<string>();
  const no = t.hand + 1;
  const time = new Date(clock).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
  const open = round(bb * 2.25);
  const allIn = !forced && !noBust && r() < 0.06;
  const street: Hand['street'] = [];
  let pot = open * 2 + bb / 2;
  let winner: PlayerId;
  let eliminated: PlayerId | undefined;

  if (allIn) {
    const shorter = ca < cc ? a : c;
    const amt = Math.min(ca, cc);
    street.push({ name: 'Pre-flop', actions: [
      { pid: a, text: `raises to ${fmt(open)}` },
      { pid: c, text: `re-raises all in for ${fmt(cc)}` },
      { pid: a, text: ca <= cc ? `calls all in for ${fmt(ca)}` : 'calls' },
    ] });
    street.push({ name: 'Board', board: cards(r, 5, used).join(' '), actions: [] });
    // The short stack doubles up most of the time; busts stay rare so the table lasts the demo.
    winner = noBust || r() < 0.75 ? shorter : shorter === a ? c : a;
    pot = amt * 2;
    const loser = winner === a ? c : a;
    t.chips[winner]! += amt;
    t.chips[loser]! -= amt;
    if (t.chips[loser]! <= 0 && alive.length > 3) {
      eliminated = loser;
      t.out = [...t.out, { pid: loser, place: alive.length }];
    } else if (t.chips[loser]! <= 0) {
      // keep at least three players on the demo table
      t.chips[loser] = round(bb * 8);
      t.chips[winner]! -= t.chips[loser]!;
    }
  } else {
    const flop = cards(r, 3, used);
    const bet = round(Math.min(ca, cc) * (0.03 + r() * 0.06));
    street.push({ name: 'Pre-flop', actions: [{ pid: a, text: `raises to ${fmt(open)}` }, { pid: c, text: 'calls' }] });
    const showdown = !!forced || r() < 0.45;
    street.push({ name: 'Flop', board: flop.join(' '), actions: [{ pid: c, text: 'checks' }, { pid: a, text: `bets ${fmt(bet)}` }, { pid: c, text: showdown ? 'calls' : 'folds' }] });
    if (showdown) {
      const turn = cards(r, 1, used)[0];
      const river = cards(r, 1, used)[0];
      const big = round(bet * (1.5 + r() * 1.5));
      street.push({ name: 'Turn', board: turn, actions: [{ pid: c, text: 'checks' }, { pid: a, text: 'checks' }] });
      street.push({ name: 'River', board: river, actions: [{ pid: c, text: `bets ${fmt(big)}` }, { pid: a, text: 'calls' }] });
      pot += bet * 2 + big * 2;
      winner = forced ? a : r() < 0.5 ? a : c;
    } else {
      pot += bet;
      winner = a;
    }
    const loser = winner === a ? c : a;
    const swing = Math.min(Math.round((pot / 2) / 25_000) * 25_000, t.chips[loser]! - round(bb * 4));
    if (swing > 0) {
      t.chips[winner]! += swing;
      t.chips[loser]! -= swing;
    }
  }

  const log: Hand = { no, time, street, winner, pot, eliminated };
  return {
    ...t,
    hand: no,
    chips: { ...t.chips },
    level: Math.max(0, Math.floor((no - (b.id === 'me-ft' ? 164 : 56)) / 25)),
    history: [...t.history, { hand: no, chips: { ...t.chips } }].slice(-60),
    log: [log, ...t.log].slice(0, 80),
    updatedAt: clock,
  };
}

function seedTable(b: Broadcast): Table {
  const chips = Object.fromEntries(b.seats.map((s) => [s.pid, s.chips])) as Partial<Record<PlayerId, number>>;
  let t: Table = { hand: b.id === 'me-ft' ? 164 : 56, chips, out: [], history: [{ hand: b.id === 'me-ft' ? 164 : 56, chips: { ...chips } }], log: [], updatedAt: Date.now(), level: 0 };
  const r = rng(b.id.length * 7919 + 17);
  const start = Date.now() - 16 * 90_000;
  // A session's worth of hands is already on the table when the viewer arrives.
  for (let k = 0; k < 16; k++) t = playHand({ ...t, chips: { ...t.chips } }, b, r, start + k * 90_000, true);
  return { ...t, updatedAt: Date.now() - 120_000 };
}

type LiveState = Record<string, Table>;
const LiveCtx = createContext<LiveState>({});

export function LiveProvider({ children }: { children: ReactNode }) {
  const live = useMemo(() => TODAY.filter((b) => b.status === 'live'), []);
  const rands = useMemo(() => Object.fromEntries(live.map((b) => [b.id, rng(b.id.length * 104729 + 3)])), [live]);
  const [state, dispatch] = useReducer(
    (s: LiveState, id: string) => {
      const b = live.find((x) => x.id === id)!;
      return { ...s, [id]: playHand({ ...s[id], chips: { ...s[id].chips } }, b, rands[id], Date.now()) };
    },
    undefined,
    () => Object.fromEntries(live.map((b) => [b.id, seedTable(b)])),
  );
  useEffect(() => {
    // A new hand every ~8 seconds per table, staggered so both tables don't move at once.
    const timers = live.map((b, i) => window.setInterval(() => dispatch(b.id), 8000 + i * 2700));
    return () => timers.forEach(clearInterval);
  }, [live]);
  return <LiveCtx.Provider value={state}>{children}</LiveCtx.Provider>;
}

export const useTable = (id?: string): Table | undefined => {
  const s = useContext(LiveCtx);
  return id ? s[id] : undefined;
};

/** "Updated: 12 sec ago", re-rendered every second. */
export function useAgo(at?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!at) return '';
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 60 ? `${s} sec ago` : `${Math.round(s / 60)} min ago`;
}
