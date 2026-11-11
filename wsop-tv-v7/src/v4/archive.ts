// v8 — the WSOP archive behind Browse: year → series → event → day, built from the NAS archive's folders
// (src/data/archive.json, made by a script from the file list of the WSOP 2003–2025 folders). Each broadcast day is
// a playable video (`arc.<eventId>.<n>`, highlights `arc.<eventId>.h<n>`); all of them play the archive clip.
import NAS from 'virtual:nas-media';
import data from '../data/archive.json';
import { FOOTAGE, thumbFor } from '../lib/media';
import { CHANNEL_ART, HERO_IMAGES, PROMO_ART, SEASON_ART } from '../lib/brand';
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
  /** WSOP Classics (1973–2002): the Main Event broadcast at Binion's Horseshoe. */
  classic?: boolean;
}

export const ARCHIVE = data as ArchiveYear[];
// The file list files some Las Vegas Main Events as open events (2021, 2022: "$10,000 No-Limit Hold'em Main Event").
for (const y of ARCHIVE)
  for (const s of y.series)
    for (const e of s.events) if (s.key === 'lv' && e.kind !== 'Main Event' && /^\$10,000 No.?Limit Hold'em Main Event$/i.test(e.name)) e.kind = 'Main Event';
/** WSOP Classics: the 1973–2002 Main Event broadcasts. */
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
// Each series shows stills of its own look (a Las Vegas event never shows a Super Circuit or Paradise frame).
const ALL_STILLS = NAS ? [...new Set([...NAS.stills.broadcast, ...NAS.stills.hands, ...NAS.stills.venue])] : [];
const SKIP = /vegas-(d1-02|d5-03|ft-0[379]|ft-10|shr-0[25])\.jpg$/; // dark, people-only or break frames
const PREFIX: Record<SeriesKey, string> = { lv: 'vegas-', eu: 'wsope-', pa: 'paradise-', apac: 'paradise-', circuit: 'cyprus-' };
const poolOf = (key: SeriesKey) => ALL_STILLS.filter((p) => p.includes(`/${PREFIX[key]}`) && !SKIP.test(p));
/** A still for an event of a series, picked steadily from its id. */
/**
 * Pictures handed out in order, per year and series, so a page never shows one twice: first each event's final (a
 * year page lists one per event), then every other broadcast day (an event page lists its days). The pool wraps only
 * when a year has more broadcasts than the series has stills.
 */
let SEQ: Map<string, string> | undefined;
/** The archive's own pool: every still of every series and the crops, minus the ones the 2025 pages already show. */
const SEQ_POOL = () => {
  const taken = new Set([HERO_IMAGES.finalTable, SEASON_ART.src, ...Object.values(CHANNEL_ART).map((a) => a.src), ...Object.values(PROMO_ART).map((a) => a.src)]);
  const crops = ['lv-hr', 'classic-a1', 'classic-a2', 'classic-a3', 'classic-a4', 'lv-hu', 'lv-mmm', 'lv-ms', 'lv-seniors', 'lv-ppc', 'lv-ladies', 'lv-plo'].map((k) => `${import.meta.env.BASE_URL}crops/${k}.jpg`);
  return [...ALL_STILLS.filter((p) => !SKIP.test(p) && !taken.has(p)), ...crops];
};
function seqArt(id: string): string | undefined {
  if (!SEQ) {
    SEQ = new Map();
    let yi = 0;
    for (const y of ARCHIVE) {
      if (y.classic) continue;
      const pool = SEQ_POOL();
      // Each year starts one picture further on and hands its Main Event the first one, so the Main Events of
      // different years (an event page's From the archive) never share a picture either.
      let k = yi++ % (pool.length || 1);
      if (!pool.length) continue;
      const finalOf = (e: ArchiveEvent) => {
        const fi = e.days.findIndex((d) => /final/i.test(d.label));
        return fi >= 0 ? fi : e.days.length - 1;
      };
      const all = y.series.flatMap((s) => s.events.map((e) => ({ e, lvMain: s.key === 'lv' && e.kind === 'Main Event' })));
      const evs = [...all.filter((x) => x.lvMain), ...all.filter((x) => !x.lvMain)].map((x) => x.e);
      // Every event's final first (a year page shows one per event), then the highlights, then the other days.
      for (const e of evs) {
        const src = pool[k++ % pool.length];
        SEQ.set(`arc.${e.id}.${finalOf(e)}`, src);
        SEQ.set(e.id, src);
      }
      for (const e of evs) for (let h = 0; h < e.highlights; h++) SEQ.set(`arc.${e.id}.h${h}`, pool[k++ % pool.length]);
      for (const e of evs) e.days.forEach((_, d) => d !== finalOf(e) && SEQ!.set(`arc.${e.id}.${d}`, pool[k++ % pool.length]));
    }
  }
  return SEQ.get(id);
}
export const seriesArt = (key: SeriesKey, id: string) => {
  const own = seqArt(id);
  if (own) return own;
  const pool = poolOf(key);
  return pool.length ? pool[hash(id) % pool.length] : thumbFor(`arc:${id}`);
};
/** A Classic year shows its own footage's stills. */
const classicArt = (year: number, id: string) => {
  const pool = NAS?.classic?.stills.filter((p) => p.includes(`classic-${year}-`)) ?? [];
  return pool.length ? pool[hash(id) % pool.length] : undefined;
};
/**
 * 2025 Las Vegas broadcasts with their own footage: a 60 s cut and a still from the event's broadcast file on the NAS
 * (public/s25). `day` is the broadcast day the cut comes from.
 */
export const S25: Record<string, { key: string; day: number }> = {
  '2025-lv-3': { key: 'e3', day: 0 },
  '2025-lv-7': { key: 'e7', day: 1 },
  '2025-lv-19': { key: 'e19', day: 0 },
  '2025-lv-38': { key: 'e38', day: 1 },
  '2025-lv-46': { key: 'e46', day: 1 },
  '2025-lv-66': { key: 'e66', day: 2 },
  '2025-lv-main': { key: 'eme', day: 12 },
};
export const s25Still = (key: string) => `${import.meta.env.BASE_URL}s25/${key}.jpg`;
export const s25Clip = (key: string) => `${import.meta.env.BASE_URL}s25/${key}.mp4`;
const eventIdOf = (id: string) => id.replace(/^arc\./, '').replace(/\.h?\d+$/, '');
export const archiveArt = (id: string) => {
  const own = S25[eventIdOf(id)] ?? S25[id];
  if (own) return s25Still(own.key);
  const ref = INDEX.get(id) ?? INDEX.get(eventIdOf(id));
  return (ref?.year.classic && classicArt(ref.year.year, id)) || seriesArt(ref?.series.key ?? 'lv', id);
};
const CLASSIC_CLIP = NAS?.classic?.video;

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
  // A highlight carries its hashtag (the kind of hand), as the hand clips of this year do.
  if (clip) {
    const [slug, label] = HASHTAGS[hash(id) % HASHTAGS.length];
    tags.push({ slug, label });
  }
  return {
    id,
    kind: clip ? 'clip' : 'classic',
    title: clip ? `${event.name} · Highlight ${Number(n.slice(1)) + 1}` : `${event.name} · ${day!.label}`,
    subtitle: seriesTitle(year.year, series),
    description: clip ? `A highlight from the ${year.year} ${event.name}.` : `${day!.label} of the ${year.year} WSOP ${series.name} ${event.name}.`,
    thumb: archiveArt(id),
    thumbPos: '50% 50%',
    media: S25[event.id] ? { url: s25Clip(S25[event.id].key), start: 0 } : year.classic && CLASSIC_CLIP ? { url: CLASSIC_CLIP, start: 0 } : { url: FOOTAGE.ft.url, start: 40 + (hash(id) % 360) },
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

/**
 * Hashtags: the kind of hand (Michael's note: Browse is built on the year and the player; hashtags such as Bluff and
 * Hero call come on top of those two). The same slugs as the hand clips' tags.
 */
export const HASHTAGS: [string, string][] = [
  ['bluff', 'Bluff'],
  ['hero-call', 'Hero call'],
  ['cooler', 'Cooler'],
  ['bad-beat', 'Bad beat'],
  ['big-pot', 'Big pot'],
  ['winning-moment', 'Winning moment'],
];
export const hashtagLabel = (slug: string) => HASHTAGS.find((h) => h[0] === slug)?.[1];
/** Every archive highlight of a year (all its series). */
export const archiveHands = (year?: number) =>
  ARCHIVE.filter((y) => year == null || y.year === year).flatMap((y) => y.series.flatMap((s) => s.events.flatMap((e) => highlightsOf({ year: y, series: s, event: e }))));

/**
 * Bracelet legends: the all-time leaders in WSOP bracelets (WSOP.com, All-Time Bracelet Winners, 2026), with their
 * Main Event titles. `archive` lists the broadcasts in this archive they are known to be in (champion years, and
 * Erik Seidel as the 1988 runner-up); player-level tagging of the rest of the archive isn't done yet.
 */
export interface Legend {
  id: string;
  name: string;
  country: string;
  cc: string;
  bracelets: number;
  mainEvents: number[];
  note: string;
  archive: { eventId: string; role: string }[];
  /** The same person in this year's player data (Daniel Negreanu). */
  playerId?: string;
  hue: number;
}
const L = (id: string, name: string, country: string, cc: string, bracelets: number, mainEvents: number[], note: string, extra: Partial<Legend> = {}): Legend => ({
  id: `legend-${id}`,
  name,
  country,
  cc,
  bracelets,
  mainEvents,
  note,
  archive: mainEvents.filter((y) => INDEX.has(`${y}-lv-main`)).map((y) => ({ eventId: `${y}-lv-main`, role: 'Main Event champion' })),
  hue: hash(id) % 360,
  ...extra,
});
// Bracelet counts at the end of 2025 (the demo is set before the 2026 series): PokerNews player pages and 2025 reports.
export const LEGENDS: Legend[] = [
  L('hellmuth', 'Phil Hellmuth', 'United States', 'US', 17, [1989], 'The most WSOP bracelets of all time'),
  L('ivey', 'Phil Ivey', 'United States', 'US', 11, [], 'Second on the all-time bracelet list'),
  L('seidel', 'Erik Seidel', 'United States', 'US', 10, [], 'Runner-up to Johnny Chan in the 1988 Main Event', { archive: [{ eventId: '1988-lv-main', role: 'Main Event runner-up' }] }),
  L('brunson', 'Doyle Brunson', 'United States', 'US', 10, [1976, 1977], 'Back-to-back Main Event champion'),
  L('chan', 'Johnny Chan', 'United States', 'US', 10, [1987, 1988], 'Back-to-back Main Event champion'),
  L('mizrachi', 'Michael Mizrachi', 'United States', 'US', 8, [2025], '2025 Main Event and $50,000 Poker Players Championship'),
  L('deeb', 'Shaun Deeb', 'United States', 'US', 8, [], '2025 WSOP Player of the Year'),
  L('glaser', 'Benny Glaser', 'United Kingdom', 'GB', 8, [], 'Three bracelets in 2025'),
  L('moss', 'Johnny Moss', 'United States', 'US', 9, [1970, 1971, 1974], 'Three-time Main Event champion'),
  L('negreanu', 'Daniel Negreanu', 'Canada', 'CA', 7, [], 'Seven bracelets', { playerId: 'p04' }),
  L('schulman', 'Nick Schulman', 'United States', 'US', 7, [], '2025 $10,000 No-Limit 2-7 Championship'),
  L('seiver', 'Scott Seiver', 'United States', 'US', 7, [], '2024 WSOP Player of the Year'),
  L('arieh', 'Josh Arieh', 'United States', 'US', 7, [], 'Seven bracelets'),
  L('koon', 'Jason Koon', 'United States', 'US', 2, [], '2025 $50,000 High Roller'),
  L('tamayo', 'Jonathan Tamayo', 'United States', 'US', 1, [2024], 'Main Event champion 2024'),
  L('weinman', 'Daniel Weinman', 'United States', 'US', 2, [2023], 'Main Event champion 2023'),
  L('jorstad', 'Espen Jorstad', 'Norway', 'NO', 2, [2022], 'Main Event champion 2022'),
  L('moneymaker', 'Chris Moneymaker', 'United States', 'US', 1, [2003], 'Main Event champion 2003'),
];
export const legendById = (id: string) => LEGENDS.find((l) => l.id === id);

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
