// v4 — one catalog of everything playable (broadcast days, classics, hand clips, 24/7 channels). Cards, the detail
// popup, the common player, related videos and tag pages all read from here, so every video looks and behaves the same.
import { archive, classicEvents, dayById, events, finalTableSeats, hands, playerById, seatsFor, seriesById } from '../data/mock';
import { channelById, channels, programAt } from '../data/channels';
import type { Day, Hand, TourEvent } from '../data/types';
import { FOOTAGE, tableVideo, thumbFor } from '../lib/media';
import { duration, money } from '../lib/format';
import { VENUE_TZ, fmtDateTime } from '../lib/time';
import { isOnAir } from '../lib/broadcast';
import { mediaFor } from '../features/channels/Channels';
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
const HERO_DAY = 'lv-main-finaltable';

const GAME_TAG: Record<TourEvent['game'], Tag> = {
  'No-Limit Hold’em': { slug: 'no-limit-holdem', label: 'No-Limit Hold’em' },
  'Pot-Limit Omaha': { slug: 'pot-limit-omaha', label: 'Pot-Limit Omaha' },
  'Mixed Games': { slug: 'mixed-games', label: 'Mixed Games' },
};
const HAND_TAG: Record<Hand['type'], Tag> = {
  allin: { slug: 'all-in', label: 'All-in' },
  bigpot: { slug: 'big-pot', label: 'Big pot' },
  bluff: { slug: 'bluff', label: 'Bluff' },
  badbeat: { slug: 'bad-beat', label: 'Bad beat' },
  herofold: { slug: 'hero-fold', label: 'Hero fold' },
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
  return [
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

function dayVideo(e: TourEvent, d: Day, i: number): Video {
  const classic = e.seriesId === 'classics';
  const a = classic ? archive.find((x) => `classic-${x.id}` === e.id) : undefined;
  const v = tableVideo(i);
  return {
    id: d.id,
    kind: classic ? 'classic' : 'broadcast',
    title: classic ? e.name : `${short(e)} · ${d.label}`,
    subtitle: classic ? (a?.subtitle ?? 'WSOP Classics') : seriesById(e.seriesId).name,
    description: classic
      ? `${a?.subtitle ?? ''}. The full final table from the ${e.name.slice(0, 4)} WSOP, edited for on-demand viewing.`
      : d.label === 'Final Table'
        ? `The final table of the ${short(e)} — ${e.entrants.toLocaleString('en-US')} entries, ${money(e.firstPrize)} and the bracelet to the winner.`
        : `${d.label} of the ${short(e)}, from the feature table.`,
    thumb: thumbFor(classic ? `archive:${a?.id}` : `day:${d.id}`),
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
    thumb: thumbFor(`hand:${h.id}`),
    media: { url: FOOTAGE.ft.url, start: [40, 110, 180, 260, 330][i % 5] },
    durationSec: h.durationSec,
    eventId: ref.event.id,
    dayId: h.dayId,
    tags: [eventTag(ref.event), ...playerTags(h.playerIds), HAND_TAG[h.type], GAME_TAG[ref.event.game], stageTag(ref.day)],
    about: [
      ['Event', short(ref.event)],
      ['Broadcast', ref.day.label],
      ['Game', ref.event.game],
      ['Length', duration(h.durationSec)],
    ],
    views: h.views,
  };
}

const days: Video[] = [...events, ...classicEvents].flatMap((e) => e.days.filter((d) => d.status !== 'upcoming').map((d, i) => dayVideo(e, d, i)));
const clips: Video[] = hands.map(clipVideo);
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
    thumb: m.poster,
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
  return catalog.find((v) => v.id === id);
}

/** Live right now? The hero final table follows the demo's stream mode. */
export function isLive(v: Video, streamMode: StreamStatus): boolean {
  if (v.kind === 'channel') return true;
  if (v.kind !== 'broadcast' || !v.status) return false;
  return isOnAir(v.dayId === HERO_DAY ? streamMode : v.status);
}

/** Related: same event first, then videos sharing the most tags; never the video itself. */
export function relatedTo(v: Video, n = 10): Video[] {
  const slugs = new Set(v.tags.map((t) => t.slug));
  return catalog
    .filter((x) => x.id !== v.id && x.id !== v.dayId)
    .map((x) => ({ x, score: (v.eventId && x.eventId === v.eventId ? 3 : 0) + x.tags.filter((t) => slugs.has(t.slug)).length }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.x.views - a.x.views)
    .slice(0, n)
    .map((r) => r.x);
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
  days.find((v) => v.id === 'lv-mm-finaltable'),
  highlightClips[0],
  classics[2],
  days.find((v) => v.id === 'lv-plo-finaltable'),
  highlightClips[3],
  days.find((v) => v.id === 'lv-tc-finaltable'),
  classics[4],
  highlightClips[6],
].filter((v): v is Video => !!v);
