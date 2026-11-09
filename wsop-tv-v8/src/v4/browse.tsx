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
import { money } from '../lib/format';
import { TABLE_ART, VENUE_ART, artStyle } from '../lib/brand';
import { catalog, isLive, videoById, type Video } from './catalog';
import { BadgeScope, VideoCard, rowGrid } from './detail';
import { ARCHIVE, CLASSIC_RANGE, RECURRING, archiveArt, archiveEvent, broadcastsOf, chronicle, fmtBuyIn, highlightsOf, seriesArt, seriesTitle, LEGENDS, legendById, type ArchiveEvent, type Legend, type SeriesKey } from './archive';

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

/** An event card: picture, number and name, buy-in · game, how many days were broadcast. */
function EventTile({ to, art, title, number, meta, note, live, wide }: { to: string; art: string; title: string; number?: number | null; meta: string; note?: ReactNode; live?: boolean; wide?: boolean }) {
  return (
    <Link to={to} className="group block min-w-0">
      <span className={cx('relative block overflow-hidden rounded-card bg-surface-2', wide ? 'aspect-[21/9]' : 'aspect-video')}>
        <img src={art} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        {live && <LiveTag className="absolute top-2 left-2" />}
      </span>
      {number != null && <span className="mt-2 block text-xs text-gold-strong">Event #{number}</span>}
      <span className={cx('block leading-snug font-semibold group-hover:text-gold-strong', number != null ? 'mt-0.5' : 'mt-2', wide ? 'text-lg' : 'text-[15px]')}>{title}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">{meta}</span>
      {note && <span className="mt-1 block text-xs font-semibold text-text/85">{note}</span>}
    </Link>
  );
}
const daysNote = (n: number) => `${n} broadcast${n === 1 ? '' : 's'}`;

// ---- Years -----------------------------------------------------------------------------------------

/** Years: one tile a year, newest first, with its Main Event champion; WSOP Classics once the rights are cleared. */
export function YearsTab() {
  const { state } = useApp();
  const liveNow = catalog.some((v) => v.eventId && isLive(v, state.streamMode));
  const tile = (y: (typeof ARCHIVE)[number]) => {
    const main = y.series.find((s) => s.key === 'lv')?.events.find((e) => e.kind === 'Main Event') ?? y.series[0]?.events[0];
    return <YearTile key={y.year} to={`/videos/year/${y.year}`} year={y.year} art={archiveArt(main?.id ?? String(y.year))} line={y.champion ? `Champion · ${y.champion.name}` : ''} />;
  };
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <YearTile to={`/videos/year/${CURRENT_YEAR}`} year={CURRENT_YEAR} art={TABLE_ART[0].src} line={liveNow ? 'Main Event final table on air' : 'This year'} live={liveNow} />
        {ARCHIVE.filter((y) => !y.classic).map(tile)}
      </div>
      {/* WSOP Classics: the Main Event broadcasts from Binion's Horseshoe, 1973 – 2002. */}
      <section aria-label="WSOP Classics" className="mt-10">
        <h2 className="text-xl sm:text-2xl">WSOP Classics</h2>
        <p className="mt-1 text-sm text-muted">
          <span className="tnum">{CLASSIC_RANGE}</span> · The Main Event from Binion’s Horseshoe, as it was broadcast
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{ARCHIVE.filter((y) => y.classic).map(tile)}</div>
      </section>
    </>
  );
}
function YearTile({ to, year, art, line, live }: { to: string; year: number; art: string; line: string; live?: boolean }) {
  return (
    <Link to={to} className="group relative block aspect-[4/3] overflow-hidden rounded-card bg-surface-2">
      <img src={art} alt="" className="absolute inset-0 size-full object-cover opacity-70 transition-transform duration-200 group-hover:scale-[1.04]" />
      <span className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" aria-hidden />
      {live && <LiveTag className="absolute top-2 left-2" />}
      <span className="absolute inset-x-0 bottom-0 p-3">
        <span className="block font-display text-3xl leading-none tnum">{year}</span>
        {line && <span className="mt-1 block truncate text-xs text-white/85">{line}</span>}
      </span>
    </Link>
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

type GameF = 'all' | string;
/** A year: series tabs (Las Vegas · Europe · Paradise · Circuit), its Main Event, then the bracelet events with filters. */
export function YearPage() {
  const { year = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const y = Number(year);
  const [game, setGame] = useState<GameF>('all');
  const {
    state: { streamMode },
  } = useApp();
  const isCurrent = y === CURRENT_YEAR;
  const arch = ARCHIVE.find((x) => x.year === y);
  if (!isCurrent && !arch) return <Navigate to="/videos" replace />;

  // One shape for both: the live year (mock data) and archive years.
  type Card = { id: string; to: string; art: string; name: string; number: number | null; buyIn: number; buyLabel: string; game: string; kind: string; days: number; live?: boolean; video?: string };
  const seriesList: { key: string; name: string; cards: Card[] }[] = isCurrent
    ? currentYear().map((s) => ({
        key: s.key,
        name: s.name,
        cards: s.events.map((e: TourEvent) => {
          const v = catalog.find((x) => x.eventId === e.id && x.kind === 'broadcast');
          return {
            id: e.id,
            to: `/events/${e.id}`,
            // Stills of the series' own look (the live Main Event keeps its broadcast picture).
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
    : arch!.series.map((s) => ({
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
  const rest = (current?.cards ?? []).filter((c) => c !== main);
  const games = [...new Set(rest.map((c) => c.game))];
  rest.sort((a, b) => Number(!!b.live) - Number(!!a.live));
  const shown = rest.filter((c) => (game === 'all' || c.game === game));
  return (
    <Page className="max-w-[96rem]">
      {back('/videos', 'Years')}
      <h1 className="mt-3 text-title">{y} World Series of Poker</h1>
      {arch?.classic && <p className="mt-1 text-xs font-bold tracking-wide text-gold-strong uppercase">WSOP Classics · Binion’s Horseshoe</p>}
      {arch?.champion && (
        <p className="mt-1 text-sm text-muted">
          Main Event champion · <span className="font-semibold text-text">{arch.champion.name}</span> <CountryCode cc={arch.champion.cc} />
        </p>
      )}
      {isCurrent && <p className="mt-1 text-sm text-muted">This year · live and on demand</p>}

      {/* Series tabs */}
      <div hidden={seriesList.length < 2} className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Series">
        {seriesList.map((s) => (
          <FilterChip key={s.key} on={s.key === sKey} onClick={() => (setParams({ series: s.key }, { replace: true }), setGame('all'))}>
            {s.name}
          </FilterChip>
        ))}
      </div>

      {/* Main Event: the featured card with its champion. */}
      {main && (
        <section aria-label="Main Event" className="mt-6">
          {/* One card: the picture and, beside it, what the Main Event is and how to watch it. */}
          <div className="grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Link to={main.video && main.live ? `/watch/${main.video}` : main.to} className="group relative block aspect-video overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-80">
              <img src={main.art} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              {main.live && <LiveTag className="absolute top-3 left-3" />}
            </Link>
            <div className="flex flex-col justify-center p-6 lg:p-8">
              <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">
                {current!.name} · Main Event{main.number != null && ` · Event #${main.number}`}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl">{main.name}</h2>
              <p className="mt-1 text-sm text-muted">{[main.buyLabel, main.game, daysNote(main.days)].filter(Boolean).join(' · ')}</p>
              {arch?.champion && sKey === 'lv' ? (
                <p className="mt-4 text-[15px]">
                  Champion · <span className="font-semibold">{arch.champion.name}</span> <CountryCode cc={arch.champion.cc} />
                </p>
              ) : (
                main.live && <p className="mt-4 text-[15px] font-semibold">The final table is on air now</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {main.video && (
                  <Link to={main.live ? `/watch/${main.video}` : `/watch/${main.video}?play=1`} onClick={main.live ? undefined : enterFullScreen}>
                    <Button variant="primary" tabIndex={-1}>
                      <Icon name="play" size={16} /> {main.live ? 'Watch live' : arch?.classic ? 'Watch the broadcast' : 'Watch the final table'}
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
      )}

      {/* Bracelet events, with one filter: the game (part of every event name, so it holds for the whole archive). */}
      {rest.length > 0 && (
        <section aria-label="Bracelet events" className="mt-10">
          <h2 className="text-xl sm:text-2xl">Bracelet events</h2>
          <div hidden={games.length < 2} className="mt-3">
            <div className="flex flex-wrap gap-2" aria-label="Game">
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
          {shown.length ? (
            <div className={cx(rowGrid, 'mt-5')}>
              {shown.map((c) => (
                <EventTile key={c.id} to={c.to} art={c.art} title={c.name} number={c.number} meta={[c.buyLabel, c.game].filter(Boolean).join(' · ')} note={c.live ? 'Final table on air now' : c.days ? daysNote(c.days) : 'Coming up'} live={c.live} />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-panel border border-line bg-surface p-5 text-sm text-muted">No events match these filters.</p>
          )}
        </section>
      )}
    </Page>
  );
}

// ---- Players ---------------------------------------------------------------------------------------

type Sort = 'bracelets' | 'name';
/** Players: the bracelet legends (all-time leaders, WSOP records) and this year's players; sort and search. */
export function PlayersTab() {
  const [sort, setSort] = useState<Sort>('bracelets');
  const [q, setQ] = useState('');
  const match = (name: string) => name.toLowerCase().includes(q.trim().toLowerCase());
  const order = <T extends { name: string; bracelets: number }>(a: T, b: T) => (sort === 'name' ? a.name.localeCompare(b.name) : b.bracelets - a.bracelets || a.name.localeCompare(b.name));
  const legends = LEGENDS.filter((l) => match(l.name)).sort(order);
  const legendIds = new Set(LEGENDS.map((l) => l.playerId).filter(Boolean));
  const current = players.filter((p) => !legendIds.has(p.id) && match(p.name)).sort(order);
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
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-chip border border-line-strong bg-surface px-3 sm:max-w-xs">
          <Icon name="search" size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" aria-label="Search players" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      </div>
      {legends.length > 0 && (
        <section aria-label="Bracelet legends" className="mt-8">
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
      {current.length > 0 && (
        <section aria-label={`${CURRENT_YEAR} players`} className="mt-10">
          <h2 className="text-xl sm:text-2xl">{CURRENT_YEAR} players</h2>
          <p className="mt-1 text-sm text-muted">At the tables of this year’s series</p>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {current.map((p) => (
              <li key={p.id}>
                <Link to={`/videos/players/${p.id}`} className="group flex h-full flex-col items-center rounded-card border border-line bg-surface p-4 text-center hover:border-line-strong hover:bg-surface-2">
                  <Avatar name={p.name} hue={p.hue} size={64} photo={p.photo} />
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
      {!legends.length && !current.length && <p className="mt-6 text-sm text-muted">No players match “{q}”.</p>}
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
  const events = arch ? arch.series.reduce((n, s) => n + s.events.length, 0) : 0;
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
            {year} · WSOP Main Event{arch?.classic && ' · Classics'}
          </p>
          {isNow ? (
            <>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{liveVideo ? 'Final table on air now' : 'This year’s World Series'}</h3>
              <p className="mt-1 text-sm text-muted">The champion is decided tonight</p>
            </>
          ) : (
            <>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
                {arch?.champion?.name} {arch?.champion && <CountryCode cc={arch.champion.cc} />}
              </h3>
              <p className="mt-1 text-sm text-muted">
                Main Event champion · {arch?.series.length} series · {events} event{events === 1 ? '' : 's'} in the archive
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
