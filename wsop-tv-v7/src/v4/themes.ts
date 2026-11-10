// v7 — themed collections that run themselves.
//
// A theme is a rule, not a hand-picked list: it reads the catalog, so new broadcasts and clips join the themes they
// fit as soon as they are published (the 2027 Main Event final table lands in "The Road to the Bracelet" on its own).
// A theme with too few videos stays off the page; a seasonal theme (`when`) is only on while its moment lasts.
//
// Operating it takes two things, both in this file:
//   1. Add a theme: one entry in THEMES (id, title, blurb, rule). Home's shelf and the theme page follow.
//   2. Pin the featured theme for a while (say, the Main Event during the series): set FEATURED_PIN.
// Otherwise the featured theme rotates by itself every Monday, and seasonal themes take the spot while they are on.
import { HERO_DAY_ID, classicEvents, dayById, events, isClassicEvent, seriesById } from '../data/mock';
import type { Day, TourEvent } from '../data/types';
import { catalog, highlightClips, type Video } from './catalog';

export interface Theme {
  id: string;
  title: string;
  /** One line under the title. */
  blurb: string;
  /** The videos, in the order to watch them. */
  rule: (now: number) => Video[];
  /** Only on while this holds (seasonal themes). */
  when?: (now: number) => boolean;
}

/** A theme needs at least this many videos to be shown. */
export const MIN_VIDEOS = 3;
/** Operator pin: a theme id to keep as the featured theme (until `until`, ISO date). null = rotate automatically. */
export const FEATURED_PIN: { id: string; until: string } | null = null;

// ---- what the rules read ----------------------------------------------------------------------------------------

const allEvents: TourEvent[] = [...events, ...classicEvents];
const eventOf = (v: Video) => allEvents.find((e) => e.id === v.eventId);
const dayOf = (v: Video): Day | undefined => (v.dayId ? dayById(v.dayId)?.day : undefined);
const startOf = (v: Video) => Date.parse(dayOf(v)?.start ?? '') || 0;
const isFullBroadcast = (v: Video) => v.kind === 'classic' || (v.kind === 'broadcast' && v.status === 'vod');
const isFinalTable = (v: Video) => v.kind === 'classic' || dayOf(v)?.label === 'Final Table';
const hasTag = (v: Video, slug: string) => v.tags.some((t) => t.slug === slug);
const currentSeries = () => seriesById(dayById(HERO_DAY_ID)!.event.seriesId);
const yearOf = (v: Video) => {
  const e = eventOf(v);
  return e ? Number((isClassicEvent(e) ? e.name : seriesById(e.seriesId).name).slice(0, 4)) : 0;
};

const broadcasts = () => catalog.filter(isFullBroadcast);
const newest = (a: Video, b: Video) => startOf(b) - startOf(a);
const mostWatched = (a: Video, b: Video) => b.views - a.views;
/** Different pictures side by side. */
const distinctPictures = (list: Video[]) => list.filter((v, i) => list.findIndex((x) => x.thumb === v.thumb && x.thumbPos === v.thumbPos) === i);
const clipsTagged = (slug: string) => highlightClips.filter((v) => hasTag(v, slug));

/** Days between two dates, ignoring the year (so July 14 is close to July 2 of any year). */
const daysApartInYear = (a: number, b: number) => {
  const day = (t: number) => {
    const d = new Date(t);
    return (Date.UTC(2001, d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2001, 0, 1)) / 864e5;
  };
  const diff = Math.abs(day(a) - day(b));
  return Math.min(diff, 365 - diff);
};

// ---- the themes ---------------------------------------------------------------------------------------------------

