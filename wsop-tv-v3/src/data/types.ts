// Data model: Series → Event (bracelet event) → Day (1A, 1B, 2, 3, Final Table) → Broadcast (stream).
// Players ↔ hands/events are many-to-many. All names and results are fictional.

// late = the broadcast hasn't started at its scheduled time · interrupted = temporarily off air (production side).
export type StreamStatus = 'live' | 'delayed' | 'vod' | 'upcoming' | 'late' | 'interrupted';
/** Who can play a piece of content: anyone, any signed-in GGPASS account, or subscribers only. */
export type Access = 'free' | 'signin' | 'subscriber';
export type DayLabel = 'Day 1A' | 'Day 1B' | 'Day 2' | 'Day 3' | 'Final Table';
export type HandType = 'allin' | 'bigpot' | 'bluff' | 'badbeat' | 'herofold';

export interface Player {
  id: string;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2, shown as a text code (no flag images). */
  cc: string;
  bracelets: number;
  earnings: number;
  poyPoints: number;
  /** Most recent finishes: event id + place. */
  recent: { eventId: string; place: number; prize: number }[];
  hue: number;
}

export interface Series {
  id: string;
  name: string;
  venue: string;
  city: string;
  /** Local time zone of the venue. */
  tz: string;
  start: string;
  end: string;
}

export interface Day {
  id: string;
  label: DayLabel;
  /** ISO UTC start. */
  start: string;
  durationMin: number;
  status: StreamStatus;
  /** Streams for this day (main feature table + outer tables). */
  tables: TableFeed[];
  /** Defaults to subscribers only. */
  access?: Access;
}

export interface TableFeed {
  id: string;
  name: string;
  /** Main stream carries commentary; outer tables are natural sound. */
  main?: boolean;
  /** Simulated feed failure for the error state demo. */
  failing?: boolean;
  /** Broadcast delay in minutes while the day is delayed (default 30). Each table can run its own delay. */
  delayMin?: number;
  /** Table-level broadcast state while the rest of the day is on air. */
  state?: 'late' | 'interrupted';
  /** Late start: expected start (ISO UTC). */
  expected?: string;
}

export interface TourEvent {
  id: string;
  seriesId: string;
  number: number;
  name: string;
  buyIn: number;
  entrants: number;
  prizePool: number;
  firstPrize: number;
  level: number;
  remaining: number;
  /** Game played (shown with the event). */
  game: 'No-Limit Hold’em' | 'Pot-Limit Omaha' | 'Mixed Games';
  /** Starting stack (chips) — total chips in play = entrants × starting stack. */
  startingStack: number;
  /** Current blinds while the event is running (big-blind ante format). */
  blinds?: { sb: number; bb: number; ante: number };
  /** Chip leader (spoiler). */
  leaderId?: string;
  /** Winner (spoiler) once the event has finished. */
  winnerId?: string;
  featured?: boolean;
  days: Day[];
}

export interface Hand {
  id: string;
  title: string;
  type: HandType;
  eventId: string;
  dayId: string;
  playerIds: string[];
  pot: number;
  /** Position on the day's timeline, seconds. */
  t: number;
  /** Result text — hidden in spoiler-free mode. */
  result: string;
  winnerId: string;
  views: number;
  durationSec: number;
  /** Replays: shown neutrally (no type, title or result) until watched. */
  masked?: boolean;
  access: Access;
}

export interface ArchiveItem {
  id: string;
  title: string;
  year: number;
  subtitle: string;
  durationSec: number;
  winnerId: string;
  hue: number;
  access: Access;
}

/**
 * Viewer account state. Members are GGPass accounts; paid access comes from the WSOP+ membership tier
 * (free = WSOP+ Free, automatic with every GGPass account). unlinked / deviceLimit / expired / grace keep
 * the paid tier in AppState.paidTier.
 */
export type AccountScenario = 'guest' | 'free' | 'basic' | 'premium' | 'unlinked' | 'restricted' | 'deviceLimit' | 'expired' | 'grace';
export type Platform = 'web' | 'ios' | 'android' | 'ipados' | 'androidtablet' | 'appletv' | 'androidtv' | 'roku' | 'samsung' | 'lg';
export type OverlayLevel = 'off' | 'basic' | 'pro';
export type AudioTrack = 'en' | 'natural' | 'es';
