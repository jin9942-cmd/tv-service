// v8 Home, after Chris's write-up of Michael's feedback: a tournament hub, not a row of loose videos.
//  Top: live first (the table on air, what comes next) or, off air, the championship archive (the Main Event, the
//  Classics, the bracelet legends). Then the 24/7 channels, the Event Center (this series' final tables and results),
//  Continue watching only once there is something to continue, the Main Event year by year, the bracelet legends,
//  the events that come back every year, hands, the Classics, every series, and My List last.
//  Two drafts differ only in the top: A the featured slides, B the WSOP TV channel player. ?mode=live shows the on-air
//  state (on 2025 footage, marked as an example); ?results=hide hides winners and prizes (spoiler-free).
import { useState, type ReactNode } from 'react';
import { useTick } from '../state/app';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Button, CountryCode, Icon, LiveTag, Page, cx } from '../components/ui';
import { ARCHIVE, CLASSIC_RANGE, archiveArt, archiveEvent, type ArchiveYear } from './archive';
import { VideoCard } from './detail';
import { COLLECTIONS } from './collections';
import { PersonalRows, TodayCards } from './pages';
import { LegendsRow } from './browse';
import { paradiseHands } from './library';
import { CASTS, castClip, castHero, castStill, castVideoId, fmtDay, type Cast } from './series2025';

const enterFullScreen = () => {
  document.documentElement.requestFullscreen?.().catch(() => {});
};

// ---- Hero (the approved v4 hero: big one-line title, the facts line, one promo line, one wide button, dots) ----

interface Slide {
  img: string;
  pos?: string;
  /** A muted preview of the broadcast over the photo. */
  video?: string;
  live?: boolean;
  /** Marked as an example (2025 footage standing in for the 2027 series). */
  example?: boolean;
  kicker: string;
  title: string;
  facts: ReactNode[];
  line: string;
  to: string;
  full?: boolean;
  cta: string;
}
/** Spoiler-free: ?results=hide keeps winners and prizes off the Home. */
function useHideResults() {
  const [p] = useSearchParams();
  return p.get('results') === 'hide';
}
const withParam = (search: string, k: string, v?: string) => {
  const p = new URLSearchParams(search);
  if (v) p.set(k, v);
  else p.delete(k);
  const s = p.toString();
  return s ? `?${s}` : '';
};
const castSlide = (c: Cast, video = false, hide = false): Slide => ({
  img: castHero(c)!,
  video: video ? castClip(c) : undefined,
  kicker: `2025 · World Series of Poker · Event #${c.number}`,
  title: c.short,
  facts: [
    `${c.what} · ${fmtDay(c.date)}`,
    `${c.entries.toLocaleString('en-US')} entries`,
    hide ? 'Result hidden' : (
      <>
        Won by {c.winner.name} <CountryCode cc={c.winner.cc} />
      </>
    ),
  ],
  line: hide ? 'The final table, start to finish' : `The final table, start to finish · First prize ${c.winner.prize}`,
  to: `/watch/${castVideoId(c)}?play=1`,
  full: true,
  cta: 'Watch the final table',
});
const MAIN = CASTS[0];
const SHR = CASTS.find((c) => c.number === 46)!;
const PPC = CASTS.find((c) => c.number === 66)!;

/**
 * The Home's three states. Off-season is today (the 2025 series is the latest season). On air and between broadcasts
 * are examples on a day of the 2025 series: Jun 17 (#46 final table on air) and Jun 18 (next: #66, Jun 28).
 */
export type Mode = 'live' | 'between' | 'off';
const MODE_DAY: Record<Mode, string> = { live: '2025-06-17', between: '2025-06-18', off: '2025-12-31' };
function useMode(): Mode {
  const [p] = useSearchParams();
  const m = p.get('mode');
  return m === 'live' || m === 'between' ? m : 'off';
}
/** The 2025 final tables before the mode's day (all of them off-season), newest first. */
const playedBy = (mode: Mode) => CASTS.filter((c) => c.date < MODE_DAY[mode]);
const LIVE_EXAMPLE: Slide = {
  img: castHero(SHR)!,
  video: castClip(SHR),
  live: true,
  example: true,
  kicker: `World Series of Poker · Las Vegas · Event #${SHR.number}`,
  title: SHR.short,
  facts: [SHR.what, `${SHR.entries} entries`, 'On air now'],
  line: 'Example of the live screen, with the 2025 broadcast · Next: #66 Poker Players Championship',
  to: `/watch/${castVideoId(SHR)}?play=1`,
  full: true,
  cta: 'Watch live',
};
const NEXT_EXAMPLE: Slide = {
  img: castHero(PPC)!,
  example: true,
  kicker: `Next on WSOP TV · ${fmtDay(PPC.date)}`,
  title: PPC.short,
  facts: [`Event #${PPC.number}`, PPC.what, 'Live on WSOP TV'],
  line: 'Nothing on air right now: the next broadcast, then the latest final table',
  to: '/schedule',
  cta: 'Remind me',
};
const heroFor = (mode: Mode, hide: boolean): Slide[] =>
  mode === 'live'
    ? [LIVE_EXAMPLE, castSlide(playedBy('live')[0], false, hide), NEXT_EXAMPLE_AFTER_LIVE]
    : mode === 'between'
      ? [NEXT_EXAMPLE, castSlide(SHR, true, hide), CLASSICS_SLIDE]
      : [castSlide(MAIN, true, hide), CLASSICS_SLIDE, LEGENDS_SLIDE];
