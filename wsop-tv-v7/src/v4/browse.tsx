// v8 — Browse, built on the WSOP archive (year → series → event → day):
//   Years (default): the years 2025 → 2003 (each with its Main Event champion), WSOP Classics after rights clearance;
//                    a year page has series tabs, its Main Event, then the bracelet events with filters.
//   Players: the player grid (sort) → a player page (profile, final tables by year, appearances by year).
//   Events: the events that come back every year → a chronicle of each, year by year.
//   The event page is where all three tabs land: its facts, the days that were broadcast, full broadcasts or highlights.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/app';
import { Avatar, Button, Flag, Icon, LiveTag, Page, Segmented, cx } from '../components/ui';
import { HERO_DAY_ID, classicEvents, events, players, seatsFor, seriesById } from '../data/mock';
import type { TourEvent } from '../data/types';
import { money } from '../lib/format';
import { TABLE_ART, VENUE_ART, WSOP_LOGO, artStyle } from '../lib/brand';
import { catalog, highlightClips, isLive, stageOf, videoById, type Video } from './catalog';
import { BadgeScope, VideoCard, rowGrid } from './detail';
import { HALL_OF_FAME, hofPhoto } from './halloffame';
import { Carousel } from './carousel';
import { photoOf } from './photos';
import { YT_VIDEOS, ytForEvent } from './youtube';
import { EventRows, EventTile, archiveItem, liveItem, newestFirst, playerLink, scheduleOrder, type EventItem } from './loop';
import { ARCHIVE, BRACELET_WINS, CLASSIC_RANGE, winSeries, RECURRING, archiveArt, archiveEvent, broadcastsOf, chronicle, fmtBuyIn, highlightsOf, seriesArt, seriesTitle, LEGENDS, legendById, type ArchiveEvent, type Legend, type SeriesKey } from './archive';

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
      {/* Browse's sub-menu, drawn as a menu: pill buttons under the title (the one you're on filled white). */}
      <nav className="mt-4 flex gap-2" aria-label="Browse">
        {tabs.map(([to, label, k]) => (
          <Link key={k} to={to} aria-current={tab === k ? 'page' : undefined} className={cx('inline-flex h-11 items-center rounded-full border px-6 text-base font-bold transition-colors', tab === k ? 'border-white bg-white text-black' : 'border-line-strong text-text/80 hover:border-white/60 hover:text-text')}>
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
export const pastSeasons = () => ARCHIVE.filter((y) => !y.classic && y.year < CURRENT_YEAR).map((y) => ({ year: y.year, line: seasonLine(y) }));
/** Under a season tile: its Main Event champion (as F1 TV's tiles carry the season's story), then what it holds. */
export const seasonLine = (y: (typeof ARCHIVE)[number]) => [y.champion && `Champion ${y.champion.name}`, eventsNote(yearSize(y).events)].filter(Boolean).join(' · ');

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
  const thisYear = currentYear()
    .flatMap((s) => s.events)
    .map(liveItem)
    .sort(newestFirst);
  // The lead: the event on air (live first in the order), else the newest final table.
  const lead = thisYear.find((x) => x.final);
  const leadHref = lead?.final ? (lead.live ? `/watch/${lead.final.id}` : `/watch/${lead.final.id}?play=1`) : (lead?.to ?? '/videos');
  const related = thisYear.filter((x) => x !== lead && x.final).map((x) => x.final!);
  const tile = (y: (typeof ARCHIVE)[number]) => {
    const main = y.series.find((s) => s.key === 'lv')?.events.find((e) => e.kind === 'Main Event') ?? y.series[0]?.events[0];
    const ref = main ? archiveEvent(main.id) : undefined;
    // Classics: their own still. Other years: a crop of real play, graphics left out.
    const own = CLASSIC_STILLS.find((x) => x.startsWith(String(y.year)));
    const art = y.classic ? (own ? `${import.meta.env.BASE_URL}classics/classic-${own.slice(0, 4)}-${own.slice(4)}.jpg` : main ? archiveArt(main.id) : '') : seasonPhoto(y.year);
    return (
      <li key={y.year} className="min-w-0">
        <YearPhotoTile
          year={y.year}
          art={art}
          // Like every other thumbnail, a tile opens a page first: a Classic its Main Event page (the broadcast, Play there).
          to={y.classic && ref ? `/videos/event/${ref.event.id}` : `/videos/year/${y.year}`}
          line={y.classic ? (y.champion ? `Champion ${y.champion.name}` : 'Main Event') : seasonLine(y)}
        />
      </li>
    );
  };
  const row = (list: typeof ARCHIVE) => (
    <div className="mt-4">
      <Carousel className={yearRowGrid}>{list.map(tile)}</Carousel>
    </div>
  );
  return (
    <>
      {/* This year: its events, not just the live one — the season's tiles (live first, then newest), and the way in. */}
      <section aria-label="This year" className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-gold-strong uppercase">
              <LiveTag /> This season
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl">
              <Link to={`/videos/year/${CURRENT_YEAR}`} className="hover:underline hover:decoration-2 hover:underline-offset-4">
                {CURRENT_YEAR} World Series of Poker
              </Link>
            </h2>
            <p className="mt-1 text-sm text-muted tnum">
              Las Vegas · {thisYear.length} events · {thisYear.reduce((n, x) => n + x.broadcasts, 0)} broadcasts
            </p>
          </div>
          <Link to={`/videos/year/${CURRENT_YEAR}`} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
            The whole season →
          </Link>
        </div>
        {/* One big picture: what's on now (or the latest final table) — two broadcasts at once is rare, so one leads. */}
        {lead && (
          <div className="grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <Link to={leadHref} onClick={lead.live ? undefined : enterFullScreen} className="group relative block aspect-video overflow-hidden bg-surface-2" aria-label={`Watch ${lead.name}`}>
              {lead.final && <img src={lead.final.thumb} style={artStyle({ pos: lead.final.thumbPos, fit: lead.final.thumbFit })} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />}
            </Link>
            <div className="flex flex-col justify-center p-6 lg:p-8">
              <p className="text-xs font-bold tracking-wide text-gold-strong uppercase tnum">
                {lead.number != null ? `Event #${lead.number}` : 'Las Vegas'} · {lead.live ? 'Final table on air now' : 'Latest final table'}
              </p>
              <h3 className="mt-2 text-2xl leading-tight font-bold sm:text-3xl">{lead.name}</h3>
              <p className="mt-1 text-sm text-muted">{[lead.buyLabel, lead.game].filter(Boolean).join(' · ')}</p>
              {!lead.live && lead.winner && <p className="mt-3 text-[15px]">Winner · <span className="font-semibold">{lead.winner.name}</span></p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={leadHref} onClick={lead.live ? undefined : enterFullScreen}>
                  <Button variant="primary" tabIndex={-1}>
                    <Icon name="play" size={16} /> {lead.live ? 'Watch live' : 'Watch the final table'}
                  </Button>
                </Link>
                <Link to={lead.to}>
                  <Button variant="outline" tabIndex={-1}>
                    Open the event
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
        {/* Under it, the season's other videos: each event's final table, newest first. */}
        {related.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-bold">More from the {CURRENT_YEAR} WSOP</h3>
            <Carousel className="gap-4 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*1rem)/3)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
              <BadgeScope videos={related}>
                {related.map((v) => (
                  <li key={v.id} className="min-w-0">
                    <VideoCard v={v} />
                  </li>
                ))}
              </BadgeScope>
            </Carousel>
          </div>
        )}
      </section>

      <section aria-label="Recent seasons" className="mt-10">
        <h2 className="text-xl sm:text-2xl">Recent seasons</h2>
        {row(recent)}
      </section>

      {decades.map((d) => {
        const ys = older.filter((y) => Math.floor(y.year / 10) * 10 === d);
        // The years the archive holds (2018 – 2010, 2009 – 2003), newest first, as F1 TV heads its decades.
        const label = `${ys[0].year} – ${ys[ys.length - 1].year}`;
        return (
          <section key={d} aria-label={label} className="mt-10">
            <h2 className="text-xl sm:text-2xl tnum">{label}</h2>
            {row(ys)}
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
/** A modern season's tile photo: its Main Event champion at the winning moment (public/frames/champ-<year>.jpg, from the final table on the NAS), as F1 TV shows each season's champion; other years a frame of their own broadcast. */
export const seasonPhoto = (year: number) => `${import.meta.env.BASE_URL}frames/${year >= 2003 && year <= 2024 ? 'champ' : 'year'}-${year}.jpg`;
const yearRowGrid = 'gap-3 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*0.75rem)/3)] lg:[&>*]:w-[calc((100%-3*0.75rem)/4)]';

/** A season as F1 TV draws one: the picture, the year large across it, and what it holds underneath. */
export function YearPhotoTile({ year, art, to, line, play }: { year: number; art: string; to: string; line: string; play?: boolean }) {
  return (
    <Link to={to} onClick={play ? enterFullScreen : undefined} className="group block">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2 [container-type:inline-size]">
        <img src={art} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
        <span className="absolute inset-0 bg-black/15" aria-hidden />
        {/* F1 TV's season tile: the year huge and see-through, so the champion's moment shows through it. */}
        <span className="absolute inset-0 grid place-items-center">
          <span className="font-display text-[36cqw] leading-none font-bold tracking-tight text-white/45 tnum">{year}</span>
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
                  Champion · {playerLink(arch.champion.name) ? <Link to={playerLink(arch.champion.name)!} className="font-semibold text-gold-strong hover:underline">{arch.champion.name}</Link> : <span className="font-semibold">{arch.champion.name}</span>} <Flag cc={arch.champion.cc} className="ml-1 align-[-2px]" />
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
 * as marked empty slots (no invented videos). Off: hidden until there is content (set true to show the slots).
 */
const SHOW_PLANNED = false;

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
      {legends.length > 0 && (
        <section aria-label="WSOP Players" className="mt-10">
          <h2 className="text-xl sm:text-2xl">WSOP Players</h2>
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
      {/* Poker Hall of Fame (WSOP.com's list): the names first, by the decade they were inducted, newest first. */}
      <section aria-label="Poker Hall of Fame" className="mt-12">
        <h2 className="text-xl sm:text-2xl">Poker Hall of Fame</h2>
        <p className="mt-1 text-sm text-muted">{HALL_OF_FAME.length} members since 1979 · WSOP.com</p>
        {[...new Set(HALL_OF_FAME.map((x) => Math.floor(x.year / 10) * 10))].map((d) => (
          <div key={d} className="mt-6">
            <h3 className="mb-3 font-display text-lg text-gold-strong tnum">{d}s</h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HALL_OF_FAME.filter((x) => Math.floor(x.year / 10) * 10 === d).map((x) => {
                const body = (
                  <span className="flex h-full items-center gap-3.5 rounded-card border border-line bg-surface p-3.5 transition-colors group-hover:border-white/40">
                    <Avatar name={x.name.replace(/ “[^”]+”/, '')} hue={[...x.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} size={56} photo={x.photo} ring />
                    <span className="min-w-0">
                      <span className="block text-base leading-snug font-bold group-hover:text-gold-strong">{x.name}</span>
                      <span className="mt-0.5 block text-xs text-muted tnum">
                        Inducted {x.year} · {x.country}
                      </span>
                    </span>
                  </span>
                );
                return (
                  <li key={x.name} className="min-w-0">
                    {x.to ? (
                      <Link to={x.to} className="group block h-full">
                        {body}
                      </Link>
                    ) : (
                      <div className="h-full">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
      {/* Only real players here: the demo's own players are made up, so they are not listed. */}
    </>
  );
}

/** A bracelet legend: initials, name, bracelets, Main Event titles. */
function LegendCard({ l, compact }: { l: Legend; compact?: boolean }) {
  const photo = (l.playerId ? players.find((p) => p.id === l.playerId)?.photo : undefined) ?? hofPhoto(l.name);
  return (
    <Link to={`/videos/players/${l.playerId ?? l.id}`} className="group flex h-full flex-col items-center rounded-card border border-line bg-surface p-4 text-center hover:border-line-strong hover:bg-surface-2">
      <Avatar name={l.name} hue={l.hue} size={compact ? 56 : 64} photo={photo} />
      <span className="mt-3 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-gold-strong">{l.name}</span>
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
  // The loop: their seat at the live final table, and every event they made the final table of (live series and
  // classics) as event rows, newest first, with their place where it isn't a win.
  const seats = seatsFor(HERO_DAY_ID);
  const seat = seats.find((s) => s.playerId === p.id);
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
            <Flag cc={p.cc} className="h-4" />
          </p>
        </div>
        <FollowButton name={p.name} className="sm:ml-auto" />
      </header>

      {/* At the live Main Event final table right now: straight back to the broadcast (the loop: player → video). */}
      {seat && (
        <Link to={`/watch/${HERO_DAY_ID}`} className="mt-8 flex flex-wrap items-center gap-4 rounded-panel border border-line bg-surface p-4 hover:border-white/40">
          <LiveTag />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">At the Main Event final table now</span>
            <span className="block text-sm text-muted tnum">
              {seats.length} players left · on air now
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
      <div className="mt-12">
        <PlayerVideosBlock name={p.name} />
      </div>
    </Page>
  );
}

/** A bracelet legend: bracelets and Main Event titles (WSOP records), and the broadcasts of this archive they are in. */
function LegendPage({ l }: { l: Legend }) {
  // Every WSOP bracelet they won (newest first), and the other Main Event final tables noted (Seidel, 1988 runner-up).
  // Players without a bracelet list keep their Main Event titles.
  const wins = BRACELET_WINS[l.id.replace(/^legend-/, '')];
  const results = [
    ...(wins
      ? wins.map(([ys, ev]) => ({ y: Number(ys.slice(0, 4)), key: ys + ev, title: ev, series: winSeries(ys), main: /^\d{4}$/.test(ys) && /Main Event|World Championship/.test(ev), lv: /^\d{4}$/.test(ys), label: 'Winner', winner: true }))
      : l.mainEvents.map((y) => ({ y, key: `${y}-me`, title: 'Main Event', series: `${y} World Series of Poker`, main: true, lv: true, label: 'Winner', winner: true }))),
    ...l.archive.filter((a) => !/champion/i.test(a.role)).map((a) => { const y = Number(a.eventId.slice(0, 4)); return { y, key: `${y}-ft`, title: 'Main Event', series: `${y} World Series of Poker`, main: true, lv: true, label: 'Final table · #2', winner: false }; }),
  ].sort((x, z) => z.y - x.y);
  // Ten rows at first; See more opens the rest in place.
  const [allResults, setAllResults] = useState(false);
  const shownResults = allResults ? results : results.slice(0, 10);
  return (
    <Page className="max-w-[96rem]">
      {back('/videos/players', 'Players')}
      <header className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={l.name} hue={l.hue} size={96} photo={photoOf(l.name) ?? hofPhoto(l.name)} ring />
        <div>
          <h1 className="text-title">{l.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {/* Name and flag only: what they won is in Results, from the data (nothing to keep up by hand). */}
            <Flag cc={l.cc} className="h-4" />
          </p>
        </div>
        <FollowButton name={l.name} className="sm:ml-auto" />
      </header>

      <section aria-label="Results" className="mt-10">
        <h2 className="text-xl sm:text-2xl">Results</h2>
        {results.length ? (
          <ul className="mt-3 divide-y divide-line rounded-panel border border-line bg-surface">
            {shownResults.map(({ y, key, title, series, main, lv, label, winner }) => {
              // A row opens what there is of it: the Main Event's archive page, or the 2026 series page.
              const ref = main ? archiveEvent(`${y}-lv-main`) : undefined;
              const to = ref ? `/videos/event/${ref.event.id}` : y === 2026 && lv ? '/videos/series/2026/lv' : undefined;
              const row = (
                <>
                  <span className={cx('w-14 font-display text-2xl tnum', !to && 'text-muted')}>{y}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{title}</span>
                    <span className="block truncate text-xs text-muted">{series}</span>
                  </span>
                  <span className={cx('text-sm font-semibold', winner && 'text-gold-strong')}>{label}</span>
                </>
              );
              return (
                <li key={key}>
                  {to ? (
                    <Link to={to} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
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
        ) : null}
        {results.length > 10 && (
          <div className="mt-5 flex justify-center">
            <button type="button" onClick={() => setAllResults((x) => !x)} aria-expanded={allResults} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-bold hover:border-white/60">
              {allResults ? 'See less' : 'See more'}
              <Icon name="chevron" size={16} className={allResults ? '-rotate-90' : 'rotate-90'} />
            </button>
          </div>
        )}
        {!results.length && <p className="mt-3 text-sm text-muted">No results on record here yet.</p>}
      </section>
      {/* Their videos from the whole archive (events they won, videos that name them, the WSOP channel's), under the results. */}
      <div className="mt-12">
        <PlayerVideosBlock name={l.name} />
      </div>
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
                <span className="block truncate text-xs text-muted">{CURRENT_YEAR} World Series of Poker</span>
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
  // The event's clips: the WSOP channel's (2025 events) and the archive's highlights.
  const clips = [...(year.year === CURRENT_YEAR ? ytForEvent(`${series.key}:${event.kind === 'Main Event' ? 'main' : event.number}`) : []), ...highlightsOf(ref)];
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
          <h1 className="mt-2 max-w-3xl font-sans text-3xl leading-tight font-bold normal-case sm:text-5xl">{ARCHIVE_FIX[event.id]?.title.replace(/^#\d+ · /, '') ?? event.name}</h1>
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
              Champion · {playerLink(champion.name) ? <Link to={playerLink(champion.name)!} className="text-gold-strong hover:underline">{champion.name}</Link> : champion.name} <Flag cc={champion.cc} className="ml-1 align-[-2px]" />
            </p>
          )}
        </Page>
      </div>
      <Page className="py-8">
        {/* No schedule strip of days: the Broadcasts row below already lists them in order (with their lengths on the pictures). */}
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
    <HomeSection title="WSOP Players" action={moreLink('/videos/players', 'All players')}>
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

// ---- Browse (one page: filters, the season's events, then the players) -------------------------------------------

type SeriesType = 'all' | 'bracelets' | 'super' | 'circuit';
/** Which circuit stops were Super Circuits (2025 Cyprus, 2023 London International); the others were regular Circuit stops. */
const SUPER_CIRCUIT_YEARS = new Set([2025, 2023]);
const typeOf = (year: number, key: SeriesKey): Exclude<SeriesType, 'all'> => (key === 'circuit' ? (SUPER_CIRCUIT_YEARS.has(year) ? 'super' : 'circuit') : 'bracelets');

/**
 * Browse, one page (no Years / Players split), with filters on top as on WSOP.com: the year, the kind of series
 * (Bracelets · Super Circuit · Circuit) and players (search, or tick the most searched). Under them, each event as a
 * row of its videos, newest first; then WSOP Legends, the players to follow (active players only, 15 at most).
 * Picking players searches every year, so a player's events show whichever year they were in.
 */
export function BrowseAll() {
  // All years by default: the newest year first, then "See more" opens the year before it, and so on.
  // A link can pick the year (?year=2025); otherwise All.
  const [params] = useSearchParams();
  const [year, setYear] = useState<'all' | number>(() => (Number(params.get('year')) || 'all'));
  const [more, setMore] = useState(1);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  // 2026 first (its series from the WSOP channel), then the archive years.
  const years = [2026, ...ARCHIVE.map((y) => y.year)];
  // The player list opens only while searching (the search box has focus or text), as a dropdown under the box.
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => (document.removeEventListener('mousedown', away), document.removeEventListener('keydown', esc));
  }, [open]);
  // Back to the top: a round button at the bottom right once the page has scrolled.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 800);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  // Which years are on the page: one year; or, for All, the newest `more` years; picking players searches every year.
  const shownYears = picked.length ? [] : year === 'all' ? years.slice(0, more) : [year];
  const groups = shownYears.map((y) => ({ y, rows: seasonRows(y) })).filter((g) => g.rows.length);
  const nextYear = !picked.length && year === 'all' ? years[more] : undefined;
  const needle = q.trim().toLowerCase();
  const shown = needle ? ALL_PLAYER_NAMES.filter((n) => n.toLowerCase().includes(needle)) : MOST_SEARCHED;
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  return (
    <>

      {/* The filters first (they apply to the whole page), then WSOP Legends, then the events. */}
      <div className="mt-5 grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <span className="sr-only">Year</span>
            <select
              id="browse-year"
              value={String(year)}
              onChange={(e) => (setYear(e.target.value === 'all' ? 'all' : Number(e.target.value)), setMore(1))}
              disabled={picked.length > 0}
              className="h-11 w-56 appearance-none rounded-chip border border-line-strong bg-surface px-4 pr-10 text-[15px] font-bold tnum disabled:opacity-50"
            >
              <option value="all">All Seasons</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 rotate-90 text-muted" />
          </label>
          {/* Players: a search box; its list (Most Searched, or the matches) opens under it only while searching. */}
          <div ref={box} className="relative w-full sm:w-80">
            <label className="flex h-11 items-center gap-2 rounded-chip border border-line-strong bg-surface px-3 focus-within:border-white/60">
              <Icon name="search" size={16} className="text-muted" />
              <input id="browse-player-search" value={q} onFocus={() => setOpen(true)} onChange={(e) => (setQ(e.target.value), setOpen(true))} placeholder="Search players" aria-label="Search players" aria-expanded={open} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              {(q || picked.length > 0) && (
                <button type="button" onClick={() => (setQ(''), setPicked([]))} aria-label="Clear players" className="text-muted hover:text-text">
                  <Icon name="close" size={16} />
                </button>
              )}
            </label>
            {open && (
              <div className="absolute top-full left-0 z-30 mt-2 w-[min(44rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-4 shadow-2xl shadow-black/60">
                <p className="mb-2 text-sm font-bold">{needle ? `Players matching "${q.trim()}"` : 'Most Searched'}</p>
                {shown.length ? (
                  <ul className="grid max-h-64 grid-cols-1 gap-x-4 gap-y-0.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {shown.map((n) => {
                      const cc = ccOf(n);
                      return (
                        <li key={n} className="min-w-0">
                          <label className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1.5 hover:bg-white/5">
                            <input type="checkbox" checked={picked.includes(n)} onChange={() => toggle(n)} className="size-4 shrink-0 accent-[var(--color-live)]" />
                            {cc ? <Flag cc={cc} /> : <span className="w-5 shrink-0" aria-hidden />}
                            <span className="truncate text-sm">{n}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No player matches "{q.trim()}".</p>
                )}
              </div>
            )}
          </div>
        </div>
        {/* The players picked, as chips (remove one with its ×); they search every year. */}
        {picked.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {picked.map((n) => (
              <button key={n} type="button" onClick={() => toggle(n)} className="inline-flex h-8 items-center gap-2 rounded-full border border-line-strong bg-surface px-3 text-sm font-semibold hover:border-white/60" aria-label={`Remove ${n}`}>
                {ccOf(n) && <Flag cc={ccOf(n)!} />}
                {n}
                <Icon name="close" size={12} className="text-muted" />
              </button>
            ))}
            <span className="text-sm text-muted">· every year</span>
          </div>
        )}
      </div>

      <WsopLegendsRow />
      {/* Players picked: each player's videos from the whole archive in one block (not split by year or series). */}
      {picked.length > 0 ? (
        <div className="mt-8 space-y-12">
          {picked.map((n) => {
            const vs = playerVideos(n);
            const l = LEGENDS.find((x) => x.name === n);
            return vs.length ? <VideoGridBlock key={n} title={n} to={l ? `/videos/players/${l.id}` : undefined} sub={`${vs.length} video${vs.length === 1 ? '' : 's'} · every year`} videos={vs} /> : <p key={n} className="rounded-card border border-line bg-surface p-5 text-sm text-muted">No videos of {n} yet.</p>;
          })}
        </div>
      ) : (
      /* The series, newest first, one row each (no year headings: each series name carries its year). */
      <div className="mt-8 space-y-10">
        {groups.length ? (
          groups.map((g) => (
            <section key={g.y} aria-label={String(g.y)} className="space-y-10">
              {seriesOf(g.rows).map((s) => (
                <SeriesBlock key={s.key} s={s} />
              ))}
            </section>
          ))
        ) : (
          <p className="rounded-card border border-line bg-surface p-5 text-sm text-muted">No videos match these filters.</p>
        )}
      </div>
      )}
      {nextYear != null && (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setMore((n) => n + 1)} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-bold hover:border-white/60">
            See more <Icon name="chevron" size={16} className="rotate-90" />
          </button>
        </div>
      )}
      {scrolled && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="fixed right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 grid size-12 place-items-center rounded-full bg-white text-black shadow-lg shadow-black/50 hover:bg-white/85">
          <Icon name="chevron" size={20} className="-rotate-90" />
        </button>
      )}
    </>
  );
}

type SeasonRow = { key: string; to: string; title: string; note: string; videos: Video[]; type: Exclude<SeriesType, 'all'>; players: string[]; series: string; seriesKey: SeriesKey; year: number; winner?: string };

/** Newest series first: Paradise (Dec), the Super Circuit (2025: Cyprus, Oct 9 – 21), Europe (Sep – Oct), Las Vegas (May – Jul). */
const SERIES_ORDER: SeriesKey[] = ['pa', 'circuit', 'eu', 'apac', 'lv'];
/** A series' name in a row: "2025 WSOP Super Circuit Cyprus", "2024 WSOP Circuit", "2019 WSOP Las Vegas". */
const seriesLabel = (year: number, key: SeriesKey, name: string) =>
  key === 'circuit' ? (year === 2025 ? '2025 WSOP Super Circuit Cyprus' : SUPER_CIRCUIT_YEARS.has(year) ? `${year} WSOP Super Circuit` : `${year} WSOP Circuit`) : key === 'lv' ? `${year} World Series of Poker` : `${year} WSOP ${name}`;
/** The archive's folder names, with the official name and the winner where a source states them (PokerNews event pages). */
const ARCHIVE_FIX: Record<string, { title: string; winner?: string }> = {
  '2025-pa-main': { title: '#11 · $25,000 Super Main Event', winner: 'Bernhard Binder' },
  '2025-eu-main': { title: '#14 · €10,350 Main Event', winner: 'Daniel Pidun' },
  '2025-circuit-main': { title: '$5,300 Main Event' },
};

/** Every player the demo knows by name: the legends, this year's players and the Main Event champions. */
const ALL_PLAYER_NAMES = [...new Set([...LEGENDS.map((l) => l.name), ...players.map((p) => p.name), ...ARCHIVE.flatMap((y) => (y.champion ? [y.champion.name] : [])), ...Object.values(ARCHIVE_FIX).flatMap((f) => (f.winner ? [f.winner] : []))])].sort((a, b) =>
  a.localeCompare(b),
);
/** A player's country code: from the legends, this year's players or the Main Event champions. */
const ccOf = (name: string): string | undefined => LEGENDS.find((l) => l.name === name)?.cc ?? players.find((p) => p.name === name)?.cc ?? ARCHIVE.find((y) => y.champion?.name === name)?.champion?.cc ?? ({ 'Bernhard Binder': 'AT', 'Daniel Pidun': 'DE' } as Record<string, string>)[name];
/** Most Searched: the players to follow (WSOP Legends) and the 2025 bracelet winners, A – Z. */
const MOST_SEARCHED = [
  ...new Set(
    [...['mizrachi', 'deeb', 'glaser', 'schulman', 'koon', 'hellmuth', 'negreanu', 'ivey', 'seidel', 'seiver', 'arieh', 'tamayo', 'weinman', 'jorstad', 'moneymaker'].map((id) => legendById(`legend-${id}`)?.name ?? ''), ...events.filter((e) => e.winnerId && e.seriesId === 'lv25').map((e) => players.find((p) => p.id === e.winnerId)?.name ?? '')].filter(Boolean),
  ),
].sort((a, b) => a.localeCompare(b));

/** The players in a row: its winner, and anyone named in full in its videos' titles. */
const playersIn = (winner: string | undefined, videos: Video[]) => {
  const titles = videos.map((v) => v.title).join(' | ');
  return ALL_PLAYER_NAMES.filter((n) => n === winner || titles.includes(n));
};

/** A season's events as rows: in 2025 the live service's own Las Vegas events (with their recaps and hands), else the archive's. */
export function seasonRows(year = CURRENT_YEAR): SeasonRow[] {
  if (year === 2026) return rows2026();
  const arch = ARCHIVE.find((y) => y.year === year);
  if (!arch) return [];
  // Real videos only: every row is the archive's broadcast files for that event (the NAS list), the WSOP channel's
  // uploads for it, and for the 2025 Main Event its three real final-table hands. The live service's 2025 events only
  // lend their official name and winner. An event with no file (2025 #94) has no row.
  const own = year === CURRENT_YEAR ? events.filter((e) => e.seriesId === 'lv25') : [];
  const realHands = catalog.filter((v) => /^r\d+$/.test(v.id));
  const out: SeasonRow[] = [];
  for (const key of SERIES_ORDER) {
    const s = arch.series.find((x) => x.key === key);
    if (!s) continue;
    const items: { n: number; row: SeasonRow }[] = [];
    const label = seriesLabel(year, key, s.name);
    const type = typeOf(year, key);
    for (const e of s.events) {
      const ref = archiveEvent(e.id);
      if (!ref) continue;
      const main = e.kind === 'Main Event';
      const mine = key === 'lv' ? own.find((m) => (main ? m.id === 'lv-main' : m.number === e.number)) : undefined;
      const videos = [...(year === CURRENT_YEAR ? ytForEvent(`${key}:${main ? 'main' : e.number}`) : []), ...broadcastsOf(ref), ...(mine?.id === 'lv-main' ? realHands : []), ...highlightsOf(ref)];
      if (!videos.length) continue;
      const fix = ARCHIVE_FIX[e.id];
      // The winner: the live service's record (2025 Las Vegas), the fixes, or the Las Vegas Main Event champion.
      const winner = (mine?.winnerId && players.find((p) => p.id === mine.winnerId)?.name) || fix?.winner || (main && key === 'lv' ? arch.champion?.name : undefined);
      const number = main && key === 'lv' && mine ? mine.number : e.number;
      const name = mine ? mine.name.replace(' World Championship', '') : e.name;
      const title = fix?.title ?? `${number != null ? `#${number} · ` : ''}${name}`;
      items.push({ n: main ? 999 : (e.number ?? 0), row: { key: e.id, to: `/videos/event/${e.id}`, title, note: [label, winner && `Won by ${winner}`].filter(Boolean).join(' · '), videos, type, players: playersIn(winner, videos), series: label, seriesKey: key, year, winner } });
    }
    // Newest first within a series: its Main Event (decided last), then the higher event numbers.
    items.sort((a, b) => b.n - a.n);
    out.push(...items.map((x) => x.row));
  }
  return out;
}

/**
 * The 2026 season, newest series first: Super Circuit Canada (Aug – Sep), the World Series of Poker (May – Jul) and
 * WSOP Europe in Prague (Mar – Apr). Real videos only: the WSOP channel's broadcasts and highlights of each event (its
 * uploads, checked Nov 12, 2026), broadcasts in day order, then the highlights. Winners as PokerNews reports them.
 */
const SEASON_2026: { key: SeriesKey; label: string; events: { id: string; title: string; winner?: string; ids: string[] }[] }[] = [
  {
    key: 'circuit',
    label: '2026 WSOP Super Circuit Canada',
    events: [{ id: '2026-ca-main', title: '$5,000 Main Event', ids: ['To5xgFlsnCY', 'H0JSipNlrNY', 'alcnNHlgdUk', 'Ur4ZIB3erL0', '-1SlgRr5Wt8', 'XZFpibvB5uA', 'YLd_y-jRqCE', '6ISDwWBcFqc'] }],
  },
  {
    key: 'lv',
    label: '2026 World Series of Poker',
    events: [
      {
        id: '2026-lv-main',
        title: '#82 · Main Event',
        winner: 'Lucas Jumalon',
        ids: ['NgmC2AyY6eQ', '5WAC_EHuelU', '2vo-KVi9rJs', 'GLXWjV3Ic0I', 'ecq6RRht7GI', 'R_44RqfjiWY', 'lRuDBOkDvQk', 'ogoG54uaq9k', 'qAeO_w5QJrQ', 'QwqXyihmYBQ', 'kIErxAhqX1o', 'WWPGWi8aLvI', '31rhZNp5zzI', 'y7Yx4ZWtm68', 'r8YzivCqwTQ', '3N-xegeMSos', 'DtBU-JcgnkU', '_IiFpKlPB1k', 'OjAlvTqwQuc', 'XjKaiw5oAY0', 'CeVpt52Ao2Y', 'y5PZt0XW-H8', 'HwEHTLyTBE4'],
      },
      { id: '2026-lv-6max', title: '$5,000 No-Limit Hold’em 6-Handed', ids: ['jS7IqqfNZCE', 'FeCb4Q5Xam8'] },
      { id: '2026-lv-70', title: '#70 · $10,000 Pot-Limit Omaha Championship', winner: 'Michael Mizrachi', ids: ['t43kLxHyCKg', 'IMZVcSsG5PI'] },
      { id: '2026-lv-68', title: '#68 · $1,000 Ladies Championship', winner: 'Skye Chen', ids: ['1k1hXnTwK_U'] },
      { id: '2026-lv-ppc', title: '$50,000 Poker Players Championship', ids: ['deAsBMKAaFk'] },
      { id: '2026-lv-mb', title: '$10,000 No-Limit Hold’em Mystery Bounty', ids: ['-0CN3AbtOIk'] },
      { id: '2026-lv-colossus', title: '$500 Colossus', ids: ['fGU5ONdh5p8'] },
      { id: '2026-lv-11', title: '#11 · $10,000 GGMillion$ High Roller', winner: 'Naseem Salem', ids: ['WrnZdEdZD4I'] },
    ],
  },
  {
    key: 'eu',
    label: '2026 WSOP Europe',
    events: [{ id: '2026-eu-main', title: '€10,000 Main Event', ids: ['hbBsq81e8d0', 'EFrXwz3WX0I', 'pp9pA3dQWIk', 'guQ6R799HWk', 'hGQfNNau0AI', '2NdbZTnIIAM', 'ryST1tVOUAw', 'Dqkl7d_pnqc', 'z_ykW11RBRI', 'C7QTh7wva00', 'hTgGN22V_PY', 'sSKRlPNO0UY', 'Zih5mb_5EVQ'] }],
  },
];
function rows2026(): SeasonRow[] {
  return SEASON_2026.flatMap((s) =>
    s.events.map((e) => {
      const videos = e.ids.map((id) => videoById(`yt.${id}`)).filter((v): v is Video => !!v);
      return { key: e.id, to: `/videos/series/2026/${s.key}`, title: e.title, note: [s.label, e.winner && `Won by ${e.winner}`].filter(Boolean).join(' · '), videos, type: typeOf(2026, s.key), players: playersIn(e.winner, videos), series: s.label, seriesKey: s.key, year: 2026, winner: e.winner };
    }),
  ).filter((r) => r.videos.length);
}

/** One event: its name (opens the event page), where and who won, then its videos in a sideways row. */
type SeriesGroup = { key: string; year: number; seriesKey: SeriesKey; name: string; events: SeasonRow[] };
/** A year's rows gathered by series, in order (newest series first). */
const seriesOf = (rows: SeasonRow[]): SeriesGroup[] => {
  const out: SeriesGroup[] = [];
  for (const r of rows) {
    const g = out.find((x) => x.name === r.series);
    if (g) g.events.push(r);
    else out.push({ key: `${r.year}-${r.seriesKey}`, year: r.year, seriesKey: r.seriesKey, name: r.series, events: [r] });
  }
  return out;
};

/**
 * A series on Browse: its name with how many events and videos, See more on the right (the series page: all its
 * events, each a row of its videos), and under it one row of all its videos, event by event.
 */
/**
 * What kind of series it is, as WSOP.com's schedule marks it: Bracelets (the World Series of Poker, Europe, Paradise,
 * APAC), Super Circuit, or Circuit.
 */
function SeriesBadge({ s }: { s: Pick<SeriesGroup, 'seriesKey' | 'name'> }) {
  const kind = s.seriesKey !== 'circuit' ? 'Bracelets' : /Super Circuit/i.test(s.name) ? 'Super Circuit' : 'Circuit';
  const tone = kind === 'Bracelets' ? 'border-[#e5484d] text-[#ff6b70]' : kind === 'Super Circuit' ? 'border-[#9b7bd4] text-[#b9a0ea]' : 'border-[#3fa37a] text-[#5cc79a]';
  return <span className={cx('inline-block rounded-[3px] border px-1.5 py-px text-[11px] leading-4 font-bold tracking-wide uppercase', tone)}>{kind}</span>;
}

function SeriesBlock({ s }: { s: SeriesGroup }) {
  const videos = s.events.reduce((n, r) => n + r.videos.length, 0);
  const rowVideos = s.events.flatMap((r) => r.videos).filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i);
  return (
    <section aria-label={s.name} className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <SeriesBadge s={s} />
          <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl sm:text-2xl">{s.name}</h2>
          <span className="text-sm text-muted tnum">
            {s.events.length} event{s.events.length === 1 ? '' : 's'} · {videos} videos
          </span>
          </div>
        </div>
        <Link to={`/videos/series/${s.year}/${s.seriesKey}`} className="shrink-0 text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
          See more →
        </Link>
      </div>
      {/* One row per series: its videos, event by event (the Main Event first, then the newest events). */}
      <Carousel className="gap-4 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*1rem)/3)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
        <BadgeScope videos={rowVideos}>
          {rowVideos.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard v={v} />
            </li>
          ))}
        </BadgeScope>
      </Carousel>
    </section>
  );
}

/** A series' page (Browse > See more): every event of the series, newest first, each a row of its videos. */
export function SeriesEventsPage() {
  const { year = '', series: key = '' } = useParams();
  const g = seriesOf(seasonRows(Number(year)).filter((r) => r.seriesKey === key))[0];
  if (!g) return <Navigate to="/videos" replace />;
  const videos = g.events.reduce((n, r) => n + r.videos.length, 0);
  return (
    <Page className="max-w-[96rem]">
      {back('/videos', 'Browse')}
      <div className="mt-3">
        <SeriesBadge s={g} />
      </div>
      <h1 className="mt-1.5 text-title">{g.name}</h1>
      <p className="mt-1 text-sm text-muted tnum">
        {g.events.length} event{g.events.length === 1 ? '' : 's'} · {videos} videos
      </p>
      {/* Every event with all its videos laid out (no sideways rows here: this page is the full list). */}
      <div className="mt-8 divide-y divide-line">
        {g.events.map((r) => (
          <div key={r.key} className="py-8 first:pt-0">
            <EventVideoRow r={r} grid />
          </div>
        ))}
      </div>
      <BackToTop />
    </Page>
  );
}

/** Back to the top: a round button at the bottom right once the page has scrolled. */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 800);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!show) return null;
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="fixed right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 grid size-12 place-items-center rounded-full bg-white text-black shadow-lg shadow-black/50 hover:bg-white/85">
      <Icon name="chevron" size={20} className="-rotate-90" />
    </button>
  );
}

/**
 * A player's videos from the whole archive, newest first: every video of an event they won, every video whose title
 * names them, and the WSOP channel's uploads that name them (full name, or a surname only they have).
 */
const PLAYER_VIDEOS = new Map<string, Video[]>();
export function playerVideos(name: string): Video[] {
  const hit = PLAYER_VIDEOS.get(name);
  if (hit) return hit;
  const rows = ARCHIVE.flatMap((y) => seasonRows(y.year));
  const last = name.split(' ').slice(-1)[0];
  const ownSurname = last.length >= 4 && ALL_PLAYER_NAMES.filter((n) => n.split(' ').slice(-1)[0] === last).length === 1;
  const names = (t: string) => t.includes(name) || (ownSurname && new RegExp(`\\b${last}\\b`, 'i').test(t));
  const out = [...rows.flatMap((r) => (r.winner === name ? r.videos : r.videos.filter((v) => names(v.title)))), ...YT_VIDEOS.filter((v) => names(v.title))];
  const list = out.filter((v, i) => out.findIndex((x) => x.id === v.id) === i);
  PLAYER_VIDEOS.set(name, list);
  return list;
}

/** A titled grid of videos: four on a line, "Show all N" opens the rest in place (player results, a player's page). */
function VideoGridBlock({ title, to, sub, videos }: { title: string; to?: string; sub: string; videos: Video[] }) {
  // A player's videos are laid out in full (no See more).
  const shown = videos;
  return (
    <section aria-label={title}>
      <div className="mb-4">
        <h2 className="text-lg font-bold sm:text-xl">{to ? <Link to={to} className="hover:underline hover:decoration-2 hover:underline-offset-4">{title}</Link> : title}</h2>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
      </div>
      <BadgeScope videos={shown}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
          {shown.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </BadgeScope>
    </section>
  );
}

/** One event: its name (opens the event page) and who won, then its videos — sideways, or all laid out (`grid`). */
export function EventVideoRow({ r, grid }: { r: SeasonRow; grid?: boolean }) {
  // The full list (series page): one line of four, and "Show all" opens the rest in place (and closes it again).
  const [all, setAll] = useState(false);
  const GRID_FIRST = 4;
  const gridVideos = all ? r.videos : r.videos.slice(0, GRID_FIRST);
  if (grid)
    return (
      <section aria-label={r.title}>
        <div className="mb-4">
          <h3 className="text-base font-bold sm:text-lg">
            <Link to={r.to} className="hover:underline hover:decoration-2 hover:underline-offset-4">
              {r.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted">{[r.winner && `Won by ${r.winner}`, `${r.videos.length} video${r.videos.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
        </div>
        <BadgeScope videos={gridVideos}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
            {gridVideos.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        </BadgeScope>
        {r.videos.length > GRID_FIRST && (
          <div className="mt-5 flex justify-center">
            <button type="button" onClick={() => setAll((x) => !x)} aria-expanded={all} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-bold hover:border-white/60">
              {all ? 'See less' : 'See more'}
              <Icon name="chevron" size={16} className={all ? '-rotate-90' : 'rotate-90'} />
            </button>
          </div>
        )}
      </section>
    );
  return (
    <section aria-label={r.title}>
      {/* The event's name (opens the event page) and who won; the series line above already says where. */}
      <div className="mb-3">
        <h3 className="text-base font-bold sm:text-lg">
          <Link to={r.to} className="hover:underline hover:decoration-2 hover:underline-offset-4">
            {r.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          {[r.winner && `Won by ${r.winner}`, `${r.videos.length} video${r.videos.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <Carousel className="gap-4 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*1rem)/3)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
        <BadgeScope videos={r.videos}>
          {r.videos.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard v={v} />
            </li>
          ))}
        </BadgeScope>
      </Carousel>
    </section>
  );
}

/**
 * WSOP Legends: the players to follow — recent bracelet winners and the big names with the most WSOP video. Active
 * players only (no one who has died or stopped playing), 15 at most, most bracelets first.
 */
// Order: the 2025 winners first (the champion, then the year's other bracelet winners), then the big names with the
// most WSOP video, then the recent Main Event champions. Doyle Brunson and Johnny Moss (died) and anyone not playing
// the WSOP in 2024 – 2025 stay out.
const LEGEND_ORDER = ['mizrachi', 'deeb', 'glaser', 'schulman', 'koon', 'hellmuth', 'negreanu', 'ivey', 'seidel', 'seiver', 'arieh', 'tamayo', 'weinman', 'jorstad', 'moneymaker'];
export const WSOP_LEGENDS: { name: string; cc: string; bracelets: number; line: string; to?: string }[] = LEGEND_ORDER.map((id) => legendById(`legend-${id}`))
  .filter((l): l is Legend => !!l)
  .map((l) => ({ name: l.name, cc: l.cc, bracelets: l.bracelets, line: l.note, to: `/videos/players/${l.id}` }));
function WsopLegendsRow() {
  const list = WSOP_LEGENDS.slice(0, 15);
  if (!list.length) return null;
  return (
    <section aria-label="WSOP Players" className="mt-14">
      <h2 className="text-xl sm:text-2xl">WSOP Players</h2>
      <Carousel className="mt-4 gap-3 [&>*]:w-[40%] sm:[&>*]:w-[calc((100%-3*0.75rem)/4)] lg:[&>*]:w-[calc((100%-5*0.75rem)/6)]">
        {list.map((p) => {
          const photo = photoOf(p.name);
          const body = (
            <>
              <span className="relative block aspect-[3/4] overflow-hidden rounded-card border border-line bg-surface-2 transition-colors group-hover:border-white/40">
                {photo ? (
                  <img src={photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center font-display text-5xl text-white/80">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                )}
              </span>
              <span className="mt-2 flex items-center gap-2">
                <Flag cc={p.cc} />
                <span className="truncate text-[15px] font-bold group-hover:text-gold-strong">{p.name}</span>
              </span>
            </>
          );
          return (
            <li key={p.name} className="min-w-0">
              {p.to ? (
                <Link to={p.to} className="group block">
                  {body}
                </Link>
              ) : (
                <div className="group block">{body}</div>
              )}
            </li>
          );
        })}
      </Carousel>
    </section>
  );
}

/** A player's page: their videos (Browse's player search finds the same set). */
function PlayerVideosBlock({ name }: { name: string }) {
  const vs = playerVideos(name);
  if (!vs.length) return null;
  return <VideoGridBlock title="Videos" sub={`${vs.length} video${vs.length === 1 ? '' : 's'} · every year`} videos={vs} />;
}

/**
 * The old year pages (/videos/year/…) are gone: a year opens Browse with that year picked, and a year's series opens
 * that series' events page, so older links still land on the current screens.
 */
export function YearRedirect() {
  const { year = '', series } = useParams();
  if (series) return <Navigate to={`/videos/series/${year}/${series}`} replace />;
  return <Navigate to={ARCHIVE.some((y) => String(y.year) === year) ? `/videos?year=${year}` : '/videos'} replace />;
}

// ---- Following -------------------------------------------------------------------------------------------------

/**
 * Players the viewer follows (NBA League Pass "Following"): kept in this browser. The demo starts with two followed,
 * so Home's Following row has something to show; Follow / Following on a player page changes it.
 */
const FOLLOW_KEY = 'wsop-tv.v7.following';
const FOLLOW_START = ['Michael Mizrachi', 'Jason Koon'];
let followed: string[] = (() => {
  try {
    const raw = localStorage.getItem(FOLLOW_KEY);
    return raw ? (JSON.parse(raw) as string[]) : FOLLOW_START;
  } catch {
    return FOLLOW_START;
  }
})();
const followListeners = new Set<() => void>();
export function useFollowing(): [string[], (name: string) => void] {
  const list = useSyncExternalStore(
    (l) => (followListeners.add(l), () => followListeners.delete(l)),
    () => followed,
  );
  const toggle = (name: string) => {
    followed = followed.includes(name) ? followed.filter((n) => n !== name) : [...followed, name];
    try {
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(followed));
    } catch {
      /* private mode: kept for this visit only */
    }
    followListeners.forEach((l) => l());
  };
  return [list, toggle];
}

function FollowButton({ name, className }: { name: string; className?: string }) {
  const [list, toggle] = useFollowing();
  const on = list.includes(name);
  return (
    <Button variant={on ? 'secondary' : 'outline'} aria-pressed={on} onClick={() => toggle(name)} className={className}>
      <Icon name={on ? 'check' : 'plus'} size={16} /> {on ? 'Following' : 'Follow'}
    </Button>
  );
}
