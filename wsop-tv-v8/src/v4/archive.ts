// v8 — the WSOP archive behind Browse: year → series → event → day, built from the NAS archive's folders
// (src/data/archive.json, made by a script from the file list of the WSOP 2003–2025 folders). Each broadcast day is
// a playable video (`arc.<eventId>.<n>`, highlights `arc.<eventId>.h<n>`); all of them play the archive clip.
import NAS from 'virtual:nas-media';
import data from '../data/archive.json';
import { FOOTAGE, thumbFor } from '../lib/media';
import type { Tag, Video } from './catalog';

export type SeriesKey = 'lv' | 'eu' | 'pa' | 'circuit' | 'apac';
export interface ArchiveDay {
  label: string;
  minutes: number;
}
export interface ArchiveEvent {
  id: string;
  number: number | null;
  name: string;
  buyIn: number;
  currency: string;
  game: string;
  kind: 'Main Event' | 'High Roller' | 'Championship' | 'Special' | 'Open';
  days: ArchiveDay[];
  highlights: number;
}
export interface ArchiveSeries {
  key: SeriesKey;
  name: string;
  events: ArchiveEvent[];
}
export interface ArchiveYear {
  year: number;
  champion: { name: string; cc: string } | null;
  series: ArchiveSeries[];
}

export const ARCHIVE = data as ArchiveYear[];
/** WSOP Classics: 1973–2002 broadcasts, shown once the rights are cleared. */
export const CLASSIC_RANGE = '1973 – 2002';

export interface ArchiveRef {
  year: ArchiveYear;
  series: ArchiveSeries;
  event: ArchiveEvent;
}
const INDEX = new Map<string, ArchiveRef>();
for (const year of ARCHIVE) for (const series of year.series) for (const event of series.events) INDEX.set(event.id, { year, series, event });
export const archiveEvent = (id: string) => INDEX.get(id);
export const archiveEvents = () => [...INDEX.values()];

export const fmtBuyIn = (e: { buyIn: number; currency: string }) => (e.buyIn ? `${e.currency}${e.buyIn.toLocaleString('en-US')}` : '');
export const seriesTitle = (year: number, s: ArchiveSeries) => `${year} WSOP ${s.name}`;

// Pictures: archive stills, picked steadily from the id so the same event always shows the same one.
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const POOL = NAS ? [...NAS.stills.broadcast, ...NAS.stills.hands] : [];
export const archiveArt = (id: string) => (POOL.length ? POOL[hash(id) % POOL.length] : thumbFor(`arc:${id}`));

/** One broadcast day (or highlight) of an archive event, as a video. */
function makeVideo(ref: ArchiveRef, n: number | `h${number}`): Video | undefined {
  const { year, series, event } = ref;
  const clip = typeof n === 'string';
  const day = clip ? undefined : event.days[n];
  if (!clip && !day) return undefined;
  const id = `arc.${event.id}.${n}`;
  const tags: Tag[] = [
    { slug: `year-${year.year}`, label: String(year.year) },
    { slug: `arc-series-${series.key}`, label: `WSOP ${series.name}` },
    { slug: `arc-event-${event.id}`, label: event.name },
  ];
  return {
    id,
    kind: clip ? 'clip' : 'classic',
    title: clip ? `${event.name} · Highlight ${Number(n.slice(1)) + 1}` : `${event.name} · ${day!.label}`,
    subtitle: seriesTitle(year.year, series),
    description: clip ? `A highlight from the ${year.year} ${event.name}.` : `${day!.label} of the ${year.year} WSOP ${series.name} ${event.name}.`,
    thumb: archiveArt(id),
    thumbPos: '50% 50%',
    media: { url: FOOTAGE.ft.url, start: 40 + (hash(id) % 360) },
    durationSec: clip ? 120 + (hash(id) % 240) : day!.minutes * 60,
    eventId: `arc:${event.id}`,
    status: 'vod',
    tags,
    about: [
      ['Year', String(year.year)],
      ['Series', `WSOP ${series.name}`],
      ['Event', event.name],
      ...(event.buyIn ? [['Buy-in', fmtBuyIn(event)] as [string, string]] : []),
      ['Game', event.game],
    ],
    views: 5_000 + (hash(id) % 200_000),
  };
}

