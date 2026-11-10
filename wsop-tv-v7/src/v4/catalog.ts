// v4 — one catalog of everything playable (broadcast days, classics, hand clips, 24/7 channels). Cards, the detail
// popup, the common player, related videos and tag pages all read from here, so every video looks and behaves the same.
import { archiveRelated, archiveVideo } from './archive';
import { archive, classicEvents, dayById, events, finalTableSeats, hands, playerById, seatsFor, seriesById } from '../data/mock';
import { channelById, channels, programAt } from '../data/channels';
import type { Day, Hand, TourEvent } from '../data/types';
import { FOOTAGE, tableVideo, thumbFor } from '../lib/media';
import { duration, money } from '../lib/format';
import { VENUE_TZ, fmtDateTime } from '../lib/time';
import { isOnAir } from '../lib/broadcast';
import { mediaFor } from '../features/channels/Channels';
import { CHANNEL_ART, EXTERIOR, PLAYER_ART, PROMO_ART, TABLE_ART, VENUE_ART } from '../lib/brand';
import type { StreamStatus } from '../data/types';

export type VideoKind = 'broadcast' | 'classic' | 'clip' | 'channel';

export interface Tag {
  slug: string;
  label: string;
}

export interface Video {
  /** Route id: a broadcast day id, a hand id, or `ch-<channel>`. */
  id: string;
  kind: VideoKind;
  title: string;
  /** One quiet line under the title (no badges). */
  subtitle: string;
  description: string;
  thumb: string;
  /** Crop of the thumbnail (CSS object-position). */
  thumbPos: string;
  /** 'contain' for cut-out artwork (shown whole on a backdrop). */
  thumbFit?: 'contain';
  media: { url: string; start: number };
  durationSec: number;
  eventId?: string;
  dayId?: string;
  /** Status for live detection (broadcasts only). */
  status?: StreamStatus;
  tags: Tag[];
  about: [string, string][];
  /** For "most watched" ordering. */
  views: number;
}

const short = (e: TourEvent) => e.name.replace(' World Championship', '');

// Artwork, so thumbnails don't repeat: fixed picks first, then each photo once (crops of the same photo count as
// used; players' own photos are kept for their clips), then the broadcast stills, each also used once.
const usedPhotos = new Set([...Object.values(PROMO_ART), ...Object.values(PLAYER_ART).flat(), ...Object.values(CHANNEL_ART)].map((a) => a.src));
function artFor(id: string, pool: 'table' | 'venue' | 'clip') {
  const fixed = PROMO_ART[id];
  if (fixed) return { thumb: fixed.src, thumbPos: fixed.pos, thumbFit: fixed.fit };
  // Clips take the table photos the broadcasts left over, then the stills.
  // Photos of play (room and table shots) before the casino exteriors.
  const order = pool === 'clip' ? TABLE_ART : [...(pool === 'table' ? TABLE_ART : VENUE_ART.filter((x) => !EXTERIOR.has(x.src))), ...TABLE_ART, ...VENUE_ART];
  const a = order.find((x) => !usedPhotos.has(x.src));
  if (a) {
    usedPhotos.add(a.src);
    return { thumb: a.src, thumbPos: a.pos, thumbFit: a.fit };
  }
  return { thumb: thumbFor(pool === 'clip' ? `hand:${id}` : `day:${id}`), thumbPos: '50% 50%' };
}
const thumbOf = (id: string) => {
  const v = catalog.find((x) => x.id === id);
  return v && { thumb: v.thumb, thumbPos: v.thumbPos, thumbFit: v.thumbFit };
};
const HERO_DAY = 'lv-main-finaltable';

