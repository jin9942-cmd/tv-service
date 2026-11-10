// v8 — Browse, built on the WSOP archive (year → series → event → day):
//   Years (default): the years 2026 → 2003 (each with its Main Event champion), WSOP Classics after rights clearance;
//                    a year page has series tabs, its Main Event, then the bracelet events with filters.
//   Players: the player grid (sort, search) → a player page (profile, final tables by year, appearances by year).
//   Events: the events that come back every year → a chronicle of each, year by year.
//   The event page is where all three tabs land: its facts, the days that were broadcast, full broadcasts or highlights.
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/app';
import { Avatar, BraceletCount, Button, CountryCode, FilterChip, Icon, LiveTag, Page, Segmented, cx } from '../components/ui';
import { HERO_DAY_ID, events, players, seriesById } from '../data/mock';
import type { TourEvent } from '../data/types';
import { duration, money } from '../lib/format';
import { TABLE_ART, VENUE_ART, artStyle } from '../lib/brand';
import { catalog, isLive, videoById, type Video } from './catalog';
import { BadgeScope, VideoCard, rowGrid } from './detail';
import { HALL_OF_FAME } from './halloffame';
import { photoOf } from './photos';
import { ARCHIVE, RECURRING, archiveArt, archiveEvent, broadcastsOf, chronicle, fmtBuyIn, highlightsOf, seriesArt, seriesTitle, LEGENDS, legendById, type ArchiveEvent, type Legend, type SeriesKey } from './archive';

const CURRENT_YEAR = 2026;

// ---- shared bits -------------------------------------------------------------------------------------

