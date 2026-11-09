// v8 — two Home drafts for review, both built only from the NAS archive and the 2025 record.
//  A · Series hub (F1 TV on a race weekend): the series bar, the live table, the series' televised events, the same
//      event in past years, then the archive.
//  B · WSOP history (WatchWPT / UFC Fight Pass): live as a thin band, then the Main Event year by year, the Classics
//      and the named collections the archive holds.
// Both stand on Jun 17, 2025 (the 2025 series rebuilt from its broadcasts) and end with Continue watching and My List.
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, CountryCode, Icon, LiveTag, Page, cx } from '../components/ui';
import { ARCHIVE, CLASSIC_RANGE, archiveArt, archiveEvent, broadcastsOf, type ArchiveYear } from './archive';
import { videoById, type Video } from './catalog';
import { VideoCard, VideoRow } from './detail';
import { bestOf2003 } from './library';
import { PersonalRows } from './pages';
import { CASTS, LIVE, NEXT, SERIES, SERIES_DAYS, castClip, castStill, castVideoId, fmtDay, seriesDay, type Cast } from './series2025';

const enterFullScreen = () => {
  document.documentElement.requestFullscreen?.().catch(() => {});
};
/** The day of an event that was televised last (its final table): the one to open. */
const lastDay = (id: string) => {
  const ref = archiveEvent(id);
  return ref ? broadcastsOf(ref).at(-1) : undefined;
};
const defined = <T,>(x: T | undefined): x is T => !!x;