const GAME_TAG: Record<TourEvent['game'], Tag> = {
  'No-Limit Hold’em': { slug: 'no-limit-holdem', label: 'No-Limit Hold’em' },
  'Pot-Limit Omaha': { slug: 'pot-limit-omaha', label: 'Pot-Limit Omaha' },
  'Mixed Games': { slug: 'mixed-games', label: 'Mixed Games' },
};
const HAND_TAG: Record<Hand['type'], Tag> = {
  cooler: { slug: 'cooler', label: 'Cooler' },
  herocall: { slug: 'hero-call', label: 'Hero call' },
  winning: { slug: 'winning-moment', label: 'Winning moment' },
  bigpot: { slug: 'big-pot', label: 'Big pot' },
  bluff: { slug: 'bluff', label: 'Bluff' },
  badbeat: { slug: 'bad-beat', label: 'Bad beat' },
};
const eventTag = (e: TourEvent): Tag => ({ slug: `event-${e.id}`, label: e.seriesId === 'classics' ? e.name : short(e) });
const stageTag = (d: Day): Tag => ({ slug: d.label === 'Final Table' ? 'final-table' : 'tournament-days', label: d.label === 'Final Table' ? 'Final Table' : 'Tournament days' });
/** Player tags: the players at the table (biggest stacks first, at most four) or the two players in a hand. */
const playerTags = (ids: string[]): Tag[] => ids.map((id) => ({ slug: `player-${id}`, label: playerById(id).name }));
const tablePlayers = (d: Day) => [...(d.id === HERO_DAY ? finalTableSeats : seatsFor(d.id))].sort((a, b) => b.stack - a.stack).slice(0, 4).map((x) => x.playerId);
const seriesTag = (e: TourEvent): Tag => (e.seriesId === 'classics' ? { slug: 'classics', label: 'WSOP Classics' } : { slug: `series-${e.seriesId}`, label: seriesById(e.seriesId).name });

function aboutDay(e: TourEvent, d: Day): [string, string][] {
  const se = seriesById(e.seriesId);
  const field = d.id === HERO_DAY ? finalTableSeats.length : seatsFor(d.id).length;
  // Tournament, broadcast, game and buy-in first (what the viewer looks for), then the rest.
  return [
    ['Tournament', e.seriesId === 'classics' ? e.name : short(e)],
    ['Broadcast', d.label],
    ['Game', e.game],
    ['Buy-in', e.buyIn ? money(e.buyIn) : 'Invitational'],
    ['Entries', e.entrants.toLocaleString('en-US')],
    ['Prize pool', money(e.prizePool)],
    ['Aired', `${fmtDateTime(d.start, VENUE_TZ)} PT`],
    ['Length', duration(d.durationMin * 60)],
    ['Venue', `${se.venue}, ${se.city}`],
    ['Field', `${field} players at the ${d.label === 'Final Table' ? 'final table' : 'feature table'}`],
  ];
}

