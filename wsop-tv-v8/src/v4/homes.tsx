// v8 — two Home drafts for review, both built only from the NAS archive and the 2025 record.
//  A · Series hub (F1 TV on a race weekend): the hero (live, the latest final table), the series bar, the series' televised events, the same
//      event in past years, then the archive.
//  B · WSOP history (WatchWPT): the channel player and its guide on top, then programme-level rows: the Main Event year by year, the Classics
//      and the named collections the archive holds.
// Both stand on Jun 17, 2025 (the 2025 series rebuilt from its broadcasts) and end with Continue watching and My List.
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, CountryCode, Icon, LiveTag, Page, cx } from '../components/ui';
import { ARCHIVE, CLASSIC_RANGE, archiveArt, archiveEvent, type ArchiveYear } from './archive';
import { videoById } from './catalog';
import { VideoCard } from './detail';
import { COLLECTIONS, collectionById } from './collections';
import { PersonalRows } from './pages';
import { CASTS, LIVE, NEXT, SERIES, castClip, castStill, castVideoId, fmtDay, seriesDay, type Cast } from './series2025';

const enterFullScreen = () => {
  document.documentElement.requestFullscreen?.().catch(() => {});
};
const defined = <T,>(x: T | undefined): x is T => !!x;
const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

// ---- Hero (the approved v4 hero: big one-line title, the facts line, one promo line, one wide button, dots) ----

interface Slide {
  img: string;
  pos?: string;
  /** A muted preview of the broadcast over the photo. */
  video?: string;
  live?: boolean;
  kicker: string;
  title: string;
  facts: ReactNode[];
  line: string;
  to: string;
  full?: boolean;
  cta: string;
}
const LIVE_SLIDE: Slide = {
  img: asset('s25/e46-hero.jpg'),
  video: castClip(LIVE),
  live: true,
  kicker: '2025 · World Series of Poker · Las Vegas',
  title: '$250K Super High Roller',
  facts: [`Event #${LIVE.number}`, LIVE.what, `${LIVE.entries} entries`],
  line: `On air now · Day ${seriesDay(SERIES.today)} of the 2025 WSOP · Next: #${NEXT.number} Millionaire Maker, ${fmtDay(NEXT.date)}`,
  to: `/watch/${castVideoId(LIVE)}?play=1`,
  full: true,
  cta: 'Watch live',
};
const lastReplay = CASTS.filter((c) => c.state === 'replay').at(-1)!;
const REPLAY_SLIDE: Slide = {
  img: asset('s25/e38-hero.jpg'),
  kicker: `2025 · Event #${lastReplay.number} · ${fmtDay(lastReplay.date)}`,
  title: '$100K High Roller',
  facts: [
    lastReplay.what,
    `${lastReplay.entries} entries`,
    <>
      Won by {lastReplay.winner!.name} <CountryCode cc={lastReplay.winner!.cc} />
    </>,
  ],
  line: `The final table, start to finish · First prize ${lastReplay.winner!.prize}`,
  to: `/watch/${castVideoId(lastReplay)}?play=1`,
  full: true,
  cta: 'Watch the final table',
};
const CLASSICS_SLIDE: Slide = {
  img: archiveArt('1988-lv-main'),
  kicker: `WSOP Classics · ${CLASSIC_RANGE}`,
  title: 'The Binion’s Horseshoe years',
  facts: [`${ARCHIVE.filter((y) => y.classic).length} Main Events`, 'As they were broadcast'],
  line: 'The Main Event in downtown Las Vegas, before the poker boom',
  to: '/videos',
  cta: 'Browse the Classics',
};