export const THEMES: Theme[] = [
  {
    id: 'final-tables',
    title: 'Greatest final tables',
    blurb: 'Classic and recent final tables, start to finish.',
    rule: () => distinctPictures(broadcasts().filter(isFinalTable).sort(mostWatched)),
  },
  {
    id: 'this-series',
    title: 'Final tables from this series',
    blurb: 'Every bracelet decided so far this summer, newest first.',
    when: (now) => inSeason(now),
    rule: () => broadcasts().filter((v) => isFinalTable(v) && eventOf(v)?.seriesId === currentSeries().id).sort(newest),
  },
  {
    id: 'main-event-day-by-day',
    title: 'Main Event, Day by Day',
    blurb: 'This year’s Main Event in order, from Day 1 to the final table.',
    when: (now) => inSeason(now),
    rule: () =>
      catalog
        .filter((v) => (v.kind === 'broadcast' && (v.status === 'vod' || v.status === 'live')) && eventOf(v)?.seriesId === currentSeries().id && /^Main Event/.test(eventOf(v)?.name ?? ''))
        .sort((a, b) => startOf(a) - startOf(b)),
  },
  {
    id: 'road-to-the-bracelet',
    title: 'The Road to the Bracelet',
    blurb: 'The Las Vegas Main Event, season by season, down to the bracelet.',
    // The Las Vegas Main Event only (not the Super Main Event or the Main Events of other stops).
    rule: () =>
      broadcasts()
        .filter((v) => {
          const e = eventOf(v);
          if (!e || !isFinalTable(v)) return false;
          return isClassicEvent(e) ? /\d{4} Main Event/.test(e.name) : seriesById(e.seriesId).city.startsWith('Las Vegas') && /^Main Event/.test(e.name);
        })
        .sort((a, b) => yearOf(b) - yearOf(a) || newest(a, b)),
  },
  {
    id: 'high-roller-nights',
    title: 'High Roller Nights',
    blurb: '$25,000 buy-ins and up. The biggest stakes in the building.',
    rule: () => broadcasts().filter((v) => (eventOf(v)?.buyIn ?? 0) >= 25_000).sort(newest),
  },
  {
    id: 'plo-and-mixed',
    title: 'PLO & Mixed Games',
    blurb: 'Four cards, eight games. For when Hold’em feels too simple.',
    rule: () => broadcasts().filter((v) => eventOf(v)?.game !== 'No-Limit Hold’em').sort(newest),
  },
  {
    id: 'this-time-of-year',
    title: 'This Day in WSOP History',
    blurb: 'Broadcasts from around this date in past WSOP seasons.',
    rule: (now) =>
      broadcasts()
        .filter((v) => yearOf(v) < new Date(now).getUTCFullYear() && daysApartInYear(startOf(v), now) <= 35)
        .sort((a, b) => yearOf(b) - yearOf(a)),
  },
  {
    id: 'one-hour-binge',
    title: 'The One-Hour Binge',
    blurb: 'The best hands back to back, about an hour in all.',
    rule: () => {
      const out: Video[] = [];
      let total = 0;
      for (const v of highlightClips) {
        if (total + v.durationSec > 3600) continue;
        out.push(v);
        total += v.durationSec;
      }
      return out;
    },
  },
  {
    id: 'mystery-and-millions',
    title: 'Mystery & Millions',
    blurb: 'Mystery bounties and millionaire makers: the events built for surprises.',
    rule: () => broadcasts().filter((v) => /mystery|millionaire|million\$/i.test(eventOf(v)?.name ?? '')).sort(newest),
  },
  { id: 'winning-moment', title: 'The Winning Moment', blurb: 'The last hand of the tournament, when the bracelet is decided.', rule: () => clipsTagged('winning-moment') },
  { id: 'monster-pots', title: 'Monster Pots', blurb: 'The pots everyone at the table remembers.', rule: () => clipsTagged('big-pot') },
  { id: 'legendary-bluffs', title: 'Legendary bluffs', blurb: 'Big lies, bigger pots.', rule: () => clipsTagged('bluff') },
  { id: 'hero-calls', title: 'Hero calls', blurb: 'One pair, one read, all the chips.', rule: () => clipsTagged('hero-call') },
  { id: 'coolers', title: 'Coolers, nowhere to hide', blurb: 'Big hands running into bigger ones.', rule: () => clipsTagged('cooler') },
  { id: 'bad-beats', title: 'Bad beats & comebacks', blurb: 'The hands nobody saw coming.', rule: () => clipsTagged('bad-beat') },
];

// ---- what's on ----------------------------------------------------------------------------------------------------

/**
 * Season mode: from the start of the series to two weeks after it ends, Home leads with live play and last night's
 * final tables; the rest of the year (off-season) it leads with the week's theme and the daily hand.
 */
export function inSeason(now = Date.now()) {
  const s = currentSeries();
  return now >= Date.parse(s.start) && now <= Date.parse(s.end) + 14 * 864e5;
}

/** Hand of the Day: one hand clip a day, the same for everyone that day, going through the best hands in turn. */
export function handOfTheDay(now = Date.now()): Video | undefined {
  const pool = highlightClips.filter((v) => !hasTag(v, 'winning-moment'));
  if (!pool.length) return undefined;
  return pool[Math.floor(now / 864e5) % pool.length];
}

/** Hands of the Week: the last seven days' hands of the day, today's first (one new hand joins each day). */
export function handsOfTheWeek(now = Date.now()): Video[] {
  const out: Video[] = [];
  for (let d = 0; d < 7; d++) {
    const v = handOfTheDay(now - d * 864e5);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export type LiveTheme = { theme: Theme; videos: Video[]; seasonal: boolean };

/** The themes on show right now: seasonal ones first (while on), then the rest, each with enough videos. */
export function activeThemes(now = Date.now()): LiveTheme[] {
  return THEMES.filter((t) => !t.when || t.when(now))
    .map((t) => ({ theme: t, videos: t.rule(now), seasonal: !!t.when }))
    .filter((x) => x.videos.length >= MIN_VIDEOS)
    .sort((a, b) => Number(b.seasonal) - Number(a.seasonal));
}

export function themeById(id: string, now = Date.now()): LiveTheme | undefined {
  const t = THEMES.find((x) => x.id === id);
  return t && { theme: t, videos: t.rule(now), seasonal: !!t.when };
}

/** Monday 00:00 UTC of the week `now` falls in. */
export const weekStart = (now: number) => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
};

/**
 * The featured theme: the operator's pin while it lasts; else a seasonal theme while it is on; else the next theme in
 * turn, changing every Monday. `skip` keeps a theme Home already shows elsewhere (Editor's pick) out of the spot.
 */
export function featuredTheme(now = Date.now(), skip: string[] = []): (LiveTheme & { why: 'pinned' | 'seasonal' | 'weekly' }) | undefined {
  const list = activeThemes(now).filter((x) => !skip.includes(x.theme.id));
  if (FEATURED_PIN && now < Date.parse(FEATURED_PIN.until)) {
    const p = list.find((x) => x.theme.id === FEATURED_PIN.id);
    if (p) return { ...p, why: 'pinned' };
  }
  const s = list.find((x) => x.seasonal);
  if (s) return { ...s, why: 'seasonal' };
  if (!list.length) return undefined;
  const week = Math.floor(weekStart(now) / (7 * 864e5));
  return { ...list[week % list.length], why: 'weekly' };
}