/** On air: what follows the table on air (from the 2025 schedule). */
const NEXT_EXAMPLE_AFTER_LIVE: Slide = {
  img: castHero(PPC)!,
  example: true,
  kicker: `Up next on WSOP TV · ${fmtDay(PPC.date)}`,
  title: PPC.short,
  facts: [`Event #${PPC.number}`, PPC.what, 'Live on WSOP TV'],
  line: 'The next final table on the schedule',
  to: '/schedule',
  cta: 'See the schedule',
};
/** Off air: the bracelet legends (the all-time list, from the WSOP record). */
const LEGENDS_SLIDE: Slide = {
  img: archiveArt('1989-lv-main'),
  kicker: 'Bracelet Legends',
  title: 'The most bracelets of all time',
  facts: ['Phil Hellmuth · 17 bracelets', 'Main Event champion 1989'],
  line: 'The players with the most WSOP bracelets, and the broadcasts they played in',
  to: '/videos/players',
  cta: 'Meet the legends',
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
              {sl.example && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] text-white/90">Example</span>}
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

/** The state switch for the review: on air (an example on 2025 footage) or off air (today). */
export function ModeSwitch() {
  const { pathname, search } = useLocation();
  const mode = useMode();
  const opt = (m: Mode, label: string) => (
    <Link key={m} to={{ pathname, search: withParam(search, 'mode', m === 'off' ? undefined : m) }} aria-current={mode === m ? 'true' : undefined} className={cx('rounded-full px-3 py-1 text-xs font-semibold', mode === m ? 'bg-gold text-ink' : 'text-muted hover:text-text')}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center gap-1" role="navigation" aria-label="Home state">
      <span className="mr-1 text-xs font-bold tracking-wide text-gold-strong uppercase">State</span>
      {opt('live', 'On air (example)')}
      {opt('off', 'Off air (today)')}
    </div>
  );
}

/** Spoiler-free switch: results shown (default) or hidden. */
function ResultsSwitch() {
  const { pathname, search } = useLocation();
  const hide = useHideResults();
  const opt = (h: boolean, label: string) => (
    <Link to={{ pathname, search: withParam(search, 'results', h ? 'hide' : undefined) }} aria-current={hide === h ? 'true' : undefined} className={cx('rounded-full px-3 py-1 text-xs font-semibold', hide === h ? 'bg-gold text-ink' : 'text-muted hover:text-text')}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center gap-1" role="navigation" aria-label="Results">
      <span className="mr-1 text-xs font-bold tracking-wide text-gold-strong uppercase">Results</span>
      {opt(false, 'Show')}
      {opt(true, 'Hide (spoiler-free)')}
    </div>
  );
}

/** For the review: which draft this is, and what the demo stands on. */
function DraftBar() {
  const { pathname, search } = useLocation();
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
          {tab(`/${search}`, !b, 'A · Featured')}
          {tab(`/home-b${search}`, b, 'B · Channel')}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ModeSwitch />
          <ResultsSwitch />
        </div>
      </Page>
    </div>
  );
}

// ---- Shared rows and A · Featured ---------------------------------------------------------------------------------