/** `arc.<eventId>.<n>` → the video (undefined for anything else). */
export function archiveVideo(id: string): Video | undefined {
  const m = id.match(/^arc\.(.+)\.(h?\d+)$/);
  if (!m) return undefined;
  const ref = INDEX.get(m[1]);
  if (!ref) return undefined;
  return makeVideo(ref, m[2].startsWith('h') ? (m[2] as `h${number}`) : Number(m[2]));
}
/** Full broadcasts of an event, in broadcast order. */
export const broadcastsOf = (ref: ArchiveRef) => ref.event.days.map((_, i) => makeVideo(ref, i)!);
/** Highlights of an event (the archive's highlight and hand-clip files). */
export const highlightsOf = (ref: ArchiveRef) => Array.from({ length: ref.event.highlights }, (_, i) => makeVideo(ref, `h${i}`)!);

/** Suggested for an archive video: the rest of its event, then the year's other events, then the next year's. */
export function archiveRelated(v: Video, n = 10): Video[] {
  const ref = v.eventId ? INDEX.get(v.eventId.replace(/^arc:/, '')) : undefined;
  if (!ref) return [];
  const same = [...broadcastsOf(ref), ...highlightsOf(ref)].filter((x) => x.id !== v.id);
  const sameYear = ref.year.series.flatMap((s) => s.events.filter((e) => e.id !== ref.event.id).map((e) => makeVideo({ year: ref.year, series: s, event: e }, e.days.length - 1)!));
  return [...same, ...sameYear].slice(0, n);
}

/**
 * Recurring events (Events tab): each matches its event across the years by name.
 * Order: the Main Event first, then the high rollers and championships, then the big open events.
 */
export const RECURRING: { slug: string; name: string; blurb: string; match: (e: ArchiveEvent, s: ArchiveSeries) => boolean }[] = [
  { slug: 'main-event', name: 'Main Event', blurb: 'The $10,000 No-Limit Hold’em World Championship', match: (e, s) => e.kind === 'Main Event' && s.key === 'lv' },
  { slug: 'poker-players-championship', name: 'Poker Players Championship', blurb: '$50,000 mixed games, the players’ championship', match: (e) => /players championship/i.test(e.name) },
  { slug: 'super-high-roller', name: 'Super High Roller', blurb: '$250,000 and $100,000 No-Limit Hold’em', match: (e) => /(250,?000|250K|100,?000|100K)/i.test(e.name) && /roller/i.test(e.name) },
  { slug: 'high-roller', name: 'High Roller', blurb: '$25,000 and $50,000 high rollers', match: (e) => /roller/i.test(e.name) && !/(250,?000|250K|100,?000|100K)/i.test(e.name) },
  { slug: 'millionaire-maker', name: 'Millionaire Maker', blurb: '$1,500 with a million for first', match: (e) => /millionaire maker/i.test(e.name) },
  { slug: 'heads-up', name: 'Heads-Up Championship', blurb: '$25,000 one-on-one', match: (e) => /heads[- ]?up/i.test(e.name) },
  { slug: 'omaha', name: 'Pot-Limit Omaha Championship', blurb: 'The PLO bracelets', match: (e) => /pot.?limit omaha/i.test(e.name) && /championship|high roller/i.test(e.name) },
  { slug: 'horse', name: 'H.O.R.S.E. Championship', blurb: 'Five games in rotation', match: (e) => /h\.?o\.?r\.?s\.?e/i.test(e.name) },
  { slug: 'colossus', name: 'Colossus', blurb: 'The biggest field of the summer', match: (e) => /colossus/i.test(e.name) },
  { slug: 'monster-stack', name: 'Monster Stack', blurb: 'Deep stacks, huge field', match: (e) => /monster ?stack/i.test(e.name) },
  { slug: 'ladies', name: 'Ladies Championship', blurb: 'The ladies’ bracelet', match: (e) => /ladies/i.test(e.name) },
  { slug: 'seniors', name: 'Seniors Championship', blurb: 'Players 50 and over', match: (e) => /seniors/i.test(e.name) },
];
/** A recurring event across the years, newest first. */
export const chronicle = (slug: string) => {
  const r = RECURRING.find((x) => x.slug === slug);
  return r ? archiveEvents().filter((x) => r.match(x.event, x.series)).sort((a, b) => b.year.year - a.year.year) : [];
};
