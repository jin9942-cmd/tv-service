// Linear channels — 24/7 programmed channels next to the event-based Live screen.
// Each channel runs a schedule (EPG). Live tournament coverage is slotted in while it's on air; the rest of the day is
// filled with replays, a studio show, highlight shows and classics, so a channel never goes dark.
// Access is decided per programme: studio, highlight and classic programmes are free; live and replay programmes keep
// the access of the broadcast they carry (same rules as the Tournaments view).
import type { Access, StreamStatus } from './types';
import { HERO_DAY_ID, T0, archive, dayById } from './mock';

export type ProgramKind = 'live' | 'replay' | 'studio' | 'highlights' | 'classic';

export interface LinearChannel {
  id: string;
  number: number;
  name: string;
  /** Short name for chips and the on-screen channel bug. */
  short: string;
  tagline: string;
  /** Commentary language of the channel's own programming. */
  lang: 'EN' | 'ES';
  hue: number;
  /** Free, ad-supported 24/7 channel (FAST). */
  free?: boolean;
}

export interface Program {
  id: string;
  channelId: string;
  kind: ProgramKind;
  title: string;
  subtitle: string;
  /** ms epoch */
  start: number;
  end: number;
  access: Access;
  /** Live and replay programmes carry a broadcast day (its main feed). */
  dayId?: string;
  /** Classics carry an archive item (edited for TV). */
  archiveId?: string;
  /** Live coverage that was already running when the slot began. */
  joined?: boolean;
  /** Picks stills / footage for the programme. */
  seed: number;
}

/** Four topic channels: one subject each, around the clock. */
export const channels: LinearChannel[] = [
  { id: 'wsop1', number: 1, name: 'Main Event', short: 'Main Event', tagline: 'The Main Event, live and on replay', lang: 'EN', hue: 40 },
  { id: 'wsop2', number: 2, name: 'Final Tables', short: 'Final Tables', tagline: 'Every final table of the series', lang: 'EN', hue: 210 },
  { id: 'hands', number: 3, name: 'Best Hands', short: 'Best Hands', tagline: 'Big pots, bluffs and bad beats, nonstop · free', lang: 'EN', hue: 0, free: true },
  { id: 'classics', number: 4, name: '2025 WSOP Main Event', short: '2025 Main Event', tagline: 'Legendary final tables from past series · free', lang: 'EN', hue: 150, free: true },
];

export const channelById = (id: string) => channels.find((c) => c.id === id);

export const KIND_LABEL: Record<ProgramKind, string> = { live: 'Live', replay: 'Replay', studio: 'Studio', highlights: 'Highlights', classic: 'Classic' };

// ---- schedule ------------------------------------------------------------------------------------

const M = 60_000;
const H = 60 * M;
const SLOT = 30 * M;
/** The guide covers 12 hours back and a week ahead of page load (the Schedule shows it by date). */
export const GUIDE_START = Math.floor((T0 - 12 * H) / SLOT) * SLOT;
export const GUIDE_END = GUIDE_START + (12 + 7 * 24) * H;

/** Live coverage each channel carries (broadcast day ids, in order): Main Event days on Main Event, final tables on Final Tables. */
const CARRIAGE: Record<string, string[]> = {
  wsop1: [HERO_DAY_ID],
  wsop2: ['lv-hr-finaltable'],
  hands: [],
  classics: [],
};

type Filler = Omit<Program, 'id' | 'channelId' | 'start' | 'end'> & { min: number };

const shortName = (name: string) => name.replace(' World Championship', '');

const replay = (dayId: string, min: number, title?: string, subtitle = 'Replay · edited for TV'): Filler => {
  const ref = dayById(dayId)!;
  return { kind: 'replay', title: title ?? `${shortName(ref.event.name)} · ${ref.day.label}`, subtitle, access: ref.day.access ?? 'subscriber', dayId, min, seed: ref.event.number };
};
const studio = (title: string, subtitle: string, min: number, seed: number): Filler => ({ kind: 'studio', title, subtitle, access: 'free', min, seed });
const highlights = (title: string, subtitle: string, min: number, seed: number): Filler => ({ kind: 'highlights', title, subtitle, access: 'free', min, seed });

const FILLERS: Record<string, Filler[]> = {
  wsop1: [
    studio('The Rail · Final Table Preview', 'Studio show · stacks, storylines and picks', 60, 1),
    replay('lv-main-day3', 120, 'Main Event · Day 3 Encore'),
    replay('lv-main-day2', 120),
    replay('lv-main-day1a', 120),
  ],
  wsop2: [
    replay('lv-mm-finaltable', 120),
    highlights('Bracelet Moments', 'Every winning hand of the week', 30, 3),
    replay('lv-plo-finaltable', 120),
    replay('lv-tc-finaltable', 120),
    studio('The Rail · Final Table Recap', 'Studio show · how every final table was won', 60, 5),
    replay('lv-ladies-finaltable', 120),
  ],
  hands: [
    highlights('Hand of the Day', 'The biggest pots of the last 24 hours', 30, 2),
    highlights('Greatest Bluffs', 'Ten of the boldest bluffs ever filmed', 30, 8),
    highlights('High Roller Hands', 'Six-figure pots, cut down to the action', 30, 4),
    highlights('All-in Showdowns', 'Everything in the middle, cards on their backs', 30, 6),
    highlights('Bad Beat Hall of Fame', 'One-outers, runner-runners and the stories behind them', 30, 9),
    highlights('Hero Calls', 'The calls that took nerve, and were right', 30, 7),
  ],
  classics: archive.map<Filler>((a) => ({ kind: 'classic', title: `${a.year} ${a.title}`, subtitle: `${a.subtitle} · edited for TV`, access: 'free', archiveId: a.id, min: 120, seed: a.year })),
};

