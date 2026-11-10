// v8 — Browse, built on the WSOP archive (year → series → event → day):
//   Years (default): the years 2025 → 2003 (each with its Main Event champion), WSOP Classics after rights clearance;
//                    a year page has series tabs, its Main Event, then the bracelet events with filters.
//   Players: the player grid (sort) → a player page (profile, final tables by year, appearances by year).
//   Events: the events that come back every year → a chronicle of each, year by year.
//   The event page is where all three tabs land: its facts, the days that were broadcast, full broadcasts or highlights.
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/app';
import { Avatar, BraceletCount, Button, CountryCode, Icon, LiveTag, Page, Segmented, cx } from '../components/ui';
import { HERO_DAY_ID, classicEvents, events, players, seatsFor, seriesById } from '../data/mock';
import type { TourEvent } from '../data/types';
import { money } from '../lib/format';
import { TABLE_ART, VENUE_ART, WSOP_LOGO, artStyle } from '../lib/brand';
import { catalog, highlightClips, isLive, stageOf, videoById, type Video } from './catalog';
import { BadgeScope, VideoCard, rowGrid } from './detail';
import { HALL_OF_FAME } from './halloffame';
import { DaySchedule, EventRows, EventTile, OtherYearsSection, archiveItem, liveItem, newestFirst, otherYears, playerLink, scheduleOrder, type EventItem } from './loop';
import { ARCHIVE, CLASSIC_RANGE, RECURRING, archiveArt, archiveEvent, broadcastsOf, chronicle, fmtBuyIn, highlightsOf, seriesArt, seriesTitle, LEGENDS, legendById, type ArchiveEvent, type Legend, type SeriesKey } from './archive';

/** The demo's live series: the 2025 World Series of Poker in Las Vegas, reconstructed from the real broadcasts. */
const CURRENT_YEAR = 2025;

// ---- shared bits -------------------------------------------------------------------------------------

