// v5 — screens rebuilt from the UX feedback (JC): an editorial Home, Live with one destination per event (24/7 channel
// replays kept apart), a now-first Schedule by date, Browse, the event centre, My List as the personal hub, Highlights
// with a vertical Shorts view, curated archive collections, and the "what's included" section.
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { Avatar, Button, Icon, LiveTag, Page, Spoiler, cx } from '../components/ui';
import { channels, programAt } from '../data/channels';
import { HERO_DAY_ID, dayById, eventById, events, playerById, seatsFor, seriesById } from '../data/mock';
import type { Day, TourEvent } from '../data/types';
import { VENUE_TZ, dayKey, fmtDate, fmtTime, relative, tzAbbr } from '../lib/time';
import { chips, duration, money } from '../lib/format';
import { isBroadcasting, isOnAir, tableDelay } from '../lib/broadcast';
import { NotFound } from '../pages/NotFound';
import { HowToWatchBand } from '../pages/tv';
import { KindChip, VideoCard, VideoRow, rowGrid, useDetail } from './detail';
import { HERO_IMAGES } from '../lib/brand';
import { catalog, channelVideo, classics, clipsOf, eventDays, highlightClips, isLive, recommended, replays, thumbStyle, videoById, type Video } from './catalog';
import { STATUS_LABEL, followAlert, handsOf, journeyOf, type JourneyStatus } from './journey';

const short = (name: string) => name.replace(' World Championship', '');

// ---- shared helpers ------------------------------------------------------------------------------------

/** Continue Watching: started and not finished. Finished = marked as watched, or played to the end of coverage. */
export function useContinue(): { v: Video; sec: number }[] {
  const { state, signedIn } = useApp();
  if (!signedIn) return [];
  return Object.entries(state.progress)
    .map(([id, sec]) => ({ v: videoById(id), sec }))
    .filter((x): x is { v: Video; sec: number } => !!x.v && !state.watched.includes(x.v.id) && x.sec < x.v.durationSec - 60);
}

/** Languages a live broadcast can be watched in (the channels simulcasting it add theirs). */
export function languagesFor(dayId: string | undefined, now: number): string[] {
  const langs = new Set(['English']);
  for (const ch of channels) {
    const p = programAt(ch.id, now);
    if (p?.kind === 'live' && p.dayId === dayId && ch.lang === 'ES') langs.add('Español');
  }
  return [...langs];
}

/** Channels that are simulcasting a live event right now — those are reached through the event, not listed twice. */
const simulcasting = (now: number) => new Set(channels.filter((ch) => programAt(ch.id, now)?.kind === 'live').map((ch) => ch.id));

const upcomingDays = () =>
  events
    .flatMap((e) => e.days.filter((d) => d.status === 'upcoming').map((d) => ({ e, d })))
    .sort((a, b) => a.d.start.localeCompare(b.d.start));

function useDayReminder() {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  return {
    on: (id: string) => state.reminders.includes(`day:${id}`),
    toggle: (id: string, title: string) => {
      if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder.' });
      const key = `day:${id}`;
      const on = state.reminders.includes(key);
      set((s) => ({ reminders: on ? s.reminders.filter((x) => x !== key) : [...s.reminders, key] }));
      toast(on ? 'Reminder removed' : `We'll remind you before ${title} starts`);
    },
  };
}