/** Browse is built on two things, the year and the player. (Hashtags are an advanced feature, left out for now.) */
export function BrowseTabs({ tab }: { tab: 'years' | 'players' }) {
  const tabs = [
    ['/videos', 'Years', 'years'],
    ['/videos/players', 'Players', 'players'],
  ] as const;
  return (
    <>
      {/* Big display-type tabs, as the page's headline: the one you are on in white with the gold bar, the other dimmed. */}
      <nav className="flex gap-8 border-b border-line sm:gap-10" aria-label="Browse">
        {tabs.map(([to, label, k]) => (
          <Link key={k} to={to} aria-current={tab === k ? 'page' : undefined} className={cx('-mb-px border-b-4 pb-3 font-display text-4xl leading-none uppercase transition-colors sm:text-5xl', tab === k ? 'border-gold text-text' : 'border-transparent text-white/35 hover:text-white/75')}>
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

// ---- Years -----------------------------------------------------------------------------------------

/** What a year holds: its events and broadcasts (all series). */
const yearSize = (y: (typeof ARCHIVE)[number]) => {
  const evs = y.series.flatMap((s) => s.events);
  const casts = evs.reduce((n, e) => n + e.days.length, 0);
  return { events: evs.length, casts, line: `${evs.length} event${evs.length === 1 ? '' : 's'} · ${casts} broadcast${casts === 1 ? '' : 's'}` };
};

/**
 * Years (F1 TV's season archive, led by the champion): a bar of years on top (this year, 2025 → 2003, then the
 * Classics), and the chosen year under it — its Main Event champion first, then its series and events as tiles.
 * The year is in the address (?y=2025), so a year can be linked to and Back works.
 */
export function YearsTab() {
  const [params, setParams] = useSearchParams();
  const { state } = useApp();
  const liveNow = catalog.some((v) => v.eventId && isLive(v, state.streamMode));
  const want = Number(params.get('y'));
  const y = want === CURRENT_YEAR || ARCHIVE.some((x) => x.year === want) ? want : CURRENT_YEAR;
  const pick = (n: number) => setParams({ y: String(n) }, { replace: true });
  const chip = (n: number, live?: boolean) => (
    <button
      key={n}
      role="tab"
      aria-selected={y === n}
      onClick={() => pick(n)}
      className={cx('relative shrink-0 px-1 pb-2 font-display text-2xl leading-none tnum transition-colors sm:text-3xl', y === n ? 'text-text' : 'text-white/30 hover:text-white/70')}
    >
      {live && <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-live" aria-label="live" />}
      {n}
      {y === n && <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-gold" aria-hidden />}
    </button>
  );
  return (
    <>
      {/* The year bar: one line that scrolls sideways. */}
      <div className="hscroll mt-6 items-end gap-5 border-b border-line pt-2 sm:gap-6" role="tablist" aria-label="Year">
        {chip(CURRENT_YEAR, liveNow)}
        {ARCHIVE.filter((x) => !x.classic).map((x) => chip(x.year))}
        <span className="mx-1 shrink-0 self-center text-[11px] font-bold tracking-wide text-gold-strong uppercase">Classics</span>
        {ARCHIVE.filter((x) => x.classic).map((x) => chip(x.year))}
      </div>
      <YearBody key={y} y={y} titled />
    </>
  );
}

/** The current year comes from the live data (its events open the event page of the live service). */
function currentYear() {
  const ofSeries = (sid: string) => events.filter((e) => e.seriesId === sid);
  const series = [
    { key: 'lv', name: 'Las Vegas', events: ofSeries('lv26') },
    { key: 'eu', name: 'Europe', events: ofSeries('eu26') },
    { key: 'circuit', name: 'Circuit', events: ofSeries('ca26') },
  ].filter((s) => s.events.length);
  return series;
}

/** A year on its own page (links from the event pages and Home). */
export function YearPage() {
  const { year = '' } = useParams();
  const y = Number(year);
  if (y !== CURRENT_YEAR && !ARCHIVE.some((x) => x.year === y)) return <Navigate to="/videos" replace />;
  return (
    <Page className="max-w-[96rem]">
      {back(`/videos?y=${y}`, 'Years')}
      <YearBody y={y} titled />
    </Page>
  );
}

type Card = { id: string; to: string; art: string; name: string; number: number | null; buyIn: number; buyLabel: string; game: string; kind: string; days: number; live?: boolean; video?: string };

/** One year: the Main Event champion (or this year's Main Event), the series tabs, then the events as tiles. */
function YearBody({ y, titled }: { y: number; titled?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [game, setGame] = useState<GameF>('all');
  const {
    state: { streamMode },
  } = useApp();
  const isCurrent = y === CURRENT_YEAR;
  const arch = ARCHIVE.find((x) => x.year === y);

  // One shape for both: the live year (mock data) and archive years.
  const seriesList: { key: string; name: string; cards: Card[] }[] = isCurrent
    ? currentYear().map((s) => ({
        key: s.key,
        name: s.name,
        cards: s.events.map((e: TourEvent) => {
          const v = catalog.find((x) => x.eventId === e.id && x.kind === 'broadcast');
          return {
            id: e.id,
            to: `/events/${e.id}`,
            art: e.days.some((d) => d.id === HERO_DAY_ID) ? (v?.thumb ?? VENUE_ART[0].src) : seriesArt(s.key as SeriesKey, e.id),
            video: catalog.find((x) => x.eventId === e.id && isLive(x, streamMode))?.id,
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
    : (arch?.series ?? []).map((s) => ({
        key: s.key,
        name: s.name,
        cards: s.events.map((e: ArchiveEvent) => {
          const ref = archiveEvent(e.id)!;
          const all = broadcastsOf(ref);
          return { id: e.id, to: `/videos/event/${e.id}`, art: archiveArt(e.id), name: e.name, number: e.number, buyIn: e.currency === '$' ? e.buyIn : Math.round(e.buyIn * 1.1), buyLabel: fmtBuyIn(e), game: e.game, kind: e.kind, days: e.days.length, video: all[all.length - 1]?.id };
        }),
      }));
  const sKey = seriesList.find((s) => s.key === params.get('series'))?.key ?? seriesList[0]?.key;
  const current = seriesList.find((s) => s.key === sKey);
  const main = current?.cards.find((c) => c.kind === 'Main Event');
  const mainRef = main && !isCurrent ? archiveEvent(main.id) : undefined;
  const rest = (current?.cards ?? []).filter((c) => c !== main);
  const games = [...new Set(rest.map((c) => c.game))];
  rest.sort((a, b) => Number(!!b.live) - Number(!!a.live));
  const shown = rest.filter((c) => game === 'all' || c.game === game);
  const champion = arch?.champion && sKey === 'lv' && main ? arch.champion : null;
  const setSeries = (key: string) => {
    setParams(
      (p) => {
        p.set('series', key);
        return p;
      },
      { replace: true },
    );
    setGame('all');
  };
  return (
    <>
      {titled && (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-display text-3xl sm:text-4xl">{y} World Series of Poker</h2>
          <p className="text-sm text-muted tnum">
            {arch?.classic ? 'WSOP Classics · Binion’s Horseshoe · ' : ''}
            {arch ? yearSize(arch).line : 'This year · live and on demand'}
          </p>
        </div>
      )}

      {/* Series tabs (Las Vegas · Europe · Paradise · Circuit) */}
      <div hidden={seriesList.length < 2} className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Series">
        {seriesList.map((s) => (
          <FilterChip key={s.key} on={s.key === sKey} onClick={() => setSeries(s.key)}>
            {s.name}
          </FilterChip>
        ))}
      </div>

      {/* The year's headline: its Main Event champion (archive years), or the Main Event card (this year, other series). */}
      {main &&
        (champion ? (
          <ChampionHero y={y} champion={champion} main={main} classic={!!arch?.classic} />
        ) : (
          <section aria-label="Main Event" className="mt-6">
            <div className="grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Link to={main.video && main.live ? `/watch/${main.video}` : main.to} className="group relative block aspect-video overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-80">
                <img src={main.art} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                {main.live && <LiveTag className="absolute top-3 left-3" />}
              </Link>
              <div className="flex flex-col justify-center p-6 lg:p-8">
                <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">
                  {current!.name} · Main Event{main.number != null && ` · Event #${main.number}`}
                </p>
                <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{main.name}</h3>
                <p className="mt-1 text-sm text-muted">{[main.buyLabel, main.game, daysNote(main.days)].filter(Boolean).join(' · ')}</p>
                {main.live && <p className="mt-4 text-[15px] font-semibold">The final table is on air now</p>}
                <div className="mt-6 flex flex-wrap gap-3">
                  {main.video && (
                    <Link to={main.live ? `/watch/${main.video}` : `/watch/${main.video}?play=1`} onClick={main.live ? undefined : enterFullScreen}>
                      <Button variant="primary" tabIndex={-1}>
                        <Icon name="play" size={16} /> {main.live ? 'Watch live' : 'Watch the final table'}
                      </Button>
                    </Link>
                  )}
                  <Link to={main.to}>
                    <Button variant="outline" tabIndex={-1}>
                      Open the event
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ))}

      {/* Bracelet events as tiles, with one filter: the game. */}
      {rest.length > 0 && (
        <section aria-label="Bracelet events" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold sm:text-2xl">
              Bracelet events <span className="text-base font-semibold text-muted tnum">{rest.length}</span>
            </h3>
            <div hidden={games.length < 2} className="flex flex-wrap gap-2" aria-label="Game">
              <FilterChip on={game === 'all'} onClick={() => setGame('all')}>
                All games
              </FilterChip>
              {games.map((g) => (
                <FilterChip key={g} on={game === g} onClick={() => setGame(g)}>
                  {g}
                </FilterChip>
              ))}
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((c) => (
              <li key={c.id} className="min-w-0">
                <EventTileCard c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!rest.length && mainRef && (
        <section aria-label="Main Event broadcasts" className="mt-10">
          <h3 className="text-xl font-bold sm:text-2xl">Main Event broadcasts</h3>
          <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {broadcastsOf(mainRef).map((v, i) => (
              <li key={v.id} className="min-w-0">
                <Link to={`/watch/${v.id}?play=1`} onClick={enterFullScreen} className="group block">
                  <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
                    <img src={v.thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
                    <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tnum">{duration(v.durationSec)}</span>
                  </span>
                  <span className="mt-2 block truncate text-sm font-semibold group-hover:text-gold-strong">{mainRef.event.days[i].label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

/**
 * The champion headline: the Main Event still behind, the champion's face (WSOP.com photo, else initials) and name
 * large, and the year as a watermark. Watch opens the final table full screen; the name opens the player when Browse
 * has a page for them.
 */
function ChampionHero({ y, champion, main, classic }: { y: number; champion: { name: string; cc: string }; main: Card; classic: boolean }) {
  const photo = photoOf(champion.name);
  const legend = LEGENDS.find((l) => l.name === champion.name);
  const hue = [...champion.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <section aria-label={`${y} Main Event champion`} className="relative mt-6 overflow-hidden rounded-panel border border-line bg-black">
      <img src={main.art} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" aria-hidden />
      <span className="pointer-events-none absolute -right-4 -bottom-10 font-display text-[11rem] leading-none text-white/[0.07] tnum select-none sm:text-[16rem]" aria-hidden>
        {y}
      </span>
      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
        {photo ? (
          <img src={photo} alt="" className="size-32 shrink-0 rounded-full object-cover ring-4 ring-gold ring-offset-4 ring-offset-black sm:size-44" />
        ) : (
          <span className="shrink-0 [&>*]:!size-32 sm:[&>*]:!size-44 [&>*]:!text-4xl">
            <Avatar name={champion.name} hue={hue} size={176} ring />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.12em] text-gold-strong uppercase">
            {y} Main Event champion{classic ? ' · Binion’s Horseshoe' : ''}
          </p>
          <h3 className="mt-2 font-display text-5xl leading-[0.95] uppercase sm:text-7xl">
            {legend ? (
              <Link to={`/videos/players/${legend.playerId ?? legend.id}`} className="hover:text-gold-strong">
                {champion.name}
              </Link>
            ) : (
              champion.name
            )}
          </h3>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-white/80">
            <CountryCode cc={champion.cc} />
            <span className="text-white/40">·</span>
            {[main.buyLabel, main.game, daysNote(main.days)].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {main.video && (
              <Link to={`/watch/${main.video}?play=1`} onClick={enterFullScreen}>
                <Button variant="primary" tabIndex={-1}>
                  <Icon name="play" size={16} /> {classic ? 'Watch the broadcast' : 'Watch the final table'}
                </Button>
              </Link>
            )}
            <Link to={main.to}>
              <Button variant="outline" tabIndex={-1}>
                Open the event
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** An event as a tile: its still, number and buy-in, name; on air marked LIVE. */
function EventTileCard({ c }: { c: Card }) {
  return (
    <Link to={c.live && c.video ? `/watch/${c.video}` : c.to} className="group block">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={c.art} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
        {c.live && <LiveTag className="absolute top-2 left-2" />}
        {c.buyLabel && <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-bold tnum">{c.buyLabel}</span>}
      </span>
      <span className="mt-2 block text-[11px] font-semibold text-muted tnum">
        {c.number != null ? `Event #${c.number}` : c.kind}
        {' · '}
        {c.live ? 'On air now' : c.days ? daysNote(c.days) : 'Coming up'}
      </span>
      <span className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-gold-strong">{c.name}</span>
    </Link>
  );
}

type GameF = 'all' | string;

// ---- Players ---------------------------------------------------------------------------------------

/** The face of a person: the WSOP.com photo when the demo has it, else initials on a colour. */
function Face({ name, className, small }: { name: string; className?: string; small?: boolean }) {
  const photo = photoOf(name);
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const initials = name
    .replace(/ “[^”]+”/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
  return photo ? (
    <img src={photo} alt="" loading="lazy" className={cx('object-cover', className)} />
  ) : (
    <span className={cx('flex items-center justify-center font-display text-white/85', small ? 'text-xl' : 'text-5xl', className)} style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 32%), hsl(${hue} 50% 12%))` }} aria-hidden>
      {initials}
    </span>
  );
}

/**
 * Players (NBA's player index, around the bracelet): the Main Event champions year by year as a wall of faces, the
 * all-time bracelet leaders as a ranking, this year's players, then the Poker Hall of Fame by decade.
 */
export function PlayersTab() {
  const champions = ARCHIVE.filter((y) => y.champion).map((y) => ({ year: y.year, ...y.champion! }));
  const legendOf = (name: string) => LEGENDS.find((l) => l.name === name);
  const leaders = [...LEGENDS].sort((a, b) => b.bracelets - a.bracelets || a.name.localeCompare(b.name));
  const legendIds = new Set(LEGENDS.map((l) => l.playerId).filter(Boolean));
  const current = players.filter((p) => !legendIds.has(p.id)).sort((a, b) => (b.bracelets ?? 0) - (a.bracelets ?? 0) || a.name.localeCompare(b.name));
  return (
    <>
      {/* Main Event champions: a face a year, newest first; each opens the player (legends) or the year. */}
      <section aria-label="Main Event champions" className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl">Main Event Champions</h2>
            <p className="mt-1 text-sm text-muted">The $10,000 No-Limit Hold’em World Championship, year by year</p>
          </div>
        </div>
        <ul className="hscroll mt-4 gap-3 [&>*]:w-[40%] sm:[&>*]:w-[calc((100%-3*0.75rem)/4)] lg:[&>*]:w-[calc((100%-6*0.75rem)/7)]">
          {champions.map((c) => {
            const l = legendOf(c.name);
            return (
              <li key={c.year} className="min-w-0">
                <Link to={l ? `/videos/players/${l.playerId ?? l.id}` : `/videos?y=${c.year}`} className="group block">
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-card border border-line bg-surface-2 transition-colors group-hover:border-white/40">
                    <Face name={c.name} className="absolute inset-0 size-full transition-transform duration-200 group-hover:scale-[1.04]" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pt-10 pb-2.5">
                      <span className="block font-display text-3xl leading-none tnum">{c.year}</span>
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-[15px] font-bold group-hover:text-gold-strong">{c.name}</span>
                  <span className="block text-xs text-muted">{c.cc}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Most bracelets: the all-time ranking, a leader board with faces. */}
      <section aria-label="Most bracelets" className="mt-12">
        <h2 className="text-2xl sm:text-3xl">Most Bracelets</h2>
        <p className="mt-1 text-sm text-muted">The all-time WSOP bracelet leaders</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {leaders.map((l, i) => (
            <li key={l.id} className="min-w-0">
              <Link to={`/videos/players/${l.playerId ?? l.id}`} className="group flex items-center gap-4 rounded-card border border-line bg-surface p-3 pr-4 transition-colors hover:border-white/40 hover:bg-surface-2">
                <span className={cx('w-9 shrink-0 text-center font-display text-3xl leading-none tnum', i < 3 ? 'text-gold-strong' : 'text-white/40')}>{i + 1}</span>
                <Face name={l.name} small className="size-16 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold group-hover:text-gold-strong">{l.name}</span>
                  <span className="block truncate text-xs text-muted tnum">{l.mainEvents.length ? `Main Event ${l.mainEvents.join(', ')}` : l.country}</span>
                </span>
                <span className="shrink-0 text-lg">
                  <BraceletCount n={l.bracelets} size={18} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {current.length > 0 && (
        <section aria-label={`${CURRENT_YEAR} players`} className="mt-12">
          <h2 className="text-2xl sm:text-3xl">{CURRENT_YEAR} Players</h2>
          <p className="mt-1 text-sm text-muted">At the tables of this year’s series</p>
          <ul className="hscroll mt-4 gap-3 [&>*]:w-[40%] sm:[&>*]:w-[calc((100%-3*0.75rem)/4)] lg:[&>*]:w-[calc((100%-6*0.75rem)/7)]">
            {current.map((p) => (
              <li key={p.id} className="min-w-0">
                <Link to={`/videos/players/${p.id}`} className="group flex h-full flex-col items-center rounded-card border border-line bg-surface p-4 text-center hover:border-white/40 hover:bg-surface-2">
                  <Avatar name={p.name} hue={p.hue} size={64} photo={p.photo ?? photoOf(p.name)} />
                  <span className="mt-3 line-clamp-2 text-sm font-semibold group-hover:text-gold-strong">{p.name}</span>
                  <span className="mt-0.5 text-xs text-muted">{p.country}</span>
                  <span className="mt-2 text-xs">
                    <BraceletCount n={p.bracelets} size={14} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Poker Hall of Fame (WSOP.com's list): faces and names, by the decade they were inducted, newest first. */}
      <section aria-label="Poker Hall of Fame" className="mt-12">
        <h2 className="text-2xl sm:text-3xl">Poker Hall of Fame</h2>
        <p className="mt-1 text-sm text-muted">{HALL_OF_FAME.length} members since 1979 · WSOP.com</p>
        {[...new Set(HALL_OF_FAME.map((x) => Math.floor(x.year / 10) * 10))].map((d) => (
          <div key={d} className="mt-6">
            <h3 className="mb-3 font-display text-lg text-gold-strong tnum">{d}s</h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HALL_OF_FAME.filter((x) => Math.floor(x.year / 10) * 10 === d).map((x) => {
                const body = (
                  <span className="flex h-full items-center gap-3.5 rounded-card border border-line bg-surface p-3.5 transition-colors group-hover:border-white/40">
                    <Face name={x.name} small className="size-14 shrink-0 rounded-full" />
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
    </>
  );
}

/** A bracelet legend: face, name, bracelets, Main Event titles (Home's Bracelet Legends row). */
function LegendCard({ l, compact }: { l: Legend; compact?: boolean }) {
  const photo = (l.playerId ? players.find((p) => p.id === l.playerId)?.photo : undefined) ?? photoOf(l.name);
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
  const yearOfEvent = (e: TourEvent) => Number(seriesById(e.seriesId).name.match(/\d{4}/)?.[0] ?? CURRENT_YEAR);
  const byYear = [...new Set(finals.map((x) => yearOfEvent(x.e)))]
    .sort((a, b) => b - a)
    .map((y) => ({ y, rows: finals.filter((x) => yearOfEvent(x.e) === y).sort((p1, p2) => p1.r.place - p2.r.place) }));
  return (
    <Page className="max-w-[96rem]">
      {back('/videos/players', 'Players')}
      <header className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={p.name} hue={p.hue} size={96} photo={p.photo ?? photoOf(p.name)} ring />
        <div>
          <h1 className="text-title">{p.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {p.country} <CountryCode cc={p.cc} />
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2">
              <dt className="text-muted">Bracelets</dt>
              <dd>
                <BraceletCount n={p.bracelets} />
              </dd>
            </div>
          </dl>
          {asLegend && <p className="mt-2 text-xs font-bold tracking-wide text-gold-strong uppercase">Bracelet legend</p>}
        </div>
      </header>

      {/* Results (WSOP records): a row per final table, by year; each opens the event and its broadcasts. */}
      <section aria-label="Results" className="mt-10">
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
        <Avatar name={l.name} hue={l.hue} size={96} photo={photoOf(l.name)} ring />
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
  const [format, setFormat] = useState<'full' | 'highlights'>('full');
  if (!ref) return <Navigate to="/videos" replace />;
  const { year, series, event } = ref;
  const full = broadcastsOf(ref);
  const clips = highlightsOf(ref);
  const list = format === 'full' ? full : clips;
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
            <Link to={`/videos/year/${year.year}?series=${series.key}`} className="hover:underline">
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
              Champion · {champion.name} <CountryCode cc={champion.cc} />
            </p>
          )}
        </Page>
      </div>
      <Page className="py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Format"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'full', label: `Full broadcast (${full.length})` },
              { value: 'highlights', label: `Highlights (${clips.length})`, disabled: !clips.length, title: clips.length ? undefined : 'No highlights for this event yet' },
            ]}
          />
          <p className="text-sm text-muted">Days that were broadcast · a day plays full screen</p>
        </div>
        {list.length ? (
          <BadgeScope videos={list}>
            <div className={cx(rowGrid, 'mt-5')}>
              {list.map((v) => (
                <VideoCard key={v.id} v={v} {...playsFull(v)} />
              ))}
            </div>
          </BadgeScope>
        ) : (
          <p className="mt-5 rounded-panel border border-line bg-surface p-5 text-sm text-muted">No highlights for this event yet.</p>
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
  const modern = ARCHIVE.filter((y) => !y.classic);
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
