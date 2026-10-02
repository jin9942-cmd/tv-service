// Data access layer. Screens only talk to these async functions.
// API INTEGRATION POINT: replace each body with a fetch() to the real backend
// (schedule/event service, EBS-fed table data, VOD catalogue). Signatures can stay the same.
import * as db from './mock';
import type { ArchiveVideo, Broadcast, HandRecord, ID, Player, Season, TournamentEvent, VideoSource } from './types';
import { demoStore } from '../state/stores';
import { eventDateKey, todayKey } from '../lib/time';

const LATENCY_MS = 120;
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS));

// --- demo transforms --------------------------------------------------------

function applyEvent(e: TournamentEvent): TournamentEvent {
  if (demoStore.get().noLive && e.status === 'live') return { ...e, status: 'ended' };
  return e;
}

function applyBroadcast(b: Broadcast): Broadcast {
  if (demoStore.get().noLive && (b.status === 'live' || b.status === 'delayed' || b.status === 'interrupted')) {
    return { ...b, status: 'ended', statusNote: 'No live broadcast right now (Demo tools: “No live tournaments” is on).' };
  }
  return b;
}

const allEvents = () => db.events.map(applyEvent);
const allBroadcasts = () => db.broadcasts.map(applyBroadcast);

// --- seasons / events -------------------------------------------------------

export const getSeasons = (): Promise<Season[]> => delay(db.seasons);

export const getEvent = (id: ID): Promise<TournamentEvent | null> =>
  delay(allEvents().find((e) => e.id === id) ?? null);

export const getEvents = (filter: { seasonId?: ID } = {}): Promise<TournamentEvent[]> =>
  delay(allEvents().filter((e) => !filter.seasonId || e.seasonId === filter.seasonId));

/** Events that belong in the Tournament Ticker: live first, then upcoming (current season only). */
export function getTickerEvents(): Promise<TournamentEvent[]> {
  const rank = { live: 0, upcoming: 1, ended: 2 } as const;
  const list = allEvents()
    .filter((e) => db.seasons.find((s) => s.id === e.seasonId)?.isCurrent)
    // keep events that ended within the last 24h so "ended" coverage is still reachable
    .filter((e) => e.status !== 'ended' || Date.now() - new Date(e.endAt ?? e.startAt).getTime() < 86_400_000)
    .sort((a, b) => rank[a.status] - rank[b.status] || a.startAt.localeCompare(b.startAt));
  return delay(list);
}

export const getLiveEvents = (): Promise<TournamentEvent[]> => delay(allEvents().filter((e) => e.status === 'live'));

/** Events shown on a schedule day (event-venue date). Live events are always listed on today. */
export function getSchedule(dateKey: string): Promise<TournamentEvent[]> {
  const today = todayKey();
  const list = allEvents()
    .filter((e) => db.seasons.find((s) => s.id === e.seasonId)?.isCurrent)
    .filter((e) => (e.status === 'live' ? dateKey === today : eventDateKey(e.startAt) === dateKey))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  return delay(list);
}

/** Dates (event time) that have at least one event, for "next day with events" links. */
export function getScheduleDates(): Promise<string[]> {
  const today = todayKey();
  const keys = allEvents()
    .filter((e) => db.seasons.find((s) => s.id === e.seasonId)?.isCurrent)
    .map((e) => (e.status === 'live' ? today : eventDateKey(e.startAt)));
  return delay([...new Set(keys)].sort());
}

// --- broadcasts -------------------------------------------------------------

export const getBroadcast = (id: ID): Promise<Broadcast | null> =>
  delay(allBroadcasts().find((b) => b.id === id) ?? null);

export const getBroadcastsForEvent = (eventId: ID): Promise<Broadcast[]> =>
  delay(allBroadcasts().filter((b) => b.eventId === eventId));

export const getVideoSource = (id: ID): VideoSource | null => db.videoSources.find((s) => s.id === id) ?? null;

/** Still frame closest to a position in a source (used for thumbnails and posters). */
export function frameFor(sourceId: ID | undefined, sec = 0): string | undefined {
  const frames = db.videoSources.find((s) => s.id === sourceId)?.frames ?? [];
  let best = frames[0];
  for (const f of frames) if (Math.abs(f.sec - sec) < Math.abs((best?.sec ?? 0) - sec)) best = f;
  return best?.src;
}

/** Other live streams that reuse the same sample file (shown so testers aren't confused by identical video). */
export const getBroadcastsSharingSource = (b: Broadcast): Broadcast[] =>
  b.status !== 'live' ? [] : allBroadcasts().filter((o) => o.id !== b.id && o.sourceId === b.sourceId && o.status === 'live');

// --- players ----------------------------------------------------------------

export const getPlayers = (): Promise<Player[]> => delay(db.players);

export const getPlayer = (id: ID): Promise<Player | null> => delay(db.players.find((p) => p.id === id) ?? null);

export const getPlayersByIds = (ids: ID[]): Promise<Record<ID, Player>> =>
  delay(Object.fromEntries(db.players.filter((p) => ids.includes(p.id)).map((p) => [p.id, p])));

export interface PastFinal {
  event: TournamentEvent;
  season: Season;
  place: number;
  prize: number;
  broadcastId: ID | undefined;
}

export function getPastFinals(playerId: ID): Promise<PastFinal[]> {
  const list: PastFinal[] = [];
  for (const e of db.events) {
    const r = e.results?.find((x) => x.playerId === playerId);
    if (!r) continue;
    const season = db.seasons.find((s) => s.id === e.seasonId)!;
    if (season.isCurrent) continue;
    list.push({ event: e, season, place: r.place, prize: r.prize, broadcastId: e.defaultBroadcastId });
  }
  return delay(list.sort((a, b) => b.season.year - a.season.year || a.place - b.place));
}

// --- hands ------------------------------------------------------------------

export const getHand = (id: ID): Promise<HandRecord | null> => delay(db.hands.find((h) => h.id === id) ?? null);

export function getHands(filter: { eventId?: ID; broadcastId?: ID; playerId?: ID; clipsOnly?: boolean } = {}): Promise<HandRecord[]> {
  return delay(
    db.hands.filter(
      (h) =>
        (!filter.eventId || h.eventId === filter.eventId) &&
        (!filter.broadcastId || h.broadcastId === filter.broadcastId) &&
        (!filter.playerId || h.playerIds.includes(filter.playerId)) &&
        (!filter.clipsOnly || !!h.clip),
    ),
  );
}

// --- archive ----------------------------------------------------------------

export const getArchive = (filter: { seasonId?: ID; eventId?: ID } = {}): Promise<ArchiveVideo[]> =>
  delay(
    db.archiveVideos.filter(
      (a) => (!filter.seasonId || a.seasonId === filter.seasonId) && (!filter.eventId || a.eventId === filter.eventId),
    ),
  );

// --- lookups used for labels (sync, small) ---------------------------------

export const lookup = {
  event: (id: ID) => applyEventOrNull(db.events.find((e) => e.id === id)),
  season: (id: ID) => db.seasons.find((s) => s.id === id) ?? null,
  player: (id: ID) => db.players.find((p) => p.id === id) ?? null,
  hand: (id: ID) => db.hands.find((h) => h.id === id) ?? null,
  broadcast: (id: ID) => {
    const b = db.broadcasts.find((x) => x.id === id);
    return b ? applyBroadcast(b) : null;
  },
};

function applyEventOrNull(e: TournamentEvent | undefined) {
  return e ? applyEvent(e) : null;
}
