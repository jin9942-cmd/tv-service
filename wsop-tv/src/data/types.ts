// Domain types. Every relation uses IDs, never display names.
import type { AccessLevel } from '../config/entitlements';

export type ID = string;

export interface Season {
  id: ID;
  year: number;
  name: string;
  isCurrent: boolean;
}

/** live = in progress today, upcoming = scheduled, ended = finished (replay available or not). */
export type EventStatus = 'live' | 'upcoming' | 'ended';

export interface LeaderboardEntry {
  playerId: ID;
  chips: number;
}

export interface FinalResult {
  playerId: ID;
  place: number;
  prize: number;
}

export interface TournamentEvent {
  id: ID;
  seasonId: ID;
  number: number;
  name: string;
  shortName: string;
  buyIn: number;
  status: EventStatus;
  /** e.g. "Day 5", "Final Table" */
  dayLabel: string;
  /** ISO start time of the (current or scheduled) broadcast day */
  startAt: string;
  endAt?: string;
  venue: string;
  entries?: number;
  prizePool?: number;
  playersLeft?: number;
  level?: string;
  blinds?: string;
  description: string;
  broadcastIds: ID[];
  /** Broadcast opened when entering the event without choosing a table */
  defaultBroadcastId?: ID;
  leaderboard?: LeaderboardEntry[];
  results?: FinalResult[];
  /** Upcoming events: false means no broadcast is planned for that day. */
  hasBroadcast: boolean;
}

/**
 * live        – simulated live stream (sample video loops)
 * late-start  – scheduled, but the stream start has been pushed back
 *               (not to be confused with the broadcast delay below)
 * interrupted – stream temporarily stopped
 * ended       – today's stream finished
 * scheduled   – upcoming, not started
 * replay      – on-demand video of a past session
 */
export type BroadcastStatus = 'live' | 'late-start' | 'interrupted' | 'ended' | 'scheduled' | 'replay';

export interface Seat {
  playerId: ID;
  seat: number;
  chips: number;
}

export interface Broadcast {
  id: ID;
  eventId: ID;
  title: string;
  table: string;
  kind: 'main' | 'additional';
  status: BroadcastStatus;
  access: AccessLevel;
  sourceId: ID;
  startAt: string;
  /**
   * Poker streams air on a delay so hole cards can be shown without helping players at the table.
   * Everything shown with the stream (chip counts, hands, replays) is synced to stream time = now − delay.
   */
  delayMinutes?: number;
  statusNote?: string;
  seats: Seat[];
  handIds: ID[];
}

export interface Player {
  id: ID;
  name: string;
  nickname?: string;
  country: string;
  countryCode: string;
  hometown: string;
  bio: string;
  color: string;
  bracelets: number;
  careerEarnings: number;
  finalTables: number;
  cashes: number;
}

export interface HandStreet {
  street: 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown';
  board?: string;
  text: string;
}

export interface HandRecord {
  id: ID;
  eventId: ID;
  broadcastId: ID;
  handNumber: number;
  title: string;
  summary: string;
  description: string;
  playerIds: ID[];
  winnerId: ID;
  pot: number;
  level: string;
  /** When the hand was played on the tournament floor (live events). It airs delayMinutes later. */
  playedAt?: string;
  streets: HandStreet[];
  /** A hand may have no replay clip yet. */
  clip?: {
    sourceId: ID;
    startSec: number;
    durationSec: number;
    access: AccessLevel;
  };
}

export interface ArchiveVideo {
  id: ID;
  seasonId: ID;
  eventId: ID;
  broadcastId: ID;
  title: string;
  kind: 'Final Table' | 'Day' | 'Highlights';
  durationLabel: string;
  access: AccessLevel;
}

export interface VideoSource {
  id: ID;
  label: string;
  /** What the footage actually shows (it is never WSOP footage). */
  footage: string;
  url: string;
  type: string;
  credit: string;
  sourcePage: string;
  durationLabel: string;
  /** Locally stored stills used as thumbnails/posters. */
  frames: { sec: number; src: string }[];
}
