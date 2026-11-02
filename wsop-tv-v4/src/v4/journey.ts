// v4 (from v5) — a player's run through the current series: which events they are still in, whether they are at the
// broadcast table right now, the next broadcast to catch, and their key hands so far.
import { events, playerById, seatsFor } from '../data/mock';
import type { Day, TourEvent } from '../data/types';
import { isBroadcasting, isOnAir } from '../lib/broadcast';
import type { StreamStatus } from '../data/types';
import { HERO_DAY_ID } from '../data/mock';
import { highlightClips, type Video } from './catalog';

export type JourneyStatus = 'onTable' | 'stillIn' | 'finished';

export interface JourneyStop {
  event: TourEvent;
  status: JourneyStatus;
  /** The broadcast day they are on now (onTable) or last played on camera. */
  day: Day;
  /** Next broadcast day of the event (stillIn / onTable), if any. */
  next?: Day;
  /** Chip stack at the broadcast table (last known). */
  stack: number;
}

const dayStatus = (d: Day, streamMode: StreamStatus) => (d.id === HERO_DAY_ID ? streamMode : d.status);

/** Every current-series event the player has been on a broadcast table in, live ones first. */
export function journeyOf(playerId: string, streamMode: StreamStatus): JourneyStop[] {
  const out: JourneyStop[] = [];
  for (const e of events) {
    const aired = e.days.filter((d) => d.status !== 'upcoming');
    const last = aired[aired.length - 1];
    if (!last) continue;
    const seat = seatsFor(last.id).find((s) => s.playerId === playerId);
    // Seen on camera earlier in the event but not at the latest table: out (or not followed by the cameras any more).
    const earlier = !seat && aired.some((d) => seatsFor(d.id).some((s) => s.playerId === playerId));
    if (!seat && !earlier) continue;
    const next = e.days.find((d) => d.status === 'upcoming');
    const st = dayStatus(last, streamMode);
    // Off camera but still playing: the day is running (late start, break in coverage) or another day is to come.
    const status: JourneyStatus = seat && isOnAir(st) ? 'onTable' : seat && (next || isBroadcasting(st)) ? 'stillIn' : 'finished';
    const lastSeen = seat ? last : [...aired].reverse().find((d) => seatsFor(d.id).some((s) => s.playerId === playerId))!;
    out.push({ event: e, status, day: lastSeen, next: status === 'finished' ? undefined : next, stack: seat?.stack ?? 0 });
  }
  const order: Record<JourneyStatus, number> = { onTable: 0, stillIn: 1, finished: 2 };
  return out.sort((a, b) => order[a.status] - order[b.status]);
}

export const STATUS_LABEL: Record<JourneyStatus, string> = {
  onTable: 'At the broadcast table now',
  stillIn: 'Still in · not on camera',
  finished: 'Finished',
};

/** The player's hands in the clip library, most watched first. */
export const handsOf = (playerId: string, n = 6): Video[] => highlightClips.filter((v) => v.tags.some((t) => t.slug === `player-${playerId}`)).slice(0, n);

/** The alert a follower gets, e.g. "Daniel Negreanu is back on Day 3 — catch up on 3 hands so far." */
export function followAlert(playerId: string, streamMode: StreamStatus): string | undefined {
  const p = playerById(playerId);
  const j = journeyOf(playerId, streamMode)[0];
  if (!j || j.status === 'finished') return undefined;
  const n = Math.min(3, handsOf(playerId).length);
  const where = j.status === 'onTable' ? `is at the ${j.day.label} broadcast table now` : `returns for ${j.next?.label ?? 'the next day'}`;
  return `${p.name} ${where}${n ? ` — catch up on ${n} hand${n === 1 ? '' : 's'} so far` : ''}.`;
}