/** Browse is built on two things, the year and the player. (Hashtags are an advanced feature, left out for now.) */
export function BrowseTabs({ tab }: { tab: 'years' | 'players' }) {
  const tabs = [
    ['/videos', 'Years', 'years'],
    ['/videos/players', 'Players', 'players'],
  ] as const;
  return (
    <>
      <nav className="mt-4 flex gap-6 border-b border-line" aria-label="Browse">
        {tabs.map(([to, label, k]) => (
          <Link key={k} to={to} aria-current={tab === k ? 'page' : undefined} className={cx('-mb-px border-b-[3px] pb-2.5 text-[15px] font-semibold', tab === k ? 'border-gold text-text' : 'border-transparent text-muted hover:text-text')}>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

const back = (to: string, label: string) => (
  <Link to={to} className="text-sm text-muted hover:text-text">
    ← {label}
  </Link>
);

/** Enter full screen (inside the click) and play the video straight away. */
const enterFullScreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
};
const playsFull = (v: Video) => ({ href: `/watch/${v.id}?play=1`, onOpen: enterFullScreen });

const daysNote = (n: number) => `${n} broadcast${n === 1 ? '' : 's'}`;
const eventsNote = (n: number) => `${n} event${n === 1 ? '' : 's'}`;

// ---- Years -----------------------------------------------------------------------------------------

/** What a year holds: its events and broadcasts (all series). */
const yearSize = (y: (typeof ARCHIVE)[number]) => {
  const evs = y.series.flatMap((s) => s.events);
  const casts = evs.reduce((n, e) => n + e.days.length, 0);
  return { events: evs.length, casts, line: `${evs.length} event${evs.length === 1 ? '' : 's'} · ${casts} broadcast${casts === 1 ? '' : 's'}` };
};

/** Years before this one shown as full season tiles; older ones are listed compactly by decade. */
const RECENT_FROM = 2019;

/** Every season from the archive (not the Classics), newest first, with what it holds. Home's Seasons row uses it too. */
export const pastSeasons = () => ARCHIVE.filter((y) => !y.classic && y.year < CURRENT_YEAR).map((y) => ({ year: y.year, line: eventsNote(yearSize(y).events) }));

/**
 * A season as type-only key art: the WSOP mark, the year large (and again, outlined, cropped at the corner) and what
 * it holds. No broadcast still, so no two tiles look alike. Shared by Home's Seasons row and Browse.
 */
export function SeasonTile({ year, line, live, big }: { year: number; line: string; live?: boolean; big?: boolean }) {
  return (
    <Link
      to={`/videos/year/${year}`}
      className={cx(
        'group relative block overflow-hidden rounded-card border border-white/10 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(212,175,55,0.20),transparent_60%),linear-gradient(160deg,#1a1712,#0b0b0b)] transition-colors hover:border-white/40',
        big ? 'aspect-[16/7] sm:aspect-[16/5]' : 'aspect-video',
      )}
      aria-label={`${year} World Series of Poker · ${line}`}
    >
      <span
        aria-hidden
        className={cx(
          'pointer-events-none absolute leading-none font-black tracking-tighter text-transparent transition-transform duration-300 [-webkit-text-stroke:1px_rgba(212,175,55,0.3)] group-hover:-translate-y-1',
          big ? '-right-[2%] -bottom-[24%] text-[9rem] sm:text-[14rem]' : '-right-[4%] -bottom-[30%] text-[5.5rem] sm:text-[6.5rem]',
        )}
      >
        {year}
      </span>
      <span className={cx('absolute inset-0 flex flex-col justify-between', big ? 'p-5 sm:p-7' : 'p-3')}>
        <span className="flex items-center gap-2">
          <img src={WSOP_LOGO} alt="" className={cx('w-auto opacity-90', big ? 'h-6 sm:h-7' : 'h-4 sm:h-5')} />
          {live && <LiveTag />}
        </span>
        <span>
          <span className={cx('block leading-none font-black text-white', big ? 'text-5xl sm:text-7xl' : 'text-2xl sm:text-[1.7rem]')}>{year}</span>
          <span className={cx('mt-1.5 block group-hover:text-text', big ? 'text-sm text-text/80 sm:text-base' : 'text-xs text-muted')}>{line}</span>
        </span>
      </span>
    </Link>
  );
}

/**
 * This year, at the top of Years: the season's type art beside the live Main Event picture (or the year's latest
 * broadcast); one button to watch, the rest of the card opens the year.
 */
function ThisYearCard() {
  const { state } = useApp();
  const live = catalog.find((v) => v.eventId === 'lv-main' && isLive(v, state.streamMode));
  const latest = live ?? catalog.filter((v) => v.kind === 'broadcast' && v.status === 'vod' && seriesById(events.find((e) => e.id === v.eventId)?.seriesId ?? '')?.name.startsWith(String(CURRENT_YEAR))).sort((a, b) => b.views - a.views)[0];
  const evs = currentYear().flatMap((s) => s.events);
  const watch = latest && (live ? `/watch/${latest.id}` : `/watch/${latest.id}?play=1`);
  return (
    <div className="grid overflow-hidden rounded-panel border border-white/10 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(212,175,55,0.18),transparent_60%),linear-gradient(160deg,#1a1712,#0b0b0b)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -bottom-[18%] -left-[2%] text-[10rem] leading-none font-black tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(212,175,55,0.22)] sm:text-[13rem]">
          {CURRENT_YEAR}
        </span>
        <span className="relative flex items-center gap-2">
          <img src={WSOP_LOGO} alt="" className="h-6 w-auto sm:h-7" />
          {live && <LiveTag />}
        </span>
        <div className="relative">
          <h2 className="text-5xl leading-none sm:text-6xl">
            <Link to={`/videos/year/${CURRENT_YEAR}`} className="hover:underline hover:decoration-2 hover:underline-offset-4">
              {CURRENT_YEAR}
            </Link>
          </h2>
          <p className="mt-2 text-[15px] text-text/85">{live ? 'The Main Event final table is on air now' : 'This year · live and on demand'}</p>
          <p className="mt-1 text-sm text-muted tnum">
            {currentYear().map((s) => s.name).join(' · ')} · {evs.length} events
          </p>
          {watch && (
            <Link to={watch} onClick={live ? undefined : enterFullScreen} className="mt-5 inline-block">
              <Button variant="primary" tabIndex={-1}>
                <Icon name="play" size={16} /> {live ? 'Watch live' : 'Watch'}
              </Button>
            </Link>
          )}
        </div>
      </div>
      <Link to={`/videos/year/${CURRENT_YEAR}`} className="group relative block aspect-video overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-72">
        <img src={latest?.thumb ?? TABLE_ART[0].src} style={artStyle({ pos: latest?.thumbPos ?? TABLE_ART[0].pos, fit: latest?.thumbFit })} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
      </Link>
    </div>
  );
}

/**
 * Years, as F1 TV's archive: this year large, then every season as a photo tile (a picture of play with the year
 * large on it, and a line under it), recent seasons first, the older ones by decade, then the Classics (one broadcast
 * a year, so their tile plays it straight away).
 */
export function YearsTab() {
  const modern = ARCHIVE.filter((y) => !y.classic && y.year < CURRENT_YEAR);
  const recent = modern.filter((y) => y.year >= RECENT_FROM);
  const older = modern.filter((y) => y.year < RECENT_FROM);
  const decades = [...new Set(older.map((y) => Math.floor(y.year / 10) * 10))].sort((a, b) => b - a);
  const classics = ARCHIVE.filter((y) => y.classic);
  const tile = (y: (typeof ARCHIVE)[number], i: number) => {
    const main = y.series.find((s) => s.key === 'lv')?.events.find((e) => e.kind === 'Main Event') ?? y.series[0]?.events[0];
    const ref = main ? archiveEvent(main.id) : undefined;
    const first = ref ? broadcastsOf(ref)[0] : undefined;
    const size = yearSize(y);
    // Classics: their own still and one broadcast (plays at once). Other years: a crop of real play, graphics left out.
    const own = CLASSIC_STILLS.find((x) => x.startsWith(String(y.year)));
    const art = y.classic ? (own ? `${import.meta.env.BASE_URL}classics/classic-${own.slice(0, 4)}-${own.slice(4)}.jpg` : main ? archiveArt(main.id) : '') : `${import.meta.env.BASE_URL}crops/${CROP_POOL[i % CROP_POOL.length]}.jpg`;
    return (
      <li key={y.year} className="min-w-0">
        <YearPhotoTile
          year={y.year}
          art={art}
          to={y.classic && first ? `/watch/${first.id}?play=1` : `/videos/year/${y.year}`}
          play={!!(y.classic && first)}
          line={y.classic ? 'Main Event · Full broadcast' : `${eventsNote(size.events)} · ${daysNote(size.casts)}`}
        />
      </li>
    );
  };
  const row = (list: typeof ARCHIVE, offset = 0) => <ul className={yearRowGrid}>{list.map((y, i) => tile(y, i + offset))}</ul>;
  return (
    <>
      <section aria-label="This year" className="mt-6">
        <ThisYearCard />
      </section>

      <section aria-label="Recent seasons" className="mt-10">
        <h2 className="text-xl sm:text-2xl">Recent seasons</h2>
        {row(recent)}
      </section>

      {decades.map((d, di) => {
        const ys = older.filter((y) => Math.floor(y.year / 10) * 10 === d);
        // The years the archive holds (2018 – 2010, 2009 – 2003), newest first, as F1 TV heads its decades.
        const label = `${ys[0].year} – ${ys[ys.length - 1].year}`;
        return (
          <section key={d} aria-label={label} className="mt-10">
            <h2 className="text-xl sm:text-2xl tnum">{label}</h2>
            {row(ys, (di + 1) * 5)}
          </section>
        );
      })}

      {/* WSOP Classics: the Main Event broadcasts from Binion's Horseshoe, 1973 – 2002. */}
      {classics.length > 0 && (
        <section aria-label="WSOP Classics" className="mt-10">
          <h2 className="text-xl sm:text-2xl">WSOP Classics</h2>
          <p className="mt-1 text-sm text-muted tnum">{CLASSIC_RANGE} · Binion’s Horseshoe · the Main Event, as it was broadcast</p>
          {row(classics)}
        </section>
      )}
    </>
  );
}

/** The Classics' own broadcast stills (public/classics, from the NAS: classic-<year>-<a|b>.jpg), first per year. */
const CLASSIC_STILLS = '1973a 1978a 1979a 1981a 1983a 1987a 1988a 1989a 1990a 1991a 1992a 1993a 1994a 1995a 1997a 1998a 1999b 2000a 2001b 2002a'.split(' ');
/** Graphic-free crops of real play (public/crops) for the tiles of years without a picture of their own. */
const CROP_POOL = ['lv-hr', 'classic-a1', 'lv-hu', 'classic-a4', 'lv-plo', 'classic-a3', 'lv-mmm', 'lv-ms', 'classic-a2', 'lv-ppc', 'lv-seniors', 'lv-ladies'];
const yearRowGrid = 'hscroll mt-4 gap-3 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*0.75rem)/3)] lg:[&>*]:w-[calc((100%-3*0.75rem)/4)]';

/** A season as F1 TV draws one: the picture, the year large across it, and what it holds underneath. */
function YearPhotoTile({ year, art, to, line, play }: { year: number; art: string; to: string; line: string; play?: boolean }) {
  return (
    <Link to={to} onClick={play ? enterFullScreen : undefined} className="group block">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={art} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-80 transition-transform duration-200 group-hover:scale-[1.04]" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" aria-hidden />
        <span className="absolute inset-0 grid place-items-center">
          <span className="font-display text-6xl leading-none text-white/95 tnum drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-7xl">{year}</span>
        </span>
        {play && (
          <span className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-white/90 text-black" aria-hidden>
            <Icon name="play" size={14} />
          </span>
        )}
      </span>
      <span className="mt-2 flex items-center gap-2">
        <img src={WSOP_LOGO} alt="" className="h-3.5 w-auto opacity-80" />
        <span className="font-semibold group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">{year} Season</span>
      </span>
      <span className="mt-0.5 block text-xs text-muted">{line}</span>
    </Link>
  );
}

/** The current year comes from the live data (its events open the event page of the live service). */
function currentYear() {
  const ofSeries = (sid: string) => events.filter((e) => e.seriesId === sid);
  const series = [
    { key: 'lv', name: 'Las Vegas', events: ofSeries('lv25') },
  ].filter((s) => s.events.length);
  return series;
}

/** An event as a card: the buy-in large (type, no still), then the name, the game and what there is to watch. */
type EventCardData = { id: string; to: string; name: string; number: number | null; buyLabel: string; game: string; days: number; live?: boolean };

/**
 * A year (like an F1 season): its series as cards (Las Vegas, Europe, Paradise, Circuit). A series (like a race
 * weekend): the Main Event, its days, the final tables, the hands, interviews and features (planned), every bracelet
 * event. A year with one series opens that series straight away.
 */
export function YearPage() {
  const { year = '', series: seriesKey } = useParams();
  const y = Number(year);
  const {
    state: { streamMode },
  } = useApp();
  const isCurrent = y === CURRENT_YEAR;
  // This year is the live series (its archive entry, if any, would show results that have not happened yet).
  const arch = isCurrent ? undefined : ARCHIVE.find((x) => x.year === y);
  if (!isCurrent && !arch) return <Navigate to="/videos" replace />;

  // One shape for both: the live year (mock data) and archive years.
  type Card = EventCardData & { art: string; buyIn: number; kind: string; video?: string; finalTable?: Video };
  const seriesList: { key: string; name: string; cards: Card[] }[] = isCurrent
    ? currentYear().map((s) => ({
        key: s.key,
        name: s.name,
        cards: s.events.map((e: TourEvent) => {
          const v = catalog.find((x) => x.eventId === e.id && x.kind === 'broadcast');
          const ft = catalog.find((x) => x.eventId === e.id && x.kind === 'broadcast' && stageOf(x) === 'Final Table' && (x.status === 'vod' || isLive(x, streamMode)));
          return {
            id: e.id,
            to: `/events/${e.id}`,
            // Stills of the series' own look (the live Main Event keeps its broadcast picture).
            art: e.days.some((d) => d.id === HERO_DAY_ID) ? (v?.thumb ?? VENUE_ART[0].src) : seriesArt(s.key as SeriesKey, e.id),
            video: catalog.find((x) => x.eventId === e.id && isLive(x, streamMode))?.id,
            finalTable: ft,
            name: e.name.replace(' World Championship', ''),
            number: e.number,
            buyIn: e.buyIn,
            buyLabel: e.buyIn ? money(e.buyIn) : '',
            game: e.game,
            kind: /main event/i.test(e.name) ? 'Main Event' : e.buyIn >= 25000 ? 'High Roller' : /championship/i.test(e.name) ? 'Championship' : 'Open',
            days: e.days.filter((d) => d.status !== 'upcoming').length,
            live: e.days.some((d) => d.id === HERO_DAY_ID || d.status === 'live'),
          };
        }),
      }))
    : arch!.series.map((s) => ({
        key: s.key,
        name: s.name,
        cards: s.events.map((e: ArchiveEvent) => {
          const ref = archiveEvent(e.id)!;
          const all = broadcastsOf(ref);
          const fi = e.days.findIndex((d) => /final/i.test(d.label));
          return {
            id: e.id,
            to: `/videos/event/${e.id}`,
            art: archiveArt(e.id),
            name: e.name,
            number: e.number,
            buyIn: e.currency === '$' ? e.buyIn : Math.round(e.buyIn * 1.1),
            buyLabel: fmtBuyIn(e),
            game: e.game,
            kind: e.kind,
            days: e.days.length,
            video: all[all.length - 1]?.id,
            finalTable: fi >= 0 ? all[fi] : undefined,
          };
        }),
      }));

  const titleOf = (s: { name: string }) => (s.name === 'Las Vegas' ? `${y} World Series of Poker` : `${y} WSOP ${s.name}`);
  const castsOf = (s: { cards: Card[] }) => s.cards.reduce((n, c) => n + c.days, 0);
  const lineOf = (s: { cards: Card[] }) => `${s.cards.length} event${s.cards.length === 1 ? '' : 's'} · ${daysNote(castsOf(s))}`;

  // ---- a season page, as F1 TV lays out a season: the headline (the Main Event), the other series of the year, the
  // events in schedule order as tiles, the hands, then interviews and features (planned). The year opens its main
  // series (Las Vegas); the others have their own page with the same layout. ----
  const current = (seriesKey ? seriesList.find((s) => s.key === seriesKey) : (seriesList.find((s) => s.key === 'lv') ?? seriesList[0]));
  if (!current) return <Navigate to={`/videos/year/${y}`} replace />;
  const isMainSeries = current === (seriesList.find((s) => s.key === 'lv') ?? seriesList[0]);
  if (seriesKey && isMainSeries) return <Navigate to={`/videos/year/${y}`} replace />;
  const siblings = seriesList.filter((s) => s !== current);
  const main = current.cards.find((c) => c.kind === 'Main Event');
  const others = current.cards.filter((c) => c !== main);
  const archSeries = arch?.series.find((x) => x.key === current.key);
  const tiles: EventItem[] = others
    .map((c) => (isCurrent ? liveItem(events.find((e) => e.id === c.id)!) : archiveItem(y, archSeries!, archSeries!.events.find((e) => e.id === c.id)!)))
    .sort(scheduleOrder);
  const ids = new Set(current.cards.map((c) => c.id));
  const hands: Video[] = isCurrent
    ? highlightClips.filter((v) => v.eventId && ids.has(v.eventId))
    : current.cards.flatMap((c) => {
        const ref = archiveEvent(c.id);
        return ref ? highlightsOf(ref) : [];
      });
  const mainHref = main && (main.live && main.video ? `/watch/${main.video}` : main.video ? `/watch/${main.video}?play=1` : main.to);
  const playable = (v: Video) => (isLive(v, streamMode) ? {} : playsFull(v));
  return (
    <Page className="max-w-[96rem]">
      {back(isMainSeries ? '/videos' : `/videos/year/${y}`, isMainSeries ? 'Years' : `${y} season`)}
      <p className="mt-3 text-xs font-bold tracking-wide text-gold-strong uppercase">{isMainSeries ? `${y} season` : current.name}</p>
      <h1 className="mt-1 text-title">{titleOf(current)}</h1>
      {arch?.classic && <p className="mt-1 text-xs font-bold tracking-wide text-gold-strong uppercase">WSOP Classics · Binion’s Horseshoe</p>}
      <p className="mt-1 text-sm text-muted tnum">{isCurrent ? `${lineOf(current)} · live and on demand` : lineOf(current)}</p>

      {/* The headline (F1 TV's season review): the Main Event. One button to watch; the title opens the event. */}
      {main && (
        <section aria-label="Main Event" className="mt-6">
          <div className="grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Link to={mainHref!} onClick={main.live ? undefined : enterFullScreen} className="group relative block aspect-video overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-80">
              <img src={main.art} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              {main.live && <LiveTag className="absolute top-3 left-3" />}
            </Link>
            <div className="flex flex-col justify-center p-6 lg:p-8">
              <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">
                Main Event{main.number != null && main.number > 0 && ` · Event #${main.number}`}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl">
                <Link to={main.to} className="hover:underline hover:decoration-2 hover:underline-offset-4">
                  {main.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted">{[main.buyLabel, main.game, daysNote(main.days)].filter(Boolean).join(' · ')}</p>
              {arch?.champion && current.key === 'lv' ? (
                <p className="mt-4 text-[15px]">
                  Champion · {playerLink(arch.champion.name) ? <Link to={playerLink(arch.champion.name)!} className="font-semibold text-gold-strong hover:underline">{arch.champion.name}</Link> : <span className="font-semibold">{arch.champion.name}</span>} <CountryCode cc={arch.champion.cc} />
                </p>
              ) : (
                main.live && <p className="mt-4 text-[15px] font-semibold">The final table is on air now</p>
              )}
              {main.video && (
                <div className="mt-6">
                  <Link to={mainHref!} onClick={main.live ? undefined : enterFullScreen}>
                    <Button variant="primary" tabIndex={-1}>
                      <Icon name="play" size={16} /> {main.live ? 'Watch live' : arch?.classic ? 'Watch the broadcast' : 'Watch the final table'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* The other series of the year (F1 TV's F2 / F3 tiles). */}
      {siblings.length > 0 && (
        <section aria-label={`Also in ${y}`} className="mt-10">
          <h2 className="text-xl sm:text-2xl">Also in {y}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {siblings.map((s) => {
              const isMain = s === (seriesList.find((x) => x.key === 'lv') ?? seriesList[0]);
              return (
                <li key={s.key} className="min-w-0">
                  <Link
                    to={isMain ? `/videos/year/${y}` : `/videos/year/${y}/${s.key}`}
                    className="flex h-full flex-col justify-between gap-6 rounded-card border border-white/10 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(212,175,55,0.16),transparent_60%),linear-gradient(160deg,#1a1712,#0b0b0b)] p-4 transition-colors hover:border-white/40"
                  >
                    <img src={WSOP_LOGO} alt="" className="h-4 w-auto self-start opacity-90" />
                    <span>
                      <span className="block font-bold">{titleOf(s)}</span>
                      <span className="mt-0.5 block text-xs text-muted tnum">{lineOf(s)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* The events in schedule order (F1 TV's Grand Prix grid), each opening its event page. */}
      {tiles.length > 0 && (
        <section aria-label="Events" className="mt-10">
          <h2 className="text-xl sm:text-2xl">{y} {current.name === 'Las Vegas' ? 'WSOP' : current.name} events</h2>
          <p className="mt-1 text-sm text-muted">In schedule order</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tiles.map((x) => (
              <li key={x.id} className="min-w-0">
                <EventTile x={x} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <SeriesRow title="Highlights" videos={hands} play={playable} />
      {SHOW_PLANNED && (
        <>
          <PlannedRow title="Interviews" what="Winner interviews and press conferences" />
          <PlannedRow title="Features" what="Documentaries, player stories and behind the scenes" />
        </>
      )}
    </Page>
  );
}

/**
 * Interviews and Features are planned sections: the archive holds no such videos yet. For the design review they show
 * as marked empty slots (no invented videos); set false to hide them until there is content.
 */
const SHOW_PLANNED = true;

/** A row of a series page: its videos sideways, each playing straight away (live ones open their player). */
function SeriesRow({ title, videos, play }: { title: string; videos: Video[]; play: (v: Video) => { href?: string; onOpen?: () => void } }) {
  if (!videos.length) return null;
  return (
    <section aria-label={title} className="mt-10">
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      <ul className="hscroll mt-4 gap-4 [&>*]:w-[78%] sm:[&>*]:w-[calc((100%-1rem)/2)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
        <BadgeScope videos={videos}>
          {videos.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard v={v} {...play(v)} />
            </li>
          ))}
        </BadgeScope>
      </ul>
    </section>
  );
}

/** A planned section with no content yet: dashed slots, clearly marked, so the layout can be reviewed. */
function PlannedRow({ title, what }: { title: string; what: string }) {
  return (
    <section aria-label={title} className="mt-10">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        <span className="rounded-full border border-dashed border-white/30 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-muted uppercase">Planned · no source yet</span>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className={cx('min-w-0', i > 1 && 'hidden lg:block')}>
            <div className="grid aspect-video place-items-center rounded-card border border-dashed border-white/20 bg-white/[0.02] p-4 text-center">
              <span className="text-xs text-muted">{what}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- Players ---------------------------------------------------------------------------------------

type Sort = 'bracelets' | 'name';
/** Players: the bracelet legends (all-time leaders, WSOP records), real players only; sort. */
export function PlayersTab() {
  const [sort, setSort] = useState<Sort>('bracelets');
  // No search on Browse for now: every player is listed.
  const match = (name: string) => !!name;
  const order = <T extends { name: string; bracelets: number }>(a: T, b: T) => (sort === 'name' ? a.name.localeCompare(b.name) : b.bracelets - a.bracelets || a.name.localeCompare(b.name));
  const legends = LEGENDS.filter((l) => match(l.name)).sort(order);
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Sort players"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'bracelets', label: 'Bracelets' },
            { value: 'name', label: 'Name' },
          ]}
        />
      </div>
      {/* Poker Hall of Fame (WSOP.com's list), by class, newest first. */}
      <section aria-label="Poker Hall of Fame" className="mt-8">
        <h2 className="text-xl sm:text-2xl">Poker Hall of Fame</h2>
        <p className="mt-1 text-sm text-muted">Inducted since 1979 · WSOP.com</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {HALL_OF_FAME.map((x) => {
            const body = (
              <span className="flex h-full flex-col justify-between gap-4 rounded-card border border-line bg-surface p-4">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-display text-2xl leading-none tnum">{x.year}</span>
                  <span className="text-xs font-semibold text-muted">{x.cc}</span>
                </span>
                <span className="line-clamp-2 text-sm leading-snug font-bold group-hover:text-gold-strong">{x.name}</span>
              </span>
            );
            return (
              <li key={x.name} className="min-w-0">
                {x.to ? (
                  <Link to={x.to} className="group block h-full [&>span]:hover:border-white/40">
                    {body}
                  </Link>
                ) : (
                  <div className="h-full">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {legends.length > 0 && (
        <section aria-label="Bracelet legends" className="mt-10">
          <h2 className="text-xl sm:text-2xl">Bracelet legends</h2>
          <p className="mt-1 text-sm text-muted">The most WSOP bracelets of all time</p>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {legends.map((l) => (
              <li key={l.id}>
                <LegendCard l={l} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Only real players here: the demo's own players are made up, so they are not listed. */}
    </>
  );
}

/** A bracelet legend: initials, name, bracelets, Main Event titles. */
function LegendCard({ l, compact }: { l: Legend; compact?: boolean }) {
  const photo = l.playerId ? players.find((p) => p.id === l.playerId)?.photo : undefined;
  return (
    <Link to={`/videos/players/${l.playerId ?? l.id}`} className="group flex h-full flex-col items-center rounded-card border border-line bg-surface p-4 text-center hover:border-line-strong hover:bg-surface-2">
      <Avatar name={l.name} hue={l.hue} size={compact ? 56 : 64} photo={photo} />
      <span className="mt-3 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-gold-strong">{l.name}</span>
      <span className="mt-1.5 text-sm">
        <BraceletCount n={l.bracelets} size={14} />
      </span>
      <span className="mt-1 text-[11px] text-muted tnum">{l.mainEvents.length ? `Main Event ${l.mainEvents.join(', ')}` : l.country}</span>
    </Link>
  );
}

/** A player: profile, final tables by year, appearances (broadcasts and highlights) by year. */
export function PlayerPage() {
  const { playerId = '' } = useParams();
  const legend = legendById(playerId);
  if (legend) return <LegendPage l={legend} />;
  const p = players.find((x) => x.id === playerId);
  if (!p) return <Navigate to="/videos/players" replace />;
  const finals = p.recent
    .map((r) => ({ r, e: events.find((e) => e.id === r.eventId) }))
    .filter((x): x is { r: (typeof p.recent)[number]; e: TourEvent } => !!x.e);
  const asLegend = LEGENDS.find((l) => l.playerId === p.id);
  // The loop: their seat at the live final table, and every event they made the final table of (live series and
  // classics) as event rows, newest first, with their place where it isn't a win.
  const seats = seatsFor(HERO_DAY_ID);
  const seat = seats.find((s) => s.playerId === p.id);
  const seatRank = seat ? seats.indexOf(seat) + 1 : 0;
  const results: EventItem[] = [
    // Their own place goes in the event line when it isn't a win; the winner stays the event's real winner.
    ...finals.map(({ r, e }) => {
      const x = liveItem(e);
      return r.place === 1 ? x : { ...x, name: `${x.name} · ${r.place}${r.place === 2 ? 'nd' : r.place === 3 ? 'rd' : 'th'} place` };
    }),
    ...classicEvents.filter((e) => e.winnerId === p.id).map((e) => ({ ...liveItem(e), to: `/watch/${e.days[0].id}`, name: e.name.replace(/^\d{4} /, ''), year: Number(e.name.slice(0, 4)) })),
  ].sort(newestFirst);
  const yearOfEvent = (e: TourEvent) => Number(seriesById(e.seriesId).name.match(/\d{4}/)?.[0] ?? CURRENT_YEAR);
  const byYear = [...new Set(finals.map((x) => yearOfEvent(x.e)))]
    .sort((a, b) => b - a)
    .map((y) => ({ y, rows: finals.filter((x) => yearOfEvent(x.e) === y).sort((p1, p2) => p1.r.place - p2.r.place) }));
  return (
    <Page className="max-w-[96rem]">
      {back('/videos/players', 'Players')}
      <header className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={p.name} hue={p.hue} size={96} photo={p.photo} ring />
        <div>
          <h1 className="text-title">{p.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {p.country} <CountryCode cc={p.cc} />
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2">
              <dt className="text-muted">Bracelets</dt>
              <dd>
                {p.bracelets != null ? <BraceletCount n={p.bracelets} /> : <span className="text-muted">—</span>}
              </dd>
            </div>
          </dl>
          {asLegend && <p className="mt-2 text-xs font-bold tracking-wide text-gold-strong uppercase">Bracelet legend</p>}
        </div>
      </header>

      {/* At the live Main Event final table right now: straight back to the broadcast (the loop: player → video). */}
      {seat && (
        <Link to={`/watch/${HERO_DAY_ID}`} className="mt-8 flex flex-wrap items-center gap-4 rounded-panel border border-line bg-surface p-4 hover:border-white/40">
          <LiveTag />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">At the Main Event final table now</span>
            <span className="block text-sm text-muted tnum">
              {(seat.stack / 1e6).toFixed(1)}M chips · {seatRank} of {seats.length} in chips
            </span>
          </span>
          <Button variant="primary" tabIndex={-1}>
            <Icon name="play" size={16} /> Watch live
          </Button>
        </Link>
      )}

      {/* Results (WSOP records): a row per event, newest first; play its final table, open the event, follow its winner. */}
      {results.length > 0 && (
        <section aria-label="Results as rows" className="mt-10">
          <h2 className="text-xl sm:text-2xl">Results</h2>
          <div className="mt-4">
            <EventRows items={results} showYear />
          </div>
        </section>
      )}
      <section aria-label="Results" className="mt-10" hidden={results.length > 0}>
        <h2 className="text-xl sm:text-2xl">Results</h2>
        {byYear.length ? (
          byYear.map(({ y, rows }) => (
            <div key={y} className="mt-5">
              <h3 className="font-display text-lg tnum">{y}</h3>
              <ul className="mt-2 divide-y divide-line rounded-panel border border-line bg-surface">
                {rows.map(({ r, e }) => (
                  <li key={r.eventId}>
                    <Link to={`/events/${e.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold group-hover:text-gold-strong">{e.name.replace(' World Championship', '')}</span>
                        <span className="block truncate text-xs text-muted">{seriesById(e.seriesId).name}</span>
                      </span>
                      <span className={cx('text-sm font-semibold', r.place === 1 && 'text-gold-strong')}>{r.place === 1 ? 'Winner' : `Final table · #${r.place}`}</span>
                      <span className="hidden w-24 text-right text-sm text-muted tnum sm:block">{money(r.prize)}</span>
                      <Icon name="chevron" size={16} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="mt-3 text-sm text-muted">No final tables on record yet.</p>
        )}
      </section>
    </Page>
  );
}

/** A bracelet legend: bracelets and Main Event titles (WSOP records), and the broadcasts of this archive they are in. */
function LegendPage({ l }: { l: Legend }) {
  // From the WSOP record: Main Event titles, and the other Main Event final tables noted (Seidel, 1988 runner-up).
  const results = [
    ...l.mainEvents.map((y) => ({ y, label: 'Winner', winner: true })),
    ...l.archive.filter((a) => !/champion/i.test(a.role)).map((a) => ({ y: Number(a.eventId.slice(0, 4)), label: 'Final table · #2', winner: false })),
  ].sort((x, z) => z.y - x.y);
  return (
    <Page className="max-w-[96rem]">
      {back('/videos/players', 'Players')}
      <header className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={l.name} hue={l.hue} size={96} ring />
        <div>
          <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">Bracelet legend</p>
          <h1 className="mt-1 text-title">{l.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {l.country} <CountryCode cc={l.cc} /> · {l.note}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2">
              <dt className="text-muted">Bracelets</dt>
              <dd>
                <BraceletCount n={l.bracelets} />
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">Main Event titles</dt>
              <dd className="font-semibold tnum">{l.mainEvents.length ? l.mainEvents.join(' · ') : '—'}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section aria-label="Results" className="mt-10">
        <h2 className="text-xl sm:text-2xl">Results</h2>
        {results.length ? (
          <ul className="mt-3 divide-y divide-line rounded-panel border border-line bg-surface">
            {results.map(({ y, label, winner }) => {
              const ref = archiveEvent(`${y}-lv-main`);
              const row = (
                <>
                  <span className={cx('w-14 font-display text-2xl tnum', !ref && 'text-muted')}>{y}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">Main Event</span>
                    <span className="block truncate text-xs text-muted">{y} WSOP Las Vegas</span>
                  </span>
                  <span className={cx('text-sm font-semibold', winner && 'text-gold-strong')}>{label}</span>
                </>
              );
              return (
                <li key={`${y}-${label}`}>
                  {ref ? (
                    <Link to={`/videos/event/${ref.event.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                      {row}
                      <Icon name="chevron" size={16} className="text-muted" />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-4 px-4 py-3">
                      {row}
                      <span className="w-4" aria-hidden />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No Main Event final tables on record here yet.</p>
        )}
      </section>
    </Page>
  );
}

// ---- Events ----------------------------------------------------------------------------------------

/** Events: the events that come back every year (Main Event, PPC, Millionaire Maker …), each with its years. */
export function EventsTab() {
  const list = RECURRING.map((r) => ({ r, years: chronicle(r.slug) })).filter((x) => x.years.length);
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(({ r, years }) => (
        <li key={r.slug}>
          <Link to={`/videos/events/${r.slug}`} className="group flex gap-4 rounded-card border border-line bg-surface p-3 hover:border-line-strong hover:bg-surface-2">
            <img src={archiveArt(years[0].event.id)} alt="" loading="lazy" className="aspect-video w-32 shrink-0 rounded-card object-cover" />
            <span className="min-w-0">
              <span className="block font-semibold group-hover:text-gold-strong">{r.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{r.blurb}</span>
              <span className="mt-2 block text-xs font-semibold text-text/85 tnum">
                {years.length} year{years.length === 1 ? '' : 's'} · {years[years.length - 1].year.year} – {years[0].year.year}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One event across the years: winner (Main Event) and final table, each year opening its event page. */
export function EventChronicle() {
  const { slug = '' } = useParams();
  const r = RECURRING.find((x) => x.slug === slug);
  if (!r) return <Navigate to="/videos" replace />;
  const years = chronicle(slug);
  const liveMain = slug === 'main-event' ? events.find((e) => e.id === 'lv-main') : undefined;
  return (
    <Page className="max-w-[96rem]">
      {back('/videos', 'Browse')}
      <h1 className="mt-3 text-title">{r.name}</h1>
      <p className="mt-1 text-sm text-muted">{r.blurb}</p>
      <ol className="mt-6 divide-y divide-line rounded-panel border border-line bg-surface">
        {liveMain && (
          <li>
            <Link to={`/events/${liveMain.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
              <span className="w-14 font-display text-2xl tnum">{CURRENT_YEAR}</span>
              <img src={TABLE_ART[0].src} alt="" className="aspect-video w-24 shrink-0 rounded-card object-cover" style={artStyle(TABLE_ART[0])} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">Main Event · Final table on air</span>
                <span className="block truncate text-xs text-muted">{CURRENT_YEAR} WSOP Las Vegas</span>
              </span>
              <LiveTag />
            </Link>
          </li>
        )}
        {years.map(({ year, series, event }) => (
          <li key={event.id}>
            <Link to={`/videos/event/${event.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
              <span className="w-14 font-display text-2xl tnum">{year.year}</span>
              <img src={archiveArt(event.id)} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-card object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{event.name}</span>
                <span className="block truncate text-xs text-muted">
                  {seriesTitle(year.year, series)}
                  {event.number != null && ` · Event #${event.number}`}
                  {fmtBuyIn(event) && ` · ${fmtBuyIn(event)}`}
                </span>
              </span>
              <span className="hidden text-right text-sm sm:block">
                {r.slug === 'main-event' && year.champion ? (
                  <span className="font-semibold">Champion · {year.champion.name}</span>
                ) : (
                  <span className="text-muted">{event.days.some((d) => /final/i.test(d.label)) ? 'Final table' : daysNote(event.days.length)}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Page>
  );
}

// ---- Event page (where all three tabs land) ----------------------------------------------------------

/** The event: its facts, the days that were broadcast, full broadcasts or highlights; a day plays full screen. */
export function ArchiveEventPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const ref = archiveEvent(id);
  if (!ref) return <Navigate to="/videos" replace />;
  const { year, series, event } = ref;
  const full = broadcastsOf(ref);
  const clips = highlightsOf(ref);
  const facts = [fmtBuyIn(event) && `Buy-in ${fmtBuyIn(event)}`, event.game, event.kind !== 'Open' ? event.kind : '', `${full.length} broadcast day${full.length === 1 ? '' : 's'}`].filter(Boolean);
  const champion = event.kind === 'Main Event' && series.key === 'lv' ? year.champion : null;
  return (
    <>
      <div className="relative overflow-hidden bg-black">
        <img src={archiveArt(event.id)} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" aria-hidden />
        <Page className="relative py-8 sm:py-12">
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav(`/videos/year/${year.year}`))} className="text-sm text-white/70 hover:text-white">
            ← Back
          </button>
          <p className="mt-8 text-xs font-bold tracking-wide text-gold-strong uppercase">
            <Link to={`/videos/year/${year.year}/${series.key}`} className="hover:underline">
              {seriesTitle(year.year, series)}
            </Link>
            {event.number != null && ` · Event #${event.number}`}
          </p>
          <h1 className="mt-2 max-w-3xl font-sans text-3xl leading-tight font-bold normal-case sm:text-5xl">{event.name}</h1>
          <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-white/80">
            {facts.map((x, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-white/40">·</span>}
                {x}
              </span>
            ))}
          </p>
          {champion && (
            <p className="mt-2 text-sm font-semibold">
              Champion · {playerLink(champion.name) ? <Link to={playerLink(champion.name)!} className="text-gold-strong hover:underline">{champion.name}</Link> : champion.name} <CountryCode cc={champion.cc} />
            </p>
          )}
        </Page>
      </div>
      <Page className="py-8">
        {/* The broadcast days as a schedule strip (F1 TV's weekend schedule), then the broadcasts and, when there are any, the highlights. */}
        <div className="mb-10">
          <DaySchedule videos={full} isLiveNow={() => false} />
        </div>
        {[
          ['Broadcasts', full],
          ['Highlights', clips],
        ].map(([title, list]) =>
          (list as Video[]).length ? (
            <section key={title as string} aria-label={title as string} className="mb-10">
              <h2 className="text-xl sm:text-2xl">{title as string}</h2>
              <BadgeScope videos={list as Video[]}>
                <div className={cx(rowGrid, 'mt-4')}>
                  {(list as Video[]).map((v) => (
                    <VideoCard key={v.id} v={v} {...playsFull(v)} />
                  ))}
                </div>
              </BadgeScope>
            </section>
          ) : null,
        )}
        <div className="mt-2">
          <OtherYearsSection items={otherYears(event.name, event.kind, series.key, event.id)} />
        </div>
      </Page>
    </>
  );
}

/** Old links into the archive (a day id): the event page. */
export function ArchiveDayRedirect() {
  const { id = '' } = useParams();
  const v = videoById(id);
  return <Navigate to={v?.eventId?.startsWith('arc:') ? `/videos/event/${v.eventId.slice(4)}` : '/videos'} replace />;
}

// ---- Home rows (v8) ------------------------------------------------------------------------------------

function HomeSection({ title, label, action, children }: { title: string; label?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xl sm:text-2xl">{title}</h2>
          {label && <span className="text-[11px] font-bold tracking-wide text-gold-strong uppercase">● {label}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
const moreLink = (to: string, label: string) => (
  <Link to={to} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
    {label} →
  </Link>
);

/**
 * WSOP by Year (with the Main Event champions): a bar of years, then the chosen year's card — its champion, its
 * Main Event final table (plays full screen) and the way into the year in Browse. Replaces the two rows that each
 * showed the years with their champions.
 */
export function YearsRow() {
  const { state } = useApp();
  const [year, setYear] = useState(CURRENT_YEAR);
  const liveVideo = catalog.find((v) => v.eventId === 'lv-main' && isLive(v, state.streamMode));
  const modern = ARCHIVE.filter((y) => !y.classic && y.year < CURRENT_YEAR);
  const classics = ARCHIVE.filter((y) => y.classic);
  const arch = ARCHIVE.find((y) => y.year === year);
  const ref = arch ? archiveEvent(`${year}-lv-main`) : undefined;
  const fi = ref ? ref.event.days.findIndex((d) => /final/i.test(d.label)) : -1;
  const di = ref ? (fi >= 0 ? fi : ref.event.days.length - 1) : -1;
  const ftVideo = ref ? `arc.${ref.event.id}.${di}` : liveVideo?.id;
  const isNow = year === CURRENT_YEAR;
  const art = ref ? archiveArt(ref.event.id) : TABLE_ART[0].src;
  const yearChip = (y: number, live?: boolean) => (
    <button
      key={y}
      role="tab"
      aria-selected={year === y}
      onClick={() => setYear(y)}
      className={cx('flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold tnum', year === y ? 'border-text bg-text text-bg' : 'border-line-strong text-muted hover:text-text')}
    >
      {live && <span className="size-1.5 rounded-full bg-live" aria-hidden />}
      {y}
    </button>
  );
  return (
    <HomeSection title="WSOP by Year" action={moreLink('/videos', 'All years')}>
      {/* The years: this year (live) first, then the archive, then the Classics. */}
      <div className="hscroll items-center gap-2 pb-1" role="tablist" aria-label="Year">
        {yearChip(CURRENT_YEAR, !!liveVideo)}
        {modern.map((y) => yearChip(y.year))}
        <span className="mx-1 shrink-0 text-[11px] font-bold tracking-wide text-gold-strong uppercase">Classics</span>
        {classics.map((y) => yearChip(y.year))}
      </div>
      {/* The chosen year. */}
      <div className="mt-4 grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Link to={ftVideo ? `/watch/${ftVideo}${isNow ? '' : '?play=1'}` : `/videos/year/${year}`} onClick={isNow ? undefined : enterFullScreen} className="group relative block aspect-video overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-72">
          <img key={art} src={art} alt="" style={isNow ? artStyle(TABLE_ART[0]) : undefined} className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" aria-hidden />
          {isNow && liveVideo && <LiveTag className="absolute top-3 left-3" />}
          <span className="absolute bottom-3 left-4 font-display text-5xl leading-none tnum">{year}</span>
        </Link>
        <div className="flex flex-col justify-center p-6 lg:p-8">
          <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">
            {arch?.classic ? 'WSOP Classics · Binion’s Horseshoe' : isNow ? 'This year · live' : 'WSOP archive'}
          </p>
          {isNow ? (
            <>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{liveVideo ? 'Final table on air now' : 'This year’s World Series'}</h3>
              <p className="mt-1 text-sm text-muted">Main Event · Las Vegas</p>
            </>
          ) : (
            <>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{year} World Series of Poker</h3>
              <p className="mt-1 text-sm text-muted tnum">
                {arch && [arch.series.map((x) => x.name).join(' · '), yearSize(arch).line].join(' — ')}
              </p>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {ftVideo && (
              <Link to={`/watch/${ftVideo}${isNow ? '' : '?play=1'}`} onClick={isNow ? undefined : enterFullScreen}>
                <Button variant="primary" tabIndex={-1}>
                  <Icon name="play" size={16} /> {isNow ? 'Watch live' : arch?.classic ? 'Watch the broadcast' : 'Watch the final table'}
                </Button>
              </Link>
            )}
            <Link to={`/videos/year/${year}`}>
              <Button variant="outline" tabIndex={-1}>
                Explore {year}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}

/** Bracelet Legends: the players with the most bracelets; each opens the player page in Browse. */
export function LegendsRow() {
  return (
    <HomeSection title="Bracelet Legends" action={moreLink('/videos/players', 'All players')}>
      <ul className="hscroll gap-3 [&>*]:w-[40%] sm:[&>*]:w-[calc((100%-2.25rem)/4)] lg:[&>*]:w-[calc((100%-5.25rem)/8)]">
        {LEGENDS.slice(0, 10).map((l) => (
          <li key={l.id}>
            <LegendCard l={l} compact />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