function Section({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-xl sm:text-2xl">{title}</h2>
          {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
const more = (to: string, label: string) => (
  <Link to={to} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
    {label} →
  </Link>
);

/** For the review: which draft this is, and what the demo stands on. */
function DraftBar() {
  const { pathname } = useLocation();
  const b = pathname === '/home-b';
  const tab = (to: string, on: boolean, label: string) => (
    <Link to={to} aria-current={on ? 'page' : undefined} className={cx('rounded-full px-3 py-1 text-sm font-semibold', on ? 'bg-text text-bg' : 'text-muted hover:text-text')}>
      {label}
    </Link>
  );
  return (
    <div className="border-b border-line bg-surface">
      <Page className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5">
        <div className="flex items-center gap-1" role="navigation" aria-label="Home drafts">
          <span className="mr-2 text-xs font-bold tracking-wide text-gold-strong uppercase">Home draft</span>
          {tab('/', !b, 'A · Series hub')}
          {tab('/home-b', b, 'B · WSOP history')}
        </div>
        <p className="text-xs text-muted">Demo day: Jun 17, 2025. The 2025 WSOP rebuilt from its own broadcasts; results from the 2025 record.</p>
      </Page>
    </div>
  );
}

// ---- A · Series hub ---------------------------------------------------------------------------------

/** The series bar: where we are in the series, and its televised events on one line (as F1 TV's round bar). */
function SeriesBar() {
  const today = seriesDay(SERIES.today);
  const pos = (iso: string) => `${((seriesDay(iso) - 1) / (SERIES_DAYS - 1)) * 100}%`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm">
          <span className="font-bold">{SERIES.name}</span> <span className="text-muted">· {SERIES.place}</span>
        </p>
        <p className="text-sm text-muted tnum">
          {fmtDay(SERIES.start)} – {fmtDay(SERIES.end)} · <span className="font-semibold text-text">Day {today} of {SERIES_DAYS}</span> · {SERIES.events} bracelet events
        </p>
      </div>
      <div className="relative h-8" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-line" />
        <span className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-gold" style={{ width: pos(SERIES.today) }} />
        {CASTS.map((c) => (
          <span key={c.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(c.date) }} title={`#${c.number} · ${fmtDay(c.date)}`}>
            <span className={cx('block rounded-full', c.state === 'live' ? 'size-3.5 bg-live ring-4 ring-live/25' : c.state === 'replay' ? 'size-2.5 bg-gold' : 'size-2.5 border-2 border-line-strong bg-bg')} />
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveHero() {
  const clip = castClip(LIVE);
  return (
    <div className="grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Link to={`/watch/${castVideoId(LIVE)}?play=1`} onClick={enterFullScreen} className="relative block aspect-video bg-black" aria-label={`Watch Event #${LIVE.number} live`}>
        {clip && <video src={clip} poster={castStill(LIVE)} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />}
        <LiveTag className="absolute top-3 left-3" />
      </Link>
      <div className="flex flex-col justify-center gap-2 p-6 lg:p-8">
        <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">
          On air now · {fmtDay(LIVE.date)}
        </p>
        <h1 className="text-2xl leading-tight font-bold sm:text-3xl">
          Event #{LIVE.number} · {LIVE.name}
        </h1>
        <p className="text-sm text-muted tnum">
          {LIVE.what} · {LIVE.entries} entries
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={`/watch/${castVideoId(LIVE)}?play=1`} onClick={enterFullScreen}>
            <Button variant="primary" tabIndex={-1}>
              <Icon name="play" size={16} /> Watch live
            </Button>
          </Link>
          <Link to={`/videos/event/${LIVE.id}`}>
            <Button variant="outline" tabIndex={-1}>
              Event page
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted">
          Next on WSOP TV: #{NEXT.number} {NEXT.name}, {NEXT.what.toLowerCase()} · {fmtDay(NEXT.date)}
        </p>
      </div>
    </div>
  );
}

function CastCard({ c }: { c: Cast }) {
  const still = castStill(c);
  const to = c.state === 'upcoming' ? `/videos/event/${c.id}` : c.state === 'live' ? `/watch/${castVideoId(c)}?play=1` : `/watch/${castVideoId(c)}?play=1`;
  return (
    <Link to={to} onClick={c.state === 'upcoming' ? undefined : enterFullScreen} className="group flex min-w-0 flex-col gap-2">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        {still ? (
          <img src={still} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        ) : (
          <span className="absolute inset-0 flex items-end p-3">
            <span className="font-display text-4xl leading-none text-muted tnum">#{c.number}</span>
          </span>
        )}
        <span className="absolute top-2 left-2">
          {c.state === 'live' ? (
            <LiveTag />
          ) : (
            <span className={cx('rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase', c.state === 'replay' ? 'bg-black/75 text-white' : 'bg-surface text-muted')}>{c.state === 'replay' ? 'Replay' : 'Upcoming'}</span>
          )}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted tnum">
          {fmtDay(c.date)}
          {c.dateTo && ` – ${fmtDay(c.dateTo)}`} · {c.what}
        </span>
        <span className="block truncate font-semibold group-hover:text-gold-strong">
          #{c.number} · {c.name}
        </span>
        {c.winner && (
          <span className="block truncate text-xs text-muted">
            Won by <span className="text-text">{c.winner.name}</span> <CountryCode cc={c.winner.cc} /> · {c.winner.prize}
          </span>
        )}
      </span>
    </Link>
  );
}

/** The same event in earlier years (as F1 TV's "From the archive" for the current circuit). */
function SameEventBefore() {
  const ids = ['2024-lv-55', '2023-lv-40', '2022-lv-50', '2021-lv-82'];
  const vs = ids.map(lastDay).filter(defined);
  return (
    <Section title="From the archive: the $250,000 Super High Roller" note="The final tables of this event in earlier years" action={more('/videos', 'Browse years')}>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {vs.map((v) => (
          <VideoCard key={v.id} v={v} href={`/watch/${v.id}?play=1`} onOpen={enterFullScreen} />
        ))}
      </div>
    </Section>
  );
}

const DECADES = [
  { label: '2020s', match: (y: ArchiveYear) => y.year >= 2020 },
  { label: '2010s', match: (y: ArchiveYear) => y.year >= 2010 && y.year < 2020 },
  { label: '2000s', match: (y: ArchiveYear) => y.year >= 2003 && y.year < 2010 },
  { label: 'Classics', match: (y: ArchiveYear) => !!y.classic },
];
function ArchiveDecades() {
  return (
    <Section title="The WSOP archive" note="Every year in the archive, by decade">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DECADES.map((d) => {
          const ys = ARCHIVE.filter(d.match);
          const newest = ys[0];
          const art = newest ? archiveArt(`${newest.year}-lv-main`) : '';
          return (
            <Link key={d.label} to="/videos" className="group relative block aspect-[16/10] overflow-hidden rounded-card bg-surface-2">
              {art && <img src={art} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                <span className="block font-display text-3xl leading-none">{d.label}</span>
                <span className="mt-1 block text-xs text-white/80 tnum">
                  {ys.length ? `${ys.at(-1)!.year} – ${ys[0].year}` : ''} · {ys.length} years in the archive
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

export function HomeA() {
  return (
    <>
      <DraftBar />
      <Page className="space-y-12 py-8">
        <div className="space-y-5">
          <SeriesBar />
          <LiveHero />
        </div>
        <Section title="On WSOP TV this series" note="The televised events of the 2025 WSOP, in order" action={more('/schedule', 'Schedule')}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4">
            {CASTS.map((c) => (
              <CastCard key={c.id} c={c} />
            ))}
          </div>
        </Section>
        <SameEventBefore />
        <ArchiveDecades />
        <VideoRow title="Best of 2003 WSOP" videos={bestOf2003()} />
        <PersonalRows />
      </Page>
    </>
  );
}

// ---- B · WSOP history ---------------------------------------------------------------------------------

/** Live as one thin band: what's on now and what's next. */
function LiveBand() {
  return (
    <div className="border-b border-line">
      <Page className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <LiveTag />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Event #{LIVE.number} · {LIVE.name}</span> <span className="text-muted">· {LIVE.what} · 2025 WSOP, day {seriesDay(SERIES.today)}</span>
        </p>
        <p className="hidden text-sm text-muted md:block">
          Next: #{NEXT.number} {NEXT.name} · {fmtDay(NEXT.date)}
        </p>
        <Link to={`/watch/${castVideoId(LIVE)}?play=1`} onClick={enterFullScreen}>
          <Button variant="primary" tabIndex={-1}>
            <Icon name="play" size={16} /> Watch live
          </Button>
        </Link>
      </Page>
    </div>
  );
}

/** One tile per year: the Main Event as the archive holds it. */
function YearTiles({ years, label }: { years: ArchiveYear[]; label: (y: ArchiveYear) => string }) {
  return (
    <ul className="hscroll gap-4 [&>*]:w-[44%] sm:[&>*]:w-[calc((100%-3rem)/4)] lg:[&>*]:w-[calc((100%-5rem)/6)]">
      {years.map((y) => {
        const id = `${y.year}-lv-main`;
        const has = !!archiveEvent(id);
        return (
          <li key={y.year} className="min-w-0">
            <Link to={has ? `/videos/event/${id}` : `/videos/year/${y.year}`} className="group block">
              <span className="relative block aspect-[3/4] overflow-hidden rounded-card bg-surface-2">
                <img src={archiveArt(id)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" aria-hidden />
                <span className="absolute bottom-3 left-3 font-display text-4xl leading-none text-white tnum">{y.year}</span>
              </span>
              <span className="mt-2 block truncate text-xs text-muted">{label(y)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const SERIES_WORLD = [
  { key: 'eu', name: 'WSOP Europe' },
  { key: 'pa', name: 'WSOP Paradise' },
  { key: 'apac', name: 'WSOP Asia-Pacific' },
  { key: 'circuit', name: 'WSOP Circuit' },
] as const;
function AroundTheWorld() {
  const tiles = SERIES_WORLD.map((s) => {
    const ys = ARCHIVE.filter((y) => y.series.some((x) => x.key === s.key));
    const ev = ys[0]?.series.find((x) => x.key === s.key)?.events[0];
    return { ...s, ys, art: ev ? archiveArt(ev.id) : '' };
  }).filter((t) => t.ys.length);
  return (
    <Section title="WSOP around the world" note="The series outside Las Vegas, as the archive holds them">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.key} to={`/videos/year/${t.ys[0].year}`} className="group relative block aspect-[16/10] overflow-hidden rounded-card bg-surface-2">
            {t.art && <img src={t.art} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden />
            <span className="absolute inset-x-0 bottom-0 p-4 text-white">
              <span className="block text-lg leading-tight font-bold">{t.name}</span>
              <span className="mt-1 block text-xs text-white/80 tnum">
                {t.ys
                  .map((y) => y.year)
                  .reverse()
                  .join(' · ')}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function HomeB() {
  const modern = ARCHIVE.filter((y) => !y.classic && y.year <= 2025);
  const classics = ARCHIVE.filter((y) => y.classic);
  const replays = CASTS.filter((c) => c.state === 'replay')
    .map((c) => videoById(castVideoId(c)))
    .filter(defined);
  const toc = ['2023-lv-4', '2022-lv-89', '2005-lv-tournament-of-champions', '2004-lv-tournament-of-champions'].map(lastDay).filter(defined);
  const mainNote = (y: ArchiveYear) => {
    const ref = archiveEvent(`${y.year}-lv-main`);
    return ref ? `Main Event · ${ref.event.days.length} broadcast${ref.event.days.length === 1 ? '' : 's'}` : `${y.series.reduce((n, x) => n + x.events.length, 0)} events (no Main Event broadcast)`;
  };
  return (
    <>
      <DraftBar />
      <LiveBand />
      <Page className="space-y-12 py-8">
        <Section title="The Main Event, 2003 – 2025" note="Every Main Event in the archive, newest first" action={more('/videos', 'All years')}>
          <YearTiles years={modern} label={mainNote} />
        </Section>
        <VideoRow title="2025 WSOP Las Vegas so far" videos={replays as Video[]} />
        <Section title={`WSOP Classics, ${CLASSIC_RANGE}`} note="The Main Event from Binion’s Horseshoe, as it was broadcast">
          <YearTiles years={classics} label={() => 'Main Event broadcast'} />
        </Section>
        <VideoRow title="Best of 2003 WSOP" videos={bestOf2003()} />
        <VideoRow title="Tournament of Champions" videos={toc} />
        <AroundTheWorld />
        <PersonalRows />
      </Page>
    </>
  );
}