const entries = (e: TourEvent) => `${e.entrants.toLocaleString('en-US')} entries`;
/** $10,000,000 → $10M, $186,200 → $186K (short enough for a card line). */
const shortMoney = (n: number) => '$' + (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
const dayLine = (e: TourEvent, d: Day) =>
  d.label === 'Final Table' ? `${entries(e)} · ${shortMoney(e.firstPrize)} to the winner` : `${new Date(d.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: VENUE_TZ })} · ${entries(e)}`;

/**
 * Recap titles, as NBA titles its videos (the player and what happened first): a decided final table leads with its
 * winner ("Michael Wang wins the $10,000 Pot-Limit Omaha Championship"); the live Main Event final table says who
 * leads and how many are left; other days keep the event and the day. Facts only: winners and the leader are data.
 */
function recapTitle(e: TourEvent, d: Day): string {
  const name = e.seriesId === 'classics' ? e.name.replace(/ Final Table$/, '') : short(e);
  if (d.label !== 'Final Table') return `${name} · ${d.label}`;
  if (e.winnerId) return `${playerById(e.winnerId).name} wins the ${name}`;
  if (d.id === HERO_DAY && e.leaderId) return `${name} Final Table · ${playerById(e.leaderId).name.split(' ').slice(-1)[0]} leads, ${e.remaining} left`;
  return `${name} · Final Table`;
}

/** The stage of a broadcast (Day 1A … Final Table): from its day, not its title (titles lead with the story). */
export function stageOf(v: Video): string {
  return (v.dayId && dayById(v.dayId)?.day.label) || v.title.split(' · ').pop() || v.title;
}

function dayVideo(e: TourEvent, d: Day, i: number): Video {
  const classic = e.seriesId === 'classics';
  const a = classic ? archive.find((x) => `classic-${x.id}` === e.id) : undefined;
  const v = tableVideo(i);
  return {
    id: d.id,
    kind: classic ? 'classic' : 'broadcast',
    title: recapTitle(e, d),
    // The line under the title says why it's worth watching: a final table's field and first prize; another day's date and field.
    subtitle: dayLine(e, d),
    description: classic
      ? `${a?.subtitle ?? ''}. The full final table from the ${e.name.slice(0, 4)} WSOP, edited for on-demand viewing.`
      : d.label === 'Final Table'
        ? `The final table of the ${short(e)} — ${e.entrants.toLocaleString('en-US')} entries, ${money(e.firstPrize)} and the bracelet to the winner.`
        : `${d.label} of the ${short(e)}, from the feature table.`,
    ...artFor(d.id, d.label === 'Final Table' || classic ? 'table' : 'venue'),
    media: { url: v.url, start: v.start },
    durationSec: d.durationMin * 60,
    eventId: e.id,
    dayId: d.id,
    status: d.status,
    tags: [eventTag(e), ...playerTags(tablePlayers(d)), GAME_TAG[e.game], stageTag(d), seriesTag(e)],
    about: aboutDay(e, d),
    views: 40_000 + ((i * 7919 + e.entrants) % 400_000),
  };
}

function clipVideo(h: Hand, i: number): Video {
  const ref = dayById(h.dayId)!;
  return {
    id: h.id,
    kind: 'clip',
    title: h.title,
    subtitle: `${short(ref.event)} · ${ref.day.label}`,
    description: `A key hand from the ${short(ref.event)} ${ref.day.label.toLowerCase()}.`,
    ...artFor(h.id, 'clip'),
    media: { url: FOOTAGE.hl.url, start: [40, 110, 180, 260, 330][i % 5] },
    durationSec: h.durationSec,
    eventId: ref.event.id,
    dayId: h.dayId,
    tags: [eventTag(ref.event), ...playerTags(h.playerIds), HAND_TAG[h.type], GAME_TAG[ref.event.game], stageTag(ref.day)],
    about: [
      ['Tournament', short(ref.event)],
      ['Broadcast', ref.day.label],
      ['Game', ref.event.game],
      ['Buy-in', ref.event.buyIn ? money(ref.event.buyIn) : 'Invitational'],
      ['Length', duration(h.durationSec)],
    ],
    views: h.views,
  };
}

const days: Video[] = [...events, ...classicEvents].flatMap((e) => e.days.filter((d) => d.status !== 'upcoming').map((d, i) => dayVideo(e, d, i)));
const clips: Video[] = hands.map(clipVideo);
// A player the demo has photos of: their most-watched clips show those photos, each photo once.
for (const [playerId, photos] of Object.entries(PLAYER_ART)) {
  const theirs = clips.filter((v) => v.tags.some((t) => t.slug === `player-${playerId}`)).sort((a, b) => b.views - a.views);
  photos.forEach((a, i) => theirs[i] && Object.assign(theirs[i], { thumb: a.src, thumbPos: a.pos, thumbFit: a.fit }));
}
// Events with no broadcast still of their own get designed key art (public/keyart, made by scripts/keyart.mjs): the
// event's buy-in, name and a motif; FINAL TABLE on its broadcast, KEY HAND on its clips.
const KEYART = new Set(['lv-hu', 'lv-mmm', 'lv-ms', 'lv-seniors', 'lv-ppc', 'lv-ladies', 'lv-plo', 'lv-hr', 'classic-a1', 'classic-a2', 'classic-a3', 'classic-a4']);
for (const v of [...days, ...clips])
  if (v.eventId && KEYART.has(v.eventId) && !PROMO_ART[v.id])
    Object.assign(v, { thumb: `${import.meta.env.BASE_URL}keyart/${v.eventId}${v.kind === 'clip' ? '-hand' : ''}.svg`, thumbPos: '50% 50%', thumbFit: undefined });

/** Everything on demand or live from an event (channels are built on request, since what's on changes). */
export const catalog: Video[] = [...days, ...clips];

/** A 24/7 channel as a video: whatever is on air right now. */
export function channelVideo(channelId: string, at: number): Video | undefined {
  const ch = channelById(channelId);
  const p = ch && programAt(ch.id, at);
  if (!ch || !p) return undefined;
  const m = mediaFor(p);
  const ref = p.dayId ? dayById(p.dayId) : undefined;
  return {
    id: `ch-${ch.id}`,
    kind: 'channel',
    title: p.title,
    subtitle: ch.name,
    description: p.subtitle,
    // A channel showing a broadcast or a classic uses that video's image, so the same content looks the same everywhere.
    ...((p.dayId && thumbOf(p.dayId)) || (p.archiveId && thumbOf(`classic-${p.archiveId}-finaltable`)) || { thumb: TABLE_ART[p.seed % TABLE_ART.length].src, thumbPos: TABLE_ART[p.seed % TABLE_ART.length].pos, thumbFit: TABLE_ART[p.seed % TABLE_ART.length].fit }),
    media: { url: m.video, start: m.start },
    durationSec: Math.round((p.end - p.start) / 1000),
    eventId: ref?.event.id,
    dayId: p.dayId,
    tags: ref ? [eventTag(ref.event), ...playerTags(tablePlayers(ref.day)), GAME_TAG[ref.event.game], { slug: 'channels', label: '24/7 Channels' }] : [{ slug: 'channels', label: '24/7 Channels' }],
    about: ref
      ? aboutDay(ref.event, ref.day)
      : [
          ['Channel', ch.name],
          ['Programme', p.title],
          ['Language', ch.lang === 'ES' ? 'Spanish' : 'English'],
          ['Length', duration(Math.round((p.end - p.start) / 1000))],
        ],
    views: 0,
  };
}

export function videoById(id: string, at = Date.now()): Video | undefined {
  if (id.startsWith('ch-')) return channelVideo(id.slice(3), at);
  if (id.startsWith('arc.')) return archiveVideo(id);
  return catalog.find((v) => v.id === id);
}

/** Live right now? The hero final table follows the demo's stream mode. */
export function isLive(v: Video, streamMode: StreamStatus): boolean {
  if (v.kind === 'channel') return true;
  if (v.kind !== 'broadcast' || !v.status) return false;
  return isOnAir(v.dayId === HERO_DAY ? streamMode : v.status);
}

/** When a video aired (its broadcast day's start), for "newest first". */
const airedAt = (x: Video) => (x.dayId ? Date.parse(dayById(x.dayId)?.day.start ?? '') || 0 : 0);

/**
 * Dynamic badge drawn on a thumbnail by the UI (never baked into the image). Each means one thing:
 * - Live: on air now.
 * - New: a new broadcast of the series that is running, aired in the last 3 days (its replays and hands).
 * - Recently Added: older content just added to the library (WSOP Classics, past series), in the last 14 days.
 * 24/7 channels get none.
 */
export type Badge = 'Live' | 'New' | 'Recently Added';
const DAY_MS = 86_400_000;
/** Library additions (demo data): days ago each was added. */
const ADDED_DAYS_AGO: Record<string, number> = {
  'classic-a5-finaltable': 2,
  'classic-a3-finaltable': 6,
};
const runningSeriesId = (now: number) => {
  const ref = HERO_DAY ? dayById(HERO_DAY) : undefined;
  const sid = ref?.event.seriesId;
  return sid && Date.parse(ref!.day.start) <= now ? sid : undefined;
};
export function badgeFor(v: Video, streamMode: StreamStatus, now = Date.now()): Badge | null {
  if (v.kind === 'channel') return null;
  if (isLive(v, streamMode)) return 'Live';
  const added = ADDED_DAYS_AGO[v.id];
  if (added !== undefined) return added < 14 ? 'Recently Added' : null;
  if (v.kind === 'classic') return null;
  const ref = v.dayId ? dayById(v.dayId) : undefined;
  const t = airedAt(v);
  if (!ref || !t || t > now || ref.event.seriesId !== runningSeriesId(now)) return null;
  return now - t < 3 * DAY_MS ? 'New' : null;
}

/**
 * Related videos (at most `n`, 10 by default): the same event first, newest first (a broadcast before its clips); then the videos sharing the most
 * tags. Never the video itself or the broadcast a clip comes from.
 */
export function relatedTo(v: Video, n = 10): Video[] {
  if (v.id.startsWith('arc.')) return archiveRelated(v, n);
  const self = (x: Video) => x.id === v.id || x.id === v.dayId;
  const same = v.eventId ? catalog.filter((x) => !self(x) && x.eventId === v.eventId).sort((a, b) => airedAt(b) - airedAt(a) || Number(a.kind === 'clip') - Number(b.kind === 'clip') || b.views - a.views) : [];
  // The loop after this event: its winner's other final tables, then the series' other final tables, newest first.
  const ev = v.dayId ? dayById(v.dayId)?.event : undefined;
  const isFinal = (x: Video) => x.kind === 'broadcast' && stageOf(x) === 'Final Table' && x.eventId !== v.eventId;
  const evOf = (x: Video) => (x.dayId ? dayById(x.dayId)?.event : undefined);
  const winners = ev?.winnerId ? catalog.filter((x) => isFinal(x) && evOf(x)?.winnerId === ev.winnerId) : [];
  const seriesFinals = ev ? catalog.filter((x) => isFinal(x) && evOf(x)?.seriesId === ev.seriesId && !winners.includes(x)).sort((a, b) => airedAt(b) - airedAt(a)) : [];
  const loop = [...winners, ...seriesFinals];
  const slugs = new Set(v.tags.map((t) => t.slug));
  const byTags = catalog
    .filter((x) => !self(x) && !same.includes(x) && !loop.includes(x))
    .map((x) => ({ x, score: x.tags.filter((t) => slugs.has(t.slug)).length }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.x.views - a.x.views)
    .map((r) => r.x);
  return [...same, ...loop, ...byTags].slice(0, n);
}

export function byTag(slug: string): { tag?: Tag; videos: Video[] } {
  const videos = catalog.filter((v) => v.tags.some((t) => t.slug === slug));
  const tag = videos[0]?.tags.find((t) => t.slug === slug);
  return { tag, videos: videos.sort((a, b) => b.views - a.views) };
}

/** Other broadcast days of the same event (the detail popup's episode list). */
export function episodesOf(v: Video): Video[] {
  if (!v.eventId || v.kind === 'clip') return [];
  return days.filter((x) => x.eventId === v.eventId);
}

export const homeChannels = channels;
export const classics = days.filter((v) => v.kind === 'classic').sort((a, b) => b.title.localeCompare(a.title));
export const replays = days.filter((v) => v.kind === 'broadcast' && v.status === 'vod');
export const highlightClips = [...clips].sort((a, b) => b.views - a.views);
/** "Recommended for you": a fixed, varied mix (final tables, classics and the most-watched hands). */
export const recommended: Video[] = [
  days.find((v) => v.id === 'lv-ppc-finaltable'),
  highlightClips[0],
  classics[2],
  days.find((v) => v.id === 'lv-plo-finaltable'),
  highlightClips[3],
  days.find((v) => v.id === 'lv-tc-finaltable'),
  classics[4],
  highlightClips[6],
].filter((v): v is Video => !!v);