function CastCard({ c, hide }: { c: Cast; hide?: boolean }) {
  return (
    <Link to={`/watch/${castVideoId(c)}?play=1`} onClick={enterFullScreen} className="group flex min-w-0 flex-col gap-2">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={castStill(c)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted tnum">
          {fmtDay(c.date)} · {c.what}
        </span>
        <span className="block truncate font-semibold group-hover:text-gold-strong">
          #{c.number} · {c.name}
        </span>
        <span className="block truncate text-xs text-muted">
          {hide ? (
            `${c.entries.toLocaleString('en-US')} entries · Result hidden`
          ) : (
            <>
              Won by <span className="text-text">{c.winner.name}</span> <CountryCode cc={c.winner.cc} /> · {c.winner.prize}
            </>
          )}
        </span>
      </span>
    </Link>
  );
}

/** Collections: the named sets the archive holds (src/v4/collections.ts), as wide tiles. */
function Collections() {
  const tiles = COLLECTIONS.map((c) => ({ c, vs: c.videos(), ys: c.years() })).filter((x) => x.vs.length);
  return (
    <Section title="By event" note="The events that come back every year, and the program series in the archive">
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

/** Hands: the hand clips the archive holds (the 2024 WSOP Paradise Super Main Event). */
function HandsRow({ hide }: { hide: boolean }) {
  const vs = paradiseHands().slice(0, 12);
  if (!vs.length) return null;
  return (
    <Section title="Hands" note="Big hands from the 2024 WSOP Paradise Super Main Event" action={more('/videos/highlights', 'View More')}>
      <ul className="hscroll gap-4 [&>*]:w-[60%] sm:[&>*]:w-[calc((100%-3rem)/4)] lg:[&>*]:w-[calc((100%-5rem)/6)]">
        {vs.map((v) => (
          <li key={v.id} className="min-w-0">
            <VideoCard v={hide ? { ...v, title: v.title.replace(/\s*[-–—:]\s*(wins|takes|busts|eliminat).*$/i, '') } : v} href={`/watch/${v.id}?play=1`} onOpen={enterFullScreen} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * The rows both drafts share, in order (Chris's write-up: curation → the series → the archive; personal rows only
 * when they have something): the 24/7 channels, the Event Center, Continue watching (once there is something), the
 * Main Event year by year, the bracelet legends, by event, hands, the Classics, every series, My List.
 */
function SharedRows({ mode }: { mode: Mode }) {
  const now = useTick(15_000);
  const hide = useHideResults();
  const classics = ARCHIVE.filter((y) => y.classic);
  const modern = ARCHIVE.filter((y) => !y.classic && y.year < 2025);
  const mainNote = (y: ArchiveYear) => {
    const ref = archiveEvent(`${y.year}-lv-main`);
    return ref ? `Main Event · ${ref.event.days.length} broadcast${ref.event.days.length === 1 ? '' : 's'}` : `${y.series.reduce((n, x) => n + x.events.length, 0)} events (no Main Event broadcast)`;
  };
  const played = playedBy(mode);
  return (
    <Page className="space-y-12 py-8">
      <section aria-label="24/7 channels">
        <h2 className="mb-3 text-xl sm:text-2xl">24/7 On-Demand</h2>
        <TodayCards now={now} />
      </section>
      <Section
        title="Event Center · 2025 World Series of Poker"
        note={mode === 'off' ? 'The latest series: its final tables, newest first' : 'Example on the 2025 series: on air now, then the final tables so far'}
        action={more('/videos/year/2025', 'View More')}
      >
        <ul className="hscroll gap-5 [&>*]:w-[72%] sm:[&>*]:w-[calc((100%-2.5rem)/3)] lg:[&>*]:w-[calc((100%-3.75rem)/4)]">
          {mode === 'live' && (
            <li className="min-w-0">
              <Link to={`/watch/${castVideoId(SHR)}?play=1`} onClick={enterFullScreen} className="group flex min-w-0 flex-col gap-2">
                <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2 ring-2 ring-live">
                  <img src={castStill(SHR)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  <LiveTag className="absolute top-2 left-2" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">On air now · {SHR.what}</span>
                  <span className="block truncate font-semibold group-hover:text-gold-strong">
                    #{SHR.number} · {SHR.name}
                  </span>
                  <span className="block truncate text-xs text-muted">{SHR.entries} entries</span>
                </span>
              </Link>
            </li>
          )}
          {played.map((c) => (
            <li key={c.id} className="min-w-0">
              <CastCard c={c} hide={hide} />
            </li>
          ))}
        </ul>
      </Section>
      <PersonalRows only="continue" />
      <Section title="The Main Event, year by year" note="Every Main Event in the archive since 2003" action={more('/videos', 'View More')}>
        <YearTiles years={modern} label={mainNote} />
      </Section>
      <LegendsRow />
      <Collections />
      <HandsRow hide={hide} />
      <Section title={`WSOP Classics: the Binion’s Horseshoe years, ${CLASSIC_RANGE}`} note="The Main Event in downtown Las Vegas, before the poker boom">
        <YearTiles years={classics} label={() => 'Main Event broadcast'} />
      </Section>
      <Tournaments />
      <PersonalRows only="mylist" />
    </Page>
  );
}

export function HomeA() {
  const mode = useMode();
  const hide = useHideResults();
  return (
    <>
      <DraftBar />
      <FeaturedHero key={mode + String(hide)} slides={heroFor(mode, hide)} />
      <SharedRows mode={mode} />
    </>
  );
}

// ---- B · Channel ---------------------------------------------------------------------------------

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

/** The WSOP TV channel in the page (after WatchWPT's top): what it is playing, and its guide under it. */
function ChannelPlayer({ mode }: { mode: Mode }) {
  const live = mode === 'live';
  const hide = useHideResults();
  // On air: the live table. Between broadcasts: the latest final table, with the next broadcast named. Off-season: the
  // latest season's Main Event final table.
  const now = mode === 'off' ? MAIN : SHR;
  const clip = castClip(now);
  const rest = playedBy(mode).filter((c) => c.id !== now.id);
  const guide = [{ when: live ? 'Now · Live' : 'Now', c: now }, ...rest.slice(0, 3).map((c, k) => ({ when: k === 0 ? 'Next' : 'Later', c }))];
  return (
    <div className="bg-black">
      <Page className="py-6">
        <Link to={`/watch/${castVideoId(now)}?play=1`} onClick={enterFullScreen} className="group relative mx-auto block aspect-video max-h-[68vh] w-full overflow-hidden rounded-panel bg-black" aria-label={`Watch the ${now.short} final table`}>
          {clip && <video src={clip} poster={castStill(now)} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-16 sm:p-7 sm:pt-24">
            <span className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-gold-strong uppercase">
              {live && <LiveTag />}
              {mode !== 'off' && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] text-white/90">Example</span>}
              WSOP TV channel · Event #{now.number}
            </span>
            <span className="mt-2 block text-2xl leading-tight font-bold text-white sm:text-4xl">
              {now.short} · Final table{live ? '' : ' · Replay'}
            </span>
            <span className="mt-1 block text-sm text-white/80">
              {live ? `On air now · ${now.entries} entries` : `${fmtDay(now.date)} · ${now.entries.toLocaleString('en-US')} entries${hide ? '' : ` · Won by ${now.winner.name}`}`}
            </span>
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Icon name="play" size={28} />
          </span>
        </Link>
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">
            On the WSOP TV channel
            {mode === 'between' && <span className="ml-2 font-normal text-muted">Next live: #{PPC.number} {PPC.short}, {PPC.what.toLowerCase()} · {fmtDay(PPC.date)}</span>}
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guide.map(({ when, c }) => (
              <li key={c.id} className="min-w-0">
                <Link to={`/watch/${castVideoId(c)}?play=1`} onClick={enterFullScreen} className={cx('group flex items-center gap-3 rounded-card border p-2 hover:border-line-strong', when.startsWith('Now') ? 'border-gold bg-gold-dim' : 'border-line bg-surface')}>
                  <img src={castStill(c)} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded object-cover" />
                  <span className="min-w-0">
                    <span className={cx('block text-[11px] font-bold tracking-wide uppercase', when === 'Now · Live' ? 'text-live' : when === 'Now' ? 'text-gold-strong' : 'text-muted')}>{when}</span>
                    <span className="block truncate text-sm font-semibold group-hover:text-gold-strong">#{c.number} {c.short}</span>
                    <span className="block truncate text-xs text-muted">{c.what} · {fmtDay(c.date)}</span>
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

/** WSOP.com's tournaments, as WSOP TV holds them: tabs by series (as wsop.com's schedule filters), a tile per year. */
const TOUR_TABS = [
  { k: 'lv', label: 'WSOP Las Vegas' },
  { k: 'eu', label: 'WSOP Europe' },
  { k: 'pa', label: 'WSOP Paradise' },
  { k: 'circuit', label: 'Circuit and Super Circuit' },
  { k: 'apac', label: 'WSOP Asia-Pacific' },
] as const;
function Tournaments() {
  const [k, setK] = useState<(typeof TOUR_TABS)[number]['k']>('lv');
  const ys = ARCHIVE.filter((y) => !y.classic && y.series.some((x) => x.key === k));
  return (
    <Section title="Tournaments on WSOP TV" note="Every series in the archive, a year at a time" action={more('/videos', 'View More')}>
      <div className="hscroll mb-4 gap-2" role="tablist" aria-label="Series">
        {TOUR_TABS.map((t) => (
          <button key={t.k} role="tab" aria-selected={k === t.k} onClick={() => setK(t.k)} className={cx('h-9 shrink-0 rounded-full border px-4 text-sm font-semibold uppercase', k === t.k ? 'border-gold bg-gold text-ink' : 'border-line-strong text-muted hover:text-text')}>
            {t.label}
          </button>
        ))}
      </div>
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
  const mode = useMode();
  return (
    <>
      <DraftBar />
      <ChannelPlayer mode={mode} />
      <SharedRows mode={mode} />
    </>
  );
}