function build(ch: LinearChannel): Program[] {
  const pool = FILLERS[ch.id];
  const out: Program[] = [];
  let cursor = GUIDE_START;
  let fi = ch.number * 2;
  let n = 0;
  const push = (p: Omit<Program, 'id' | 'channelId'>) => out.push({ ...p, id: `${ch.id}-${n++}`, channelId: ch.id });
  // Fill a gap with the channel's rotation; a leftover under 15 minutes is absorbed by the last programme.
  const fill = (to: number) => {
    // Live coverage rarely ends on the half hour: a short "Coming up" break puts the channel back on the :00/:30 grid
    // (under 10 minutes, the coverage simply runs over).
    const aligned = Math.ceil(cursor / SLOT) * SLOT;
    if (aligned > cursor && aligned <= to) {
      if (aligned - cursor >= 10 * M || !out.length) push({ kind: 'highlights', title: ch.lang === 'ES' ? 'A continuación' : 'Coming Up', subtitle: ch.lang === 'ES' ? 'Pausa corta · lo que viene en el canal' : "Short break · what's next on the channel", access: 'free', seed: ch.number, start: cursor, end: aligned });
      else out[out.length - 1].end = aligned;
      cursor = aligned;
    }
    while (cursor < to) {
      const { min, ...f } = pool[fi++ % pool.length];
      let end = Math.min(to, cursor + min * M);
      if (to - end < 15 * M) end = to;
      push({ ...f, start: cursor, end });
      cursor = end;
    }
  };
  const lives = CARRIAGE[ch.id].map((id) => dayById(id)).filter((x) => !!x);
  for (const { event, day } of lives) {
    const s = Date.parse(day.start);
    const e = s + day.durationMin * M;
    if (e <= cursor || s >= GUIDE_END) continue;
    if (s > cursor) fill(s);
    const start = Math.max(cursor, s);
    const joined = start > s;
    push({
      kind: 'live',
      title: `${shortName(event.name)} · ${day.label}`,
      subtitle: ch.lang === 'ES' ? 'En directo · comentarios en español' : joined ? 'Live coverage · joined in progress' : 'Live coverage from the feature table',
      access: day.access ?? 'subscriber',
      dayId: day.id,
      joined,
      start,
      end: e,
      seed: event.number,
    });
    cursor = e;
  }
  fill(GUIDE_END);
  return out;
}

export const programs: Program[] = channels.flatMap(build);

export const programsFor = (channelId: string) => programs.filter((p) => p.channelId === channelId);
export const programAt = (channelId: string, at: number) => programsFor(channelId).find((p) => p.start <= at && at < p.end);
export const upNext = (channelId: string, at: number, n = 5) => programsFor(channelId).filter((p) => p.start > at).slice(0, n);
export const programById = (id: string) => programs.find((p) => p.id === id);

/** Reminder key for a channel programme (kept with day reminders in AppState.reminders). */
export const reminderKey = (p: Program) => `ch:${p.id}`;

/**
 * How a programme plays right now. Live programmes follow their broadcast day (and the demo's hero override):
 * on air → live/delayed · late start / interrupted / not started yet → the channel holds with highlights (standby) ·
 * already ended → the slot runs as an encore (replay).
 */
export type Airing = { mode: 'onair'; status: StreamStatus; delayMin: number } | { mode: 'standby'; reason: 'late' | 'interrupted' | 'upcoming' } | { mode: 'program' };

export function airing(p: Program, streamMode: Exclude<StreamStatus, 'upcoming'>): Airing {
  if (p.kind !== 'live' || !p.dayId) return { mode: 'program' };
  const ref = dayById(p.dayId)!;
  const st: StreamStatus = p.dayId === HERO_DAY_ID ? streamMode : ref.day.status;
  if (st === 'live' || st === 'delayed') {
    const main = ref.day.tables[0];
    const delayMin = st === 'delayed' ? (main.delayMin ?? 30) : 0;
    return { mode: 'onair', status: st, delayMin };
  }
  if (st === 'late' || st === 'interrupted' || st === 'upcoming') return { mode: 'standby', reason: st };
  return { mode: 'program' };
}

/** A live slot whose broadcast has already ended plays as an encore. */
export const effectiveKind = (p: Program, a: Airing): ProgramKind => (p.kind === 'live' && a.mode === 'program' ? 'replay' : p.kind);