function FeaturedHero({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const sl = slides[i];
  return (
    <div className="relative overflow-clip bg-black" aria-roledescription="carousel" aria-label="Featured">
      <img key={'bg-' + sl.img} src={sl.img} alt="" aria-hidden className="absolute inset-0 hidden size-full scale-110 object-cover opacity-50 blur-3xl md:block" />
      <div className="absolute inset-0 hidden bg-black/50 md:block" aria-hidden />
      <div className="md:absolute md:inset-0 md:mx-auto md:max-w-content md:px-8">
        <div className="hero-photo relative aspect-[16/10] w-full md:absolute md:inset-y-0 md:right-8 md:aspect-auto md:w-[64%]">
          <img key={sl.img} src={sl.img} alt="" className="size-full object-cover" style={{ objectPosition: sl.pos ?? '50% 50%' }} />
          {sl.video && <video key={sl.video} src={sl.video} poster={sl.img} muted autoPlay loop playsInline aria-hidden className="absolute inset-0 size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" aria-hidden />
        </div>
      </div>
      <Page className="relative flex flex-col justify-end pt-2 pb-14 md:min-h-[min(34rem,46vw)] md:pt-12 md:pb-16">
        <div className="max-w-xl" aria-live="polite">
          <div className="flex h-[6.65rem] flex-col justify-end sm:h-[8.7rem]">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-text/90 uppercase sm:text-[13px]">
              {sl.live && <LiveTag className="px-2 py-1 text-xs" />}
              {sl.kicker}
            </p>
            <h1 className="line-clamp-2 text-[2.4rem] leading-[1.02] sm:text-[3.4rem]">{sl.title}</h1>
          </div>
          <p className="mt-3 flex min-h-[2.75rem] flex-wrap content-start items-center gap-x-2 gap-y-1 text-sm font-medium text-text/85 lg:min-h-[1.25rem]">
            {sl.facts.map((x, k) => (
              <span key={k} className="inline-flex items-center gap-2">
                {k > 0 && <span className="text-subtle">·</span>}
                {x}
              </span>
            ))}
          </p>
          <p className="mt-3 line-clamp-2 h-[2.8rem] text-[15px] leading-[1.4rem] text-text/75 sm:line-clamp-1 sm:h-[1.4rem]">{sl.line}</p>
          <div className="mt-6 flex gap-2">
            <Link to={sl.to} onClick={sl.full ? enterFullScreen : undefined}>
              <Button variant="primary" size="lg" tabIndex={-1} className="min-w-52">
                <Icon name="play" size={18} /> {sl.cta}
              </Button>
            </Link>
          </div>
        </div>
      </Page>
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 md:bottom-6">
        {slides.map((x, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}: ${x.title}`} aria-current={k === i} className="group flex h-6 items-center">
            <span className={cx('block h-1 rounded-full transition-all duration-200', k === i ? 'w-8 bg-gold' : 'w-5 bg-white/30 group-hover:bg-white/60')} />
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const vs = (collectionById('super-high-roller')?.videos() ?? []).filter((v) => !v.id.includes('2025-'));
  return (
    <Section title="From the archive: the $250,000 Super High Roller" note="The last televised day of this event, each earlier year in the archive" action={more('/videos', 'Browse years')}>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {vs.map((v) => (
          <VideoCard key={v.id} v={v} href={`/watch/${v.id}?play=1`} onOpen={enterFullScreen} />
        ))}
      </div>
    </Section>
  );
}

/** Collections: the named sets the archive holds (src/v4/collections.ts), as wide tiles. */
function Collections() {
  const tiles = COLLECTIONS.map((c) => ({ c, vs: c.videos(), ys: c.years() })).filter((x) => x.vs.length);
  return (
    <Section title="Collections" note="Sets the archive holds: a recurring event across the years, or a program series">
      <ul className="hscroll gap-4 [&>*]:w-[72%] sm:[&>*]:w-[calc((100%-2rem)/3)] lg:[&>*]:w-[calc((100%-3rem)/4)]">
        {tiles.map(({ c, vs, ys }) => (
          <li key={c.id} className="min-w-0">
            <Link to={`/collections/${c.id}`} className="group relative block aspect-[16/10] overflow-hidden rounded-card bg-surface-2">
              <img src={vs[0].thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                <span className="text-[11px] font-bold tracking-wide text-gold-strong uppercase">
                  Collection · {vs.length} {c.id === 'best-of-2003' ? 'programs' : 'years'}
                </span>
                <span className="mt-1 block text-lg leading-tight font-bold">{c.title}</span>
                <span className="mt-0.5 block text-xs text-white/75 tnum">{ys.length > 1 ? `${Math.min(...ys)} – ${Math.max(...ys)}` : ys[0]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
      <FeaturedHero slides={[LIVE_SLIDE, REPLAY_SLIDE, CLASSICS_SLIDE]} />
      <Page className="space-y-12 py-8">
        <Section title="2025 WSOP on WSOP TV" note="On air now and the final tables so far, newest first" action={more('/schedule', 'Schedule')}>
          <ul className="hscroll gap-5 [&>*]:w-[72%] sm:[&>*]:w-[calc((100%-2.5rem)/3)] lg:[&>*]:w-[calc((100%-3.75rem)/4)]">
            {CASTS.filter((c) => c.state !== 'upcoming')
              .reverse()
              .map((c) => (
                <li key={c.id} className="min-w-0">
                  <CastCard c={c} />
                </li>
              ))}
          </ul>
        </Section>
        <SameEventBefore />
        <Collections />
        <ArchiveDecades />
        <PersonalRows />
      </Page>
    </>
  );
}

// ---- B · WSOP history ---------------------------------------------------------------------------------

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

/** WatchWPT's top: the channel playing in the page, and its guide under it (now, then what follows). */
function ChannelPlayer() {
  const clip = castClip(LIVE);
  const guide = [
    { when: 'Now · Live', title: `#${LIVE.number} ${LIVE.name}`, sub: LIVE.what, img: castStill(LIVE), to: `/watch/${castVideoId(LIVE)}?play=1` },
    ...CASTS.filter((c) => c.state === 'replay')
      .reverse()
      .slice(0, 3)
      .map((c, k) => ({ when: k === 0 ? 'Next · Replay' : 'Later · Replay', title: `#${c.number} ${c.name}`, sub: `${c.what} · ${fmtDay(c.date)}`, img: castStill(c), to: `/watch/${castVideoId(c)}?play=1` })),
  ];
  return (
    <div className="bg-black">
      <Page className="py-6">
        <Link to={`/watch/${castVideoId(LIVE)}?play=1`} onClick={enterFullScreen} className="group relative mx-auto block aspect-video max-h-[68vh] w-full overflow-hidden rounded-panel bg-black" aria-label={`Watch Event #${LIVE.number} live`}>
          {clip && <video src={clip} poster={castStill(LIVE)} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-16 sm:p-7 sm:pt-24">
            <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-white/90 uppercase">
              <LiveTag /> WSOP TV · 2025 WSOP, day {seriesDay(SERIES.today)}
            </span>
            <span className="mt-2 block text-2xl leading-tight font-bold text-white sm:text-4xl">
              Event #{LIVE.number} · {LIVE.name}
            </span>
            <span className="mt-1 block text-sm text-white/80">
              {LIVE.what} · {LIVE.entries} entries
            </span>
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Icon name="play" size={28} />
          </span>
        </Link>
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">WSOP TV channel</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guide.map((g) => (
              <li key={g.title} className="min-w-0">
                <Link to={g.to} onClick={enterFullScreen} className={cx('group flex items-center gap-3 rounded-card border p-2 hover:border-line-strong', g.when.startsWith('Now') ? 'border-gold bg-gold-dim' : 'border-line bg-surface')}>
                  {g.img && <img src={g.img} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded object-cover" />}
                  <span className="min-w-0">
                    <span className={cx('block text-[11px] font-bold tracking-wide uppercase', g.when.startsWith('Now') ? 'text-live' : 'text-muted')}>{g.when}</span>
                    <span className="block truncate text-sm font-semibold group-hover:text-gold-strong">{g.title}</span>
                    <span className="block truncate text-xs text-muted">{g.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Page>
    </div>
  );
}

/** A series outside Las Vegas: one tile per year it is in the archive (as WatchWPT's season tiles), newest first. */
function SeriesYears({ k, title, note }: { k: string; title: string; note: string }) {
  const ys = ARCHIVE.filter((y) => y.series.some((x) => x.key === k));
  if (!ys.length) return null;
  return (
    <Section title={title} note={note}>
      <ul className="hscroll gap-4 [&>*]:w-[44%] sm:[&>*]:w-[calc((100%-3rem)/4)] lg:[&>*]:w-[calc((100%-5rem)/6)]">
        {ys.map((y) => {
          const ser = y.series.find((x) => x.key === k)!;
          const ev = ser.events.find((e) => e.kind === 'Main Event') ?? ser.events[0];
          return (
            <li key={y.year} className="min-w-0">
              <Link to={`/videos/year/${y.year}`} className="group block">
                <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
                  <img src={archiveArt(ev.id)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" aria-hidden />
                  <span className="absolute bottom-2 left-3 font-display text-3xl leading-none text-white tnum">{y.year}</span>
                </span>
                <span className="mt-2 block truncate text-xs text-muted">
                  {ser.events.length} event{ser.events.length === 1 ? '' : 's'} · {ev.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function HomeB() {
  const modern = ARCHIVE.filter((y) => !y.classic && y.year <= 2025);
  const classics = ARCHIVE.filter((y) => y.classic);
  const replays = CASTS.filter((c) => c.state === 'replay')
    .reverse()
    .map((c) => videoById(castVideoId(c)))
    .filter(defined);
  const mainNote = (y: ArchiveYear) => {
    const ref = archiveEvent(`${y.year}-lv-main`);
    return ref ? `Main Event · ${ref.event.days.length} broadcast${ref.event.days.length === 1 ? '' : 's'}` : `${y.series.reduce((n, x) => n + x.events.length, 0)} events (no Main Event broadcast)`;
  };
  return (
    <>
      <DraftBar />
      <ChannelPlayer />
      <Page className="space-y-12 py-8">
        <Section title="2025 WSOP: the final tables so far" note="This year’s televised final tables, newest first" action={more('/videos/year/2025', '2025')}>
          <ul className="hscroll gap-5 [&>*]:w-[72%] sm:[&>*]:w-[calc((100%-2.5rem)/3)] lg:[&>*]:w-[calc((100%-3.75rem)/4)]">
            {replays.map((v) => (
              <li key={v.id} className="min-w-0">
                <VideoCard v={v} href={`/watch/${v.id}?play=1`} onOpen={enterFullScreen} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="WSOP Main Event: every year since 2003" note="The Main Event as it was broadcast, year by year" action={more('/videos', 'All years')}>
          <YearTiles years={modern} label={mainNote} />
        </Section>
        <Section title={`WSOP Classics: the Binion’s Horseshoe years, ${CLASSIC_RANGE}`} note="The Main Event in downtown Las Vegas, before the poker boom">
          <YearTiles years={classics} label={() => 'Main Event broadcast'} />
        </Section>
        <Collections />
        <SeriesYears k="eu" title="WSOP Europe" note="Every WSOP Europe year in the archive" />
        <SeriesYears k="pa" title="WSOP Paradise" note="The Super Main Event in the Bahamas" />
        <SeriesYears k="circuit" title="WSOP Circuit" note="Circuit and Super Circuit stops in the archive" />
        <SeriesYears k="apac" title="WSOP Asia-Pacific" note="WSOP Asia-Pacific in the archive" />
        <PersonalRows />
      </Page>
    </>
  );
}