function Section({ title, kicker, action, children, id }: { title: string; kicker?: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-label={title} id={id}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          {kicker && <p className="mb-1 text-sm text-muted">{kicker}</p>}
          <h2 className="text-xl sm:text-2xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const more = (to: string, label = 'More') => (
  <Link to={to} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
    {label} →
  </Link>
);

/** An upcoming broadcast day: date and time first (venue and yours), then a reminder. */
function UpcomingCard({ e, d }: { e: TourEvent; d: Day }) {
  const { state } = useApp();
  const r = useDayReminder();
  const title = `${short(e.name)} · ${d.label}`;
  return (
    <div className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-4">
      <p className="label text-gold">{fmtDate(d.start, state.tz)}</p>
      <p className="mt-1 text-2xl font-black tnum">
        {fmtTime(d.start, state.tz)} <span className="text-sm font-semibold text-muted">{tzAbbr(state.tz, d.start)}</span>
      </p>
      <Link to={`/events/${e.id}`} className="mt-2 line-clamp-2 font-semibold hover:text-gold-strong">
        {title}
      </Link>
      <p className="mt-0.5 text-xs text-muted">
        {seriesById(e.seriesId).name} · {e.buyIn ? money(e.buyIn) : 'Invitational'} · starts {relative(d.start)}
      </p>
      <div className="mt-auto pt-3">
        <Button size="sm" variant={r.on(d.id) ? 'secondary' : 'outline'} onClick={() => r.toggle(d.id, title)} aria-pressed={r.on(d.id)}>
          <Icon name={r.on(d.id) ? 'check' : 'bell'} size={14} /> {r.on(d.id) ? 'Reminder set' : 'Remind me'}
        </Button>
      </div>
    </div>
  );
}

/** Spoiler-free mode offered where results could show up (Browse, Search, replays, the event centre). */
export function SpoilerPrompt({ className }: { className?: string }) {
  const { state, set, toast } = useApp();
  return (
    <div className={cx('flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3', className)}>
      <Icon name="eye" size={18} className="text-gold" />
      <p className="min-w-0 flex-1 text-sm">
        {state.spoilerFree ? (
          <>
            <b>Spoiler-free is on.</b> <span className="text-muted">Winners, chip counts and results stay hidden until you reveal them.</span>
          </>
        ) : (
          <>
            <b>Catching up later?</b> <span className="text-muted">Turn on spoiler-free to hide winners, chip counts and results everywhere.</span>
          </>
        )}
      </p>
      <Button
        size="sm"
        variant={state.spoilerFree ? 'secondary' : 'outline'}
        onClick={() => {
          set({ spoilerFree: !state.spoilerFree });
          toast(state.spoilerFree ? 'Spoiler-free off' : 'Spoiler-free on — results hidden');
        }}
        aria-pressed={state.spoilerFree}
      >
        {state.spoilerFree ? 'Turn off' : 'Turn on'}
      </Button>
    </div>
  );
}

// ---- Home ------------------------------------------------------------------------------------------------

/** Home with an editorial point of view: why to watch, not just rows of look-alike cards. */
export function HomePage() {
  const { state } = useApp();
  const progress = useContinue();
  const followed = Object.keys(state.followed);
  // Rows don't repeat each other: Recommended skips what's started and the editor's picks; Latest replays skips both.
  const started = new Set(progress.map((x) => x.v.id));
  const recs = recommended.filter((v) => !started.has(v.id) && !mustWatch().some((p) => p.id === v.id));
  return (
    <>
      <PromoBanner />
      <Page className="max-w-[96rem] space-y-14 py-10">
        <VideoRow
          title="Continue watching"
          videos={progress.map((x) => x.v)}
          progressOf={(v) => (state.progress[v.id] ?? 0) / v.durationSec}
        />
        <StorySoFar />
        <MustWatchHands />
        {followed.length > 0 && <FollowedPlayers ids={followed} />}
        <VideoRow title="Recommended for you" videos={recs} reasonOf={reasonFor} />
        <ArchiveCollections />
        <VideoRow title="Latest replays" videos={[...replays].reverse().filter((v) => !started.has(v.id) && !recs.slice(0, 4).some((r) => r.id === v.id))} action={more('/events', 'All events')} reasonOf={() => 'Full broadcast'} />
        <AccessSection />
        <HowToWatchBand />
      </Page>
    </>
  );
}

function reasonFor(v: Video): string {
  if (v.kind === 'classic') return 'From the archive';
  if (v.kind === 'clip') return v.tags[0] ? `More ${v.tags[0].label.toLowerCase()} hands` : 'Most watched this week';
  return v.stage === 'Final Table' ? 'More final table strategy' : 'Because you watched the Main Event';
}

/**
 * Home promotion banner, wsop.com style: still photos (no autoplay) with the title, a line of facts, one promo line and
 * the actions beside them. It promotes fixed picks (this year's Main Event, the archive) and is independent of the
 * channel cards below.
 */
function PromoBanner() {
  const { state } = useApp();
  const { open: openDetail } = useDetail();
  const [slide, setSlide] = useState(0);
  const { event, day } = dayById(HERO_DAY_ID)!;
  const live = isOnAir(state.streamMode);
  const slides = [
    {
      img: HERO_IMAGES.finalTable,
      pos: '50% 60%',
      kicker: live ? 'Live now · Final table' : 'Main Event · Final table',
      title: `Main Event ${day.label}`,
      facts: [`${event.remaining} players left`, event.game, `${money(event.firstPrize)} to the winner`],
      line: 'Live from Las Vegas · Hole cards on a 30-minute delay',
      actions: (
        <>
          <Link to={`/watch/${HERO_DAY_ID}`}>
            <Button variant="primary" size="lg" tabIndex={-1}>
              <Icon name="play" size={18} /> Watch
            </Button>
          </Link>
          {/* Details opens the popup layer over the home page (no page change). */}
          <Button variant="secondary" size="lg" onClick={() => openDetail(HERO_DAY_ID)}>
            Details
          </Button>
        </>
      ),
    },
    {
      img: HERO_IMAGES.portrait,
      pos: '50% 20%',
      kicker: 'WSOP Archive',
      title: 'Every final table, on demand',
      facts: ['Classics', 'Full broadcasts', 'Key hands'],
      line: 'Every final table from 2019 to 2025, with every key hand',
      actions: (
        <Link to="/events">
          <Button variant="primary" size="lg" tabIndex={-1}>
            <Icon name="play" size={18} /> Watch
          </Button>
        </Link>
      ),
    },
  ];
  const sl = slides[slide];
  return (
    <div className="relative overflow-hidden bg-black" aria-roledescription="carousel" aria-label="Featured">
      {/* Ambient fill: the same photo, blurred and dimmed, across the whole banner, so the photo never ends in a hard edge. */}
      <img key={'bg-' + sl.img} src={sl.img} alt="" aria-hidden className="absolute inset-0 hidden size-full scale-110 object-cover opacity-50 blur-3xl md:block" />
      <div className="absolute inset-0 hidden bg-black/50 md:block" aria-hidden />
      {/* Photo: on top on phones; on wider screens it sits inside the same content width as the menu, text and cards
          (right side of that box), so it never drifts to the window edge on wide screens. Feathered on every side. */}
      <div className="md:absolute md:inset-0 md:mx-auto md:max-w-content md:px-8">
        <div className="hero-photo relative aspect-[16/10] w-full md:absolute md:inset-y-0 md:right-8 md:aspect-auto md:w-[64%]">
          <img key={sl.img} src={sl.img} alt="" className="size-full object-cover" style={{ objectPosition: sl.pos }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" aria-hidden />
        </div>
      </div>
      <Page className="relative flex flex-col justify-end pt-2 pb-14 md:min-h-[min(34rem,46vw)] md:pt-12 md:pb-16">
        {/* Every block has a fixed height, so the title and the buttons stay put when the slide changes. */}
        <div className="max-w-xl" aria-live="polite">
          <div className="flex h-[4.9rem] items-end sm:h-[6.94rem]">
            <h1 className="line-clamp-2 text-[2.4rem] leading-[1.02] sm:text-[3.4rem]">{sl.title}</h1>
          </div>
          <p className="mt-3 flex min-h-[2.75rem] flex-wrap content-start items-center gap-x-2 gap-y-1 text-sm font-medium text-text/85 lg:min-h-[1.25rem]">
            {sl.facts.map((x, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-subtle">·</span>}
                {x}
              </span>
            ))}
          </p>
          {/* One promo line, never more (fixed height, so the buttons stay put). */}
          <p className="mt-3 line-clamp-2 h-[2.8rem] text-[15px] leading-[1.4rem] text-text/75 sm:line-clamp-1 sm:h-[1.4rem]">{sl.line}</p>
          <div className="mt-6 flex gap-2">{sl.actions}</div>
        </div>
      </Page>
      {/* Slide dots only (no arrows), centred along the bottom edge; each has a tall hit area for touch. */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 md:bottom-6">
        {slides.map((x, i) => (
          <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}: ${x.kicker}`} aria-current={i === slide} className="group flex h-6 items-center">
            <span className={cx('block h-1 rounded-full transition-all duration-200', i === slide ? 'w-8 bg-gold' : 'w-5 bg-white/30 group-hover:bg-white/60')} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * "Road to the final table" (the feedback's "story so far"): one line of facts, then every broadcast day of the event as
 * a card to watch. The chip leader stays behind a tap, whatever the spoiler setting.
 */
function StorySoFar() {
  const { state } = useApp();
  const [leaderShown, setLeaderShown] = useState(false);
  const hero = dayById(HERO_DAY_ID)!;
  const e = hero.event;
  const leader = playerById(seatsFor(HERO_DAY_ID)[0].playerId);
  const days = eventDays(e.id);
  return (
    <Section
      title="Road to the final table"
      kicker={`${short(e.name)} · ${e.entrants.toLocaleString('en-US')} entries · ${money(e.prizePool)} prize pool`}
      action={more(`/events/${e.id}`, 'Event centre')}
    >
      <div className="grid grid-flow-col auto-cols-[minmax(13rem,1fr)] gap-4 overflow-x-auto pb-1">
        {days.map((v) => (
          <VideoCard key={v.id} v={v} progress={state.progress[v.id] ? state.progress[v.id] / v.durationSec : undefined} />
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        {leaderShown ? (
          <>
            Chip leader going in: <b className="text-text">{leader.name}</b>
          </>
        ) : (
          <button onClick={() => setLeaderShown(true)} className="inline-flex items-center gap-1.5 font-semibold text-text/80 hover:text-text">
            <Icon name="eye" size={14} /> Show the chip leader
          </button>
        )}
      </p>
    </Section>
  );
}

/** Editor's picks: three hands, with how long they take. */
const mustWatch = () =>
  [highlightClips.find((v) => v.tags.some((t) => t.slug === 'bluff')), highlightClips.find((v) => v.tags.some((t) => t.slug === 'all-in')), highlightClips.find((v) => v.tags.some((t) => t.slug === 'hero-fold'))].filter((v): v is Video => !!v);

function MustWatchHands() {
  const picks = mustWatch();
  const total = picks.reduce((n, v) => n + v.durationSec, 0);
  return (
    <Section title="3 hands worth your time" kicker={`Editor’s picks · ${duration(total)} in all`} action={more('/highlights', 'All highlights')}>
      <div className="grid gap-5 sm:grid-cols-3">
        {picks.map((v, i) => (
          <VideoCard key={v.id} v={v} reason={['The bluff everyone is talking about', 'All-in for the chip lead', 'A fold nobody else makes'][i]} />
        ))}
      </div>
    </Section>
  );
}

/** Followed players: where they are in the series right now, and why each video is here. */
function FollowedPlayers({ ids }: { ids: string[] }) {
  const { state } = useApp();
  return (
    <Section title="Players you follow" action={more('/players', 'Find players')}>
      <div className="space-y-6">
        {ids.map((id) => {
          const p = playerById(id);
          const j = journeyOf(id, state.streamMode)[0];
          const alert = followAlert(id, state.streamMode);
          // Not the editor's picks again: each hand appears once on Home.
          const picked = new Set(mustWatch().map((v) => v.id));
          const hands = handsOf(id, 12)
            .filter((v) => !picked.has(v.id))
            .slice(0, 3);
          return (
            <div key={id} className="grid gap-4 rounded-panel border border-line bg-surface p-4 sm:p-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div>
                <Link to={`/players/${id}`} className="flex items-center gap-3 hover:text-gold-strong">
                  <Avatar name={p.name} hue={p.hue} size={48} />
                  <span className="text-lg font-bold">{p.name}</span>
                </Link>
                {j && <JourneyChip status={j.status} className="mt-3" />}
                {alert && <p className="mt-2 text-sm text-text/85">{alert}</p>}
                {j?.status === 'onTable' && (
                  <Link to={`/watch/${j.day.id}`} className="mt-3 inline-block">
                    <Button size="sm" variant="primary" tabIndex={-1}>
                      <Icon name="play" size={14} /> Watch their table
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {hands.map((v) => (
                  <VideoCard key={v.id} v={v} reason={`Because you follow ${p.name.split(' ')[0]}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function JourneyChip({ status, className }: { status: JourneyStatus; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        status === 'onTable' ? 'bg-live/15 text-live' : status === 'stillIn' ? 'bg-gold-dim text-gold-strong' : 'bg-surface-3 text-muted',
        className,
      )}
    >
      {status === 'onTable' && <i className="live-dot size-1.5 rounded-full bg-live" aria-hidden />}
      {STATUS_LABEL[status]}
    </span>
  );
}

// ---- archive collections -----------------------------------------------------------------------------------

const withTag = (slug: string) => highlightClips.filter((v) => v.tags.some((t) => t.slug === slug));
export const COLLECTIONS: { id: string; title: string; blurb: string; videos: () => Video[] }[] = [
  { id: 'greatest-final-tables', title: 'Greatest final tables', blurb: 'Classic final tables from the archive, edited for on demand.', videos: () => classics },
  { id: 'legendary-bluffs', title: 'Legendary bluffs', blurb: 'Big lies, bigger pots.', videos: () => withTag('bluff') },
  { id: 'all-in', title: 'All-in, everything on the line', blurb: 'Tournament lives decided on one card.', videos: () => withTag('all-in') },
  { id: 'bad-beats', title: 'Bad beats & comebacks', blurb: 'The hands nobody saw coming.', videos: () => withTag('bad-beat') },
];

function ArchiveCollections() {
  const { state } = useApp();
  // Covers avoid videos already shown on Home (Continue watching, Recommended), so no thumbnail appears twice.
  const shown = new Set([...recommended.map((v) => v.id), ...Object.keys(state.progress)]);
  return (
    <Section title="From the archive" kicker="Curated collections" action={more('/events', 'All classics')}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLLECTIONS.map((c) => {
          const vs = c.videos();
          const cover = [...vs].reverse().find((v) => !shown.has(v.id)) ?? vs[0];
          return (
            <Link key={c.id} to={`/collections/${c.id}`} className="group relative block aspect-[4/3] overflow-hidden rounded-card bg-surface-2">
              {cover && <img src={cover.thumb} style={thumbStyle(cover)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <span className="block text-base leading-tight font-bold sm:text-lg">{c.title}</span>
                <span className="mt-1 block text-xs text-white/75">
                  {vs.length} videos · {c.blurb}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

export function CollectionPage() {
  const { id = '' } = useParams();
  const c = COLLECTIONS.find((x) => x.id === id);
  if (!c) return <NotFound />;
  const vs = c.videos();
  return (
    <Page className="max-w-[96rem]">
      <Link to="/browse" className="text-sm text-muted hover:text-text">
        ← Browse
      </Link>
      <p className="mt-3 text-sm text-muted">Collection</p>
      <h1 className="mt-1 text-title">{c.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {c.blurb} · {vs.length} videos
      </p>
      <div className={cx(rowGrid, 'mt-6')}>
        {vs.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    </Page>
  );
}

// ---- what's included ------------------------------------------------------------------------------------

/** Who can watch what, and what a locked video looks like (the plan details come from WSOP+). */
export function AccessSection() {
  // An earlier day of another event, so the example doesn't repeat a card shown elsewhere on Home.
  const sample = catalog.find((v) => v.kind === 'broadcast' && v.access === 'subscriber' && v.status === 'vod' && v.eventId === 'lv-plo');
  const rows: [string, string, string][] = [
    ['Free', 'No account needed', 'Selected hand clips and the WSOP Classics channel.'],
    ['With a GGPass account', 'Sign in, no plan', 'More hands, some classic final tables and selected replays.'],
    ['With a WSOP+ plan', 'Included in your plan', 'Every live final table and every full replay.'],
  ];
  return (
    <section aria-label="What's included" className="grid gap-6 rounded-panel border border-line bg-surface p-5 sm:p-7 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div>
        <p className="label text-gold">What’s included</p>
        <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">What you can watch</h2>
        <ul className="mt-4 divide-y divide-line">
          {rows.map(([t, sub, d]) => (
            <li key={t} className="grid gap-1 py-3 sm:grid-cols-[13rem_minmax(0,1fr)]">
              <span>
                <span className="block font-bold">{t}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
              <span className="text-sm text-text/85">{d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-subtle">Plan names and what each includes are set by WSOP+.</p>
      </div>
      {sample && (
        <div>
          <p className="mb-2 text-sm text-muted">Not in your plan yet? It looks like this:</p>
          <div className="relative overflow-hidden rounded-card">
            <img src={sample.thumb} style={thumbStyle(sample)} alt="" className="aspect-video w-full object-cover opacity-60" />
            <KindChip label="Full replay" className="absolute top-2 left-2" />
            <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/75 text-white">
              <Icon name="lock" size={14} />
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 text-sm">
              <b className="block">{sample.title}</b>
              <span className="text-xs text-white/80">Included with a WSOP+ plan · tap to see plans</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

// ---- Live & Schedule ----------------------------------------------------------------------------------------

export function LiveTabs({ active }: { active: 'now' | 'schedule' | 'guide' }) {
  const tab = (on: boolean) => cx('-mb-px border-b-2 px-1 pb-2.5 text-[15px] font-semibold transition-colors duration-150', on ? 'border-gold text-text' : 'border-transparent text-muted hover:text-text');
  return (
    <nav aria-label="Live" className="mt-3 flex gap-6 border-b border-line">
      <Link to="/live" className={tab(active === 'now')} aria-current={active === 'now' ? 'page' : undefined}>
        Live now
      </Link>
      <Link to="/schedule" className={tab(active === 'schedule')} aria-current={active === 'schedule' ? 'page' : undefined}>
        Schedule
      </Link>
      <Link to="/schedule/channels" className={tab(active === 'guide')} aria-current={active === 'guide' ? 'page' : undefined}>
        Channel guide
      </Link>
    </nav>
  );
}

/**
 * Live: one destination per live event (feeds and languages are picked inside it), then Coming up and Resume. The
 * 24/7 channels below list only what isn't one of those events — replays and shows, never labelled live.
 */
export function LivePage() {
  const { state } = useApp();
  const now = useTick(15_000);
  const live = catalog.filter((v) => v.kind === 'broadcast' && isLive(v, state.streamMode));
  const resume = useContinue();
  const busy = simulcasting(now);
  const chans = channels
    .filter((c) => !busy.has(c.id))
    .map((c) => channelVideo(c.id, now))
    .filter((v): v is Video => !!v);
  const simul = channels.filter((c) => busy.has(c.id));
  return (
    <Page className="max-w-[96rem] space-y-12">
      <div>
        <h1 className="text-title">Live & Schedule</h1>
        <LiveTabs active="now" />
      </div>
      <Section title="Live now">
        {live.length ? (
          <div className={rowGrid}>
            {live.map((v) => {
              const ref = dayById(v.dayId!)!;
              const st = v.dayId === HERO_DAY_ID ? state.streamMode : ref.day.status;
              const delay = Math.max(0, ...ref.day.tables.map((t) => tableDelay(t, st)));
              return <VideoCard key={v.id} v={v} reason={`${ref.day.tables.length} table${ref.day.tables.length === 1 ? '' : 's'} · ${languagesFor(v.dayId, now).join(', ')}${delay ? ` · ${delay}-min delay` : ''}`} />;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">No event is live right now. Coming up is below.</p>
        )}
      </Section>
      <Section title="Coming up" action={more('/schedule', 'Full schedule')}>
        <div className={rowGrid}>
          {upcomingDays()
            .slice(0, 4)
            .map(({ e, d }) => (
              <UpcomingCard key={d.id} e={e} d={d} />
            ))}
        </div>
      </Section>
      {resume.length > 0 && (
        <VideoRow title="Resume" videos={resume.map((x) => x.v)} progressOf={(v) => (state.progress[v.id] ?? 0) / v.durationSec} />
      )}
      <Section title="24/7 channels" kicker="Replays and shows around the clock" action={more('/schedule/channels', 'Channel guide')}>
        <div className={rowGrid}>
          {chans.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
        {simul.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            {simul.map((c) => c.name).join(', ')} {simul.length === 1 ? 'is' : 'are'} carrying the live events above — open the event and pick the table or language there.
          </p>
        )}
      </Section>
    </Page>
  );
}

/** Schedule: live now and next first, then every broadcast by date; earlier days at the bottom. */
export function SchedulePage() {
  const { state, status } = useStatus();
  const now = useTick(30_000);
  const all = events.flatMap((e) => e.days.map((d) => ({ e, d }))).sort((a, b) => a.d.start.localeCompare(b.d.start));
  const liveNow = all.filter((x) => isBroadcasting(status(x.d)));
  const coming = all.filter((x) => status(x.d) === 'upcoming');
  const today = dayKey(now, state.tz);
  const past = all.filter((x) => status(x.d) === 'vod' && dayKey(x.d.start, state.tz) >= dayKeyShift(today, -7)).reverse();
  const byDate = new Map<string, typeof coming>();
  for (const x of coming) {
    const k = dayKey(x.d.start, state.tz);
    byDate.set(k, [...(byDate.get(k) ?? []), x]);
  }
  return (
    <Page className="max-w-[96rem] space-y-10">
      <div>
        <h1 className="text-title">Live & Schedule</h1>
        <LiveTabs active="schedule" />
        <p className="mt-2 text-sm text-muted">Times in your time zone ({tzAbbr(state.tz)}).</p>
      </div>
      {liveNow.length > 0 && (
        <Section title="Live now">
          <ScheduleList items={liveNow} />
        </Section>
      )}
      {[...byDate.entries()].map(([k, items]) => (
        <Section key={k} title={fmtDate(items[0].d.start, state.tz)}>
          <ScheduleList items={items} />
        </Section>
      ))}
      {past.length > 0 && (
        <details className="group rounded-panel border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
            Earlier this week · {past.length} replays
            <Icon name="chevron" size={18} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line p-3">
            <ScheduleList items={past} />
          </div>
        </details>
      )}
    </Page>
  );
}

const dayKeyShift = (k: string, n: number) => new Date(Date.parse(`${k}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function useStatus() {
  const { state } = useApp();
  return { state, status: (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status) };
}

function ScheduleList({ items }: { items: { e: TourEvent; d: Day }[] }) {
  const { state, status } = useStatus();
  const r = useDayReminder();
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
      {items.map(({ e, d }) => {
        const st = status(d);
        const title = `${short(e.name)} · ${d.label}`;
        return (
          <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="w-24 shrink-0 font-bold tnum">
              {fmtTime(d.start, state.tz)}
              <span className="block text-xs font-normal text-muted">{fmtTime(d.start, VENUE_TZ)} in Las Vegas</span>
            </span>
            <span className="min-w-0 flex-1">
              <Link to={`/events/${e.id}`} className="block truncate font-semibold hover:text-gold-strong">
                {title}
              </Link>
              <span className="block truncate text-xs text-muted">
                {seriesById(e.seriesId).name} · {d.tables.length} table{d.tables.length === 1 ? '' : 's'} · {duration(d.durationMin * 60)}
              </span>
            </span>
            {isBroadcasting(st) ? (
              <Link to={`/watch/${d.id}`}>
                <Button size="sm" variant="primary" tabIndex={-1}>
                  <Icon name="play" size={14} /> Watch live
                </Button>
              </Link>
            ) : st === 'upcoming' ? (
              <Button size="sm" variant={r.on(d.id) ? 'secondary' : 'outline'} onClick={() => r.toggle(d.id, title)} aria-pressed={r.on(d.id)}>
                <Icon name={r.on(d.id) ? 'check' : 'bell'} size={14} /> {r.on(d.id) ? 'Reminder set' : 'Remind me'}
              </Button>
            ) : (
              <Link to={`/watch/${d.id}`}>
                <Button size="sm" variant="secondary" tabIndex={-1}>
                  Watch replay
                </Button>
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---- Browse ------------------------------------------------------------------------------------------------

export function BrowsePage() {
  const tiles: [string, string, string, string][] = [
    ['/events', 'Events', 'Every tournament, its broadcasts and key hands', 'grid2'],
    ['/highlights', 'Highlights', 'Short hand clips, as a grid or Shorts', 'grid4'],
    ['/players', 'Players', 'Profiles, their run in the series, alerts', 'user'],
    ['/schedule', 'Schedule', 'What’s live, what’s next', 'calendar'],
    ['/collections/greatest-final-tables', 'Classics', 'Greatest final tables from the archive', 'history'],
    ['/how-to-watch', 'How to watch', 'Plans, TV apps and devices', 'tv'],
  ];
  return (
    <Page className="max-w-[96rem] space-y-8">
      <h1 className="text-title">Browse</h1>
      <SpoilerPrompt />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([to, t, d, icon]) => (
          <Link key={to} to={to} className="flex items-center gap-4 rounded-panel border border-line bg-surface p-4 hover:border-gold">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-gold">
              <Icon name={icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">{t}</span>
              <span className="block text-sm text-muted">{d}</span>
            </span>
            <Icon name="chevron" size={18} className="-rotate-90 text-muted" />
          </Link>
        ))}
      </div>
      <ArchiveCollections />
    </Page>
  );
}

// ---- Event centre -----------------------------------------------------------------------------------------

const eventVideos = (id: string) => catalog.filter((v) => v.eventId === id && v.kind === 'broadcast');

function EventCard({ e }: { e: TourEvent }) {
  const { state } = useApp();
  const list = eventVideos(e.id);
  const cover = list.find((v) => v.title.endsWith('Final Table')) ?? list[list.length - 1];
  const live = list.some((v) => isLive(v, state.streamMode));
  return (
    <Link to={`/events/${e.id}`} className="group block min-w-0">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={cover.thumb} style={thumbStyle(cover)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        {live ? <LiveTag className="absolute top-2 left-2" /> : <KindChip label="Event" className="absolute top-2 left-2" />}
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold group-hover:text-gold-strong">{short(e.name)}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {e.buyIn ? money(e.buyIn) : 'Invitational'} · {list.length} broadcast{list.length === 1 ? '' : 's'} · {e.game}
      </span>
    </Link>
  );
}

/** Events: live and running events first, then the rest of the series, then the classics. */
export function EventsPage() {
  const { state } = useApp();
  const withVideo = events.filter((e) => eventVideos(e.id).length);
  const running = withVideo.filter((e) => eventVideos(e.id).some((v) => isLive(v, state.streamMode)));
  const rest = withVideo.filter((e) => !running.includes(e));
  const bySeries = [...new Set(rest.map((e) => e.seriesId))];
  return (
    <Page className="max-w-[96rem] space-y-12">
      <h1 className="text-title">Events</h1>
      {running.length > 0 && (
        <Section title="Running now">
          <div className={rowGrid}>
            {running.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </Section>
      )}
      {bySeries.map((sid) => (
        <Section key={sid} title={seriesById(sid).name}>
          <div className={rowGrid}>
            {rest
              .filter((e) => e.seriesId === sid)
              .map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
          </div>
        </Section>
      ))}
      <Section title="WSOP Classics" action={more('/collections/greatest-final-tables', 'Collection')}>
        <div className={rowGrid}>
          {classics.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </Section>
    </Page>
  );
}

/** One event: what's live first (with a catch-up), then the event centre, coming days and every broadcast in order. */
export function EventPage() {
  const { eventId = '' } = useParams();
  const { state } = useApp();
  const now = useTick(15_000);
  const e = eventById(eventId);
  const list = e ? eventDays(e.id) : [];
  if (!e || !list.length) return <NotFound />;
  const liveV = list.find((v) => isLive(v, state.streamMode));
  const clips = clipsOf(e.id);
  const upcoming = e.days.filter((d) => d.status === 'upcoming');
  const current = liveV ? dayById(liveV.dayId!)!.day : e.days.filter((d) => d.status !== 'upcoming').pop()!;
  const seats = [...seatsFor(current.id)].sort((a, b) => b.stack - a.stack);
  return (
    <Page className="max-w-[96rem] space-y-12">
      <div>
        <Link to="/events" className="text-sm text-muted hover:text-text">
          ← Events
        </Link>
        <h1 className="mt-2 text-title">{short(e.name)}</h1>
        <p className="mt-1 text-sm text-muted">
          {seriesById(e.seriesId).name} · #{e.number} · {e.game}
        </p>
      </div>

      {liveV && (
        <section aria-label="Live now" className="grid gap-5 rounded-panel border border-line bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <VideoCard v={liveV} reason={`${dayById(liveV.dayId!)!.day.tables.length} tables · ${languagesFor(liveV.dayId, now).join(', ')}`} />
          <div>
            <p className="label text-gold">Just joining?</p>
            <h2 className="mt-1 text-lg font-bold">Catch up with the key hands, then go live</h2>
            <ol className="mt-3 divide-y divide-line">
              {clips.slice(0, 3).map((c, i) => (
                <li key={c.id}>
                  <Link to={`/watch/${c.id}?catchup=${e.id}`} className="flex items-center gap-3 py-2.5 hover:text-gold-strong">
                    <span className="w-5 text-center font-bold text-subtle tnum">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.title}</span>
                    <span className="text-xs text-muted tnum">{duration(c.durationSec)}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link to={`/watch/${liveV.id}`} className="mt-3 inline-block">
              <Button variant="primary" size="sm" tabIndex={-1}>
                <Icon name="play" size={14} /> Join live
              </Button>
            </Link>
          </div>
        </section>
      )}

      <Section title="Event centre" kicker={liveV ? 'Live · updates with the broadcast' : `After ${current.label}`}>
        <SpoilerPrompt className="mb-4" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <dl className="grid grid-cols-2 gap-2 self-start">
            {(
              [
                ['Entries', e.entrants.toLocaleString('en-US')],
                ['Prize pool', money(e.prizePool)],
                ['First prize', money(e.firstPrize)],
                ['Buy-in', e.buyIn ? money(e.buyIn) : 'Invitational'],
                ['Players left', e.remaining ? String(e.remaining) : '—'],
                ['Blinds', e.blinds ? `${chips(e.blinds.sb)} / ${chips(e.blinds.bb)} · ante ${chips(e.blinds.ante)}` : '—'],
              ] as [string, string][]
            ).map(([k, val]) => (
              <div key={k} className="rounded-card border border-line bg-surface-2 px-3 py-2.5">
                <dt className="text-[11px] font-semibold tracking-wide text-subtle uppercase">{k}</dt>
                <dd className="mt-1 text-sm font-bold tnum">{k === 'Players left' ? <Spoiler k={`left-${e.id}`} inline>{val}</Spoiler> : val}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-panel border border-line bg-surface">
            <p className="border-b border-line px-4 py-2.5 text-sm font-bold">Chip counts · broadcast table, {current.label}</p>
            <Spoiler k={`chips-${e.id}`} label="Chip counts hidden">
              <ol className="divide-y divide-line">
                {seats.slice(0, 8).map((s, i) => {
                  const p = playerById(s.playerId);
                  return (
                    <li key={s.playerId} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-5 text-subtle tnum">{i + 1}</span>
                      <Link to={`/players/${p.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gold-strong">
                        {p.name}
                      </Link>
                      <span className="font-bold tnum">{chips(s.stack)}</span>
                    </li>
                  );
                })}
              </ol>
            </Spoiler>
          </div>
        </div>
      </Section>

      {upcoming.length > 0 && (
        <Section title="Coming up">
          <div className={rowGrid}>
            {upcoming.map((d) => (
              <UpcomingCard key={d.id} e={e} d={d} />
            ))}
          </div>
        </Section>
      )}

      <Section title="All broadcasts" kicker="In order, Day 1 to the final table">
        <div className={rowGrid}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} progress={state.progress[v.id] ? state.progress[v.id] / v.durationSec : undefined} />
          ))}
        </div>
      </Section>
      <VideoRow title="Key hands" videos={clips} />
    </Page>
  );
}

// ---- Highlights ---------------------------------------------------------------------------------------------

const HAND_FILTERS = [
  ['all', 'All'],
  ['all-in', 'All-in'],
  ['big-pot', 'Big pot'],
  ['bluff', 'Bluff'],
  ['bad-beat', 'Bad beat'],
  ['hero-fold', 'Hero fold'],
] as const;

/** Highlights: hand clips as a grid, or Shorts — vertical clips to scroll through one by one. */
export function HighlightsPage() {
  const [f, setF] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'shorts'>('grid');
  const list = f === 'all' ? highlightClips : highlightClips.filter((v) => v.tags.some((t) => t.slug === f));
  const pill = (on: boolean) => cx('h-9 rounded-full border px-4 text-sm font-semibold', on ? 'border-text bg-text text-bg' : 'border-line-strong text-muted hover:text-text');
  return (
    <Page className="max-w-[96rem]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-title">Highlights</h1>
        <div className="flex gap-2" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === 'grid'} onClick={() => setView('grid')} className={pill(view === 'grid')}>
            Grid
          </button>
          <button role="tab" aria-selected={view === 'shorts'} onClick={() => setView('shorts')} className={pill(view === 'shorts')}>
            Shorts
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Hand type">
        {HAND_FILTERS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className={pill(f === k)}>
            {label}
          </button>
        ))}
      </div>
      {view === 'grid' ? (
        <div className={cx(rowGrid, 'mt-6')}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      ) : (
        <Shorts list={list} />
      )}
    </Page>
  );
}

function Shorts({ list }: { list: Video[] }) {
  return (
    <div className="mx-auto mt-6 h-[calc(100dvh-14rem)] max-w-[24rem] snap-y snap-mandatory overflow-y-auto rounded-panel bg-black" aria-label="Shorts">
      {list.map((v) => (
        <article key={v.id} className="relative h-full snap-start overflow-hidden">
          <video className="absolute inset-0 size-full object-cover" src={`${v.media.url}#t=${v.media.start}`} poster={v.thumb} muted loop playsInline autoPlay preload="none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <KindChip label={v.tags[0]?.label ?? 'Hand clip'} />
            <h2 className="mt-2 font-sans text-lg leading-snug font-bold normal-case">{v.title}</h2>
            <p className="text-xs text-white/75">
              {v.playerIds.map((id) => playerById(id).name).join(' vs ')} · {duration(v.durationSec)}
            </p>
            <div className="mt-3 flex gap-2">
              <Link to={`/watch/${v.id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">
                Watch the hand
              </Link>
              {v.dayId && (
                <Link to={`/watch/${v.dayId}`} className="rounded-full border border-white/50 px-3 py-1.5 text-xs font-bold text-white">
                  Full broadcast
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ---- My List: the personal hub -------------------------------------------------------------------------------

/** Everything personal in one place: unfinished broadcasts, followed players on air, reminders, saved videos. */
export function MyListPage() {
  const { state, signedIn, requireLogin } = useApp();
  const resume = useContinue();
  const saved = [...state.myList]
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((x) => videoById(x.kind === 'archive' ? `classic-${x.id}-finaltable` : x.kind === 'event' ? (catalog.find((v) => v.eventId === x.id && v.kind !== 'clip')?.id ?? '') : x.id))
    .filter((v): v is Video => !!v);
  const reminders = state.reminders
    .filter((k) => k.startsWith('day:'))
    .map((k) => dayById(k.slice(4)))
    .filter((x): x is { event: TourEvent; day: Day } => !!x);
  const followed = Object.keys(state.followed);
  if (!signedIn)
    return (
      <Page className="max-w-[96rem]">
        <h1 className="text-title">My List</h1>
        <button onClick={() => requireLogin({ reason: 'Sign in to see My List.' })} className="mt-4 text-sm font-semibold text-gold-strong">
          Sign in to see My List →
        </button>
      </Page>
    );
  return (
    <Page className="max-w-[96rem] space-y-12">
      <h1 className="text-title">My List</h1>
      {resume.length > 0 ? (
        <VideoRow title="Continue watching" videos={resume.map((x) => x.v)} progressOf={(v) => (state.progress[v.id] ?? 0) / v.durationSec} />
      ) : null}
      <Section title="Players you follow" action={more('/players', 'Find players')}>
        {followed.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {followed.map((id) => {
              const p = playerById(id);
              const j = journeyOf(id, state.streamMode)[0];
              return (
                <li key={id}>
                  <Link to={`/players/${id}`} className="flex items-center gap-3 rounded-panel border border-line bg-surface p-3 hover:border-gold">
                    <Avatar name={p.name} hue={p.hue} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{p.name}</span>
                      {j ? <JourneyChip status={j.status} className="mt-1" /> : <span className="text-xs text-muted">Not playing on camera this series</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Follow players to see when they’re on a broadcast table.</p>
        )}
      </Section>
      {reminders.length > 0 && (
        <Section title="Reminders">
          <div className={rowGrid}>
            {reminders.map(({ event, day }) => (
              <UpcomingCard key={day.id} e={event} d={day} />
            ))}
          </div>
        </Section>
      )}
      <Section title="Saved">
        {saved.length ? (
          <div className={rowGrid}>
            {saved.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing saved yet. Use My List on any video to keep it here.</p>
        )}
      </Section>
    </Page>
  );
}

