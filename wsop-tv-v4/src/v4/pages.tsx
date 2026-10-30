// v4 — the common watch page, Live, Events, tag pages and Highlights (all built from the catalog and the one card).
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { Button, Icon, LiveTag, Page, cx } from '../components/ui';
import { channelById, channels, programAt, programs, reminderKey, upNext, type LinearChannel } from '../data/channels';
import { commentaryFor } from '../data/shows';
import { ChannelGuide, useProgramReminder } from '../features/channels/Channels';
import { dayById, eventById, events, seriesById } from '../data/mock';
import type { TourEvent } from '../data/types';
import { dayKey, fmtTime } from '../lib/time';
import { duration, money } from '../lib/format';
import { MyListButton } from '../features/library/listActions';
import { NotFound } from '../pages/NotFound';
import { About, TagList, VideoCard, VideoRow, listKind, rowGrid } from './detail';
import { Player } from './Player';
import { CHANNEL_ART } from '../lib/brand';
import { byTag, catalog, channelVideo, classics, highlightClips, isLive, recommended, relatedTo, replays, videoById, type Video } from './catalog';

// ---- watch ------------------------------------------------------------------------------------------

/** Old links: `/live/channels/:id` → the channel in the common player. */
export function ChannelRedirect() {
  const { channelId = '' } = useParams();
  return <Navigate to={`/watch/ch-${channelById(channelId) ? channelId : channels[0].id}`} replace />;
}

export function WatchPage() {
  const { dayId = '' } = useParams();
  const [params] = useSearchParams();
  // Hand cards from v3 pages link to their broadcast with ?clip= — the clip is the video.
  const id = params.get('clip') ?? dayId;
  const now = useTick(15_000);
  const { state } = useApp();
  const v = videoById(id, now);
  if (!v) return <NotFound />;
  const live = isLive(v, state.streamMode);
  const channelId = v.kind === 'channel' ? id.slice(3) : undefined;
  const program = channelId ? programAt(channelId, now) : undefined;
  // Live edge in seconds: a channel counts from the start of what's on; a live broadcast from the day's start.
  const liveEdge = () => {
    if (program) return Math.max(60, (Date.now() - program.start) / 1000);
    const ref = v.dayId ? dayById(v.dayId) : undefined;
    return ref ? Math.max(120, Math.min(v.durationSec, (Date.now() - Date.parse(ref.day.start)) / 1000)) : v.durationSec;
  };
  return <WatchView key={`${v.id}:${program?.id ?? ''}`} v={v} live={live} liveEdge={live ? liveEdge : undefined} channelId={channelId} now={now} />;
}

function WatchView({ v, live, liveEdge, channelId, now }: { v: Video; live: boolean; liveEdge?: () => number; channelId?: string; now: number }) {
  const { state } = useApp();
  // Mini player: scrolling the player out of view docks it bottom-right and it keeps playing.
  const holder = useRef<HTMLDivElement>(null);
  const [mini, setMini] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      const off = r.top < 0 && r.bottom < r.height * 0.3;
      setMini(off);
      if (!off) setClosed(false);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => (window.removeEventListener('scroll', check), window.removeEventListener('resize', check));
  }, []);
  const docked = mini && !closed;
  const backToPlayer = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => window.scrollY > 40 && window.scrollTo(0, 0), 500);
    setMini(false);
  };
  const related = relatedTo(v, 10);
  return (
    <Page className="max-w-[96rem] py-4 sm:py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {/* The holder keeps the player's space while it's docked, so the page doesn't jump. */}
          <div ref={holder} className={cx('overflow-hidden rounded-panel', docked && 'aspect-video border border-dashed border-line')}>
            <div
              className={cx(docked && 'fixed right-3 bottom-20 z-[57] w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-panel bg-black shadow-2xl ring-1 ring-line-strong sm:w-[24rem] md:right-5 md:bottom-5')}
              role={docked ? 'region' : undefined}
              aria-label={docked ? 'Mini player' : undefined}
            >
              {docked && (
                <div className="flex items-center gap-2 bg-surface px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{v.title}</span>
                  <button onClick={backToPlayer} aria-label="Back to the full player" title="Back to the full player" className="rounded-chip p-1.5 text-muted hover:text-text">
                    <Icon name="full" size={16} />
                  </button>
                  <button onClick={() => setClosed(true)} aria-label="Close mini player" title="Close" className="rounded-chip p-1.5 text-muted hover:text-text">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              )}
              <Player v={v} live={live} liveEdge={liveEdge} mini={docked} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-sans text-xl leading-snug font-bold normal-case sm:text-2xl">{v.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                {live && <LiveTag />}
                <span>{v.subtitle}</span>
                {!live && <span>· {duration(v.durationSec)}</span>}
              </p>
            </div>
            {v.kind !== 'channel' && <MyListButton kind={listKind(v)} id={v.id} size="md" />}
          </div>
          <TagList v={v} className="mt-4" />
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-text/85">{v.description}</p>
          <div className="mt-6">
            <About v={v} />
          </div>
        </div>

        <aside className="space-y-6">
          {channelId && <OnThisChannel channelId={channelId} now={now} />}
          <section aria-label="Related videos">
            <h2 className="mb-3 font-sans text-base font-bold normal-case">Related videos</h2>
            <ul className="space-y-3">
              {related.map((x) => (
                <li key={x.id}>
                  <Link to={`/watch/${x.id}`} className="group flex gap-3">
                    <span className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-chip bg-surface-2">
                      <img src={x.thumb} style={{ objectPosition: x.thumbPos }} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                      {isLive(x, state.streamMode) && <LiveTag className="absolute top-1.5 left-1.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-gold-strong">{x.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{x.subtitle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </Page>
  );
}

/** 24/7 channels: what's on now, what's next, and the other channels. */
function OnThisChannel({ channelId, now }: { channelId: string; now: number }) {
  const { state } = useApp();
  const ch = channelById(channelId)!;
  const p = programAt(ch.id, now);
  const next = upNext(ch.id, now, 4);
  return (
    <section aria-label="On this channel" className="rounded-panel border border-line bg-surface p-4">
      <p className="text-sm font-bold">{ch.name}</p>
      {p && (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-xs text-muted tnum">
            <LiveTag /> {fmtTime(p.start, state.tz)} – {fmtTime(p.end, state.tz)}
          </p>
          <p className="mt-1 font-semibold">{p.title}</p>
        </div>
      )}
      <ol className="mt-3 divide-y divide-line border-t border-line">
        {next.map((x) => (
          <li key={x.id} className="flex gap-3 py-2 text-sm">
            <span className="w-16 shrink-0 text-muted tnum">{fmtTime(x.start, state.tz)}</span>
            <span className="min-w-0 truncate">{x.title}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        {channels
          .filter((c) => c.id !== ch.id)
          .map((c) => (
            <Link key={c.id} to={`/watch/ch-${c.id}`} className="rounded-full border border-line-strong px-3 py-1 text-xs font-semibold hover:border-text">
              {c.name}
            </Link>
          ))}
      </div>
    </section>
  );
}

// ---- tag pages ---------------------------------------------------------------------------------------

export function TagPage() {
  const { slug = '' } = useParams();
  if (slug === 'channels') return <Navigate to={`/watch/ch-${channels[0].id}`} replace />;
  const { tag, videos } = byTag(slug);
  if (!tag) return <NotFound />;
  return (
    <Page className="max-w-[96rem]">
      <p className="text-sm text-muted">Tag</p>
      <h1 className="mt-1 text-title">#{tag.label}</h1>
      <p className="mt-1 text-sm text-muted">
        {videos.length} video{videos.length === 1 ? '' : 's'}
      </p>
      <div className={cx(rowGrid, 'mt-6')}>
        {videos.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    </Page>
  );
}

// ---- Highlights ------------------------------------------------------------------------------

const HAND_FILTERS = [
  ['all', 'All'],
  ['all-in', 'All-in'],
  ['big-pot', 'Big pot'],
  ['bluff', 'Bluff'],
  ['bad-beat', 'Bad beat'],
  ['hero-fold', 'Hero fold'],
] as const;

export function HighlightsPage() {
  const [f, setF] = useState<string>('all');
  const list = f === 'all' ? highlightClips : highlightClips.filter((v) => v.tags.some((t) => t.slug === f));
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title">Highlights</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Hand type">
        {HAND_FILTERS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className={cx('h-9 rounded-full border px-4 text-sm font-semibold', f === k ? 'border-text bg-text text-bg' : 'border-line-strong text-muted hover:text-text')}>
            {label}
          </button>
        ))}
      </div>
      <div className={cx(rowGrid, 'mt-6')}>
        {list.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    </Page>
  );
}

export { catalog };

// ---- Home rows ---------------------------------------------------------------------------------------

/** Home rows: Continue watching, Recommended, My List, Classics, Latest replays, Highlights. */
export function HomeRows() {
  const { state, signedIn } = useApp();
  const progressOf = (v: Video) => (state.progress[v.id] ? state.progress[v.id] / v.durationSec : undefined);
  const continuing = signedIn
    ? Object.entries(state.progress)
        .map(([id, sec]) => ({ v: videoById(id), sec }))
        .filter((x): x is { v: Video; sec: number } => !!x.v && x.sec / x.v.durationSec < 0.95)
        .map((x) => x.v)
    : [];
  const started = new Set(continuing.map((v) => v.id));
  const mine = signedIn
    ? [...state.myList]
        .sort((a, b) => b.addedAt - a.addedAt)
        .map((x) => videoById(x.kind === 'archive' ? `classic-${x.id}-finaltable` : x.kind === 'event' ? (catalog.find((v) => v.eventId === x.id && v.kind !== 'clip')?.id ?? '') : x.id))
        .filter((v): v is Video => !!v)
    : [];
  const more = (to: string, label = 'More') => (
    <Link to={to} className="text-sm font-semibold text-muted hover:text-text">
      {label} →
    </Link>
  );
  return (
    <>
      <VideoRow title="Continue watching" videos={continuing} progressOf={progressOf} />
      <VideoRow title="Recommended for you" videos={recommendedRow(started)} />
      <VideoRow title="My List" videos={mine} action={more('/my-list', 'See all')} />
      <VideoRow title="Classics" videos={classics} action={more('/events')} />
      <VideoRow title="Latest replays" videos={[...replays].reverse().filter((v) => !started.has(v.id))} action={more('/events')} />
      <VideoRow title="Highlights" videos={highlightClips} action={more('/highlights')} />
    </>
  );
}
const recommendedRow = (skip: Set<string>) => recommended.filter((v) => !skip.has(v.id));

/** My List page: everything saved, newest first, in the same cards. */
export function MyListPage() {
  const { state, signedIn, requireLogin } = useApp();
  const list = [...state.myList]
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((x) => videoById(x.kind === 'archive' ? `classic-${x.id}-finaltable` : x.kind === 'event' ? (catalog.find((v) => v.eventId === x.id && v.kind !== 'clip')?.id ?? '') : x.id))
    .filter((v): v is Video => !!v);
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title">My List</h1>
      {!signedIn ? (
        <button onClick={() => requireLogin({ reason: 'Sign in to see My List.' })} className="mt-4 text-sm font-semibold text-gold-strong">
          Sign in to see My List →
        </button>
      ) : list.length ? (
        <div className={cx(rowGrid, 'mt-6')}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Nothing saved yet. Use My List on any video to keep it here.</p>
      )}
    </Page>
  );
}

// ---- Live -------------------------------------------------------------------------------------------

/** Seconds into the broadcast at the live edge: a channel counts from the start of what's on, an event from its day's start. */
function liveEdgeFor(v: Video, at: number) {
  if (v.kind === 'channel') {
    const p = programAt(v.id.slice(3), at);
    return () => Math.max(60, (Date.now() - (p?.start ?? Date.now())) / 1000);
  }
  const ref = v.dayId ? dayById(v.dayId) : undefined;
  return () => (ref ? Math.max(120, Math.min(v.durationSec, (Date.now() - Date.parse(ref.day.start)) / 1000)) : v.durationSec);
}

/**
 * Live: something is always playing. The player opens on the first live event (or a 24/7 channel when no event is
 * live); the list beside it switches what's on screen without leaving the page.
 */
export function LivePage() {
  const { state } = useApp();
  const now = useTick(15_000);
  const [params, setParams] = useSearchParams();
  const events = catalog.filter((v) => isLive(v, state.streamMode));
  const chans = channels.map((c) => channelVideo(c.id, now)).filter((v): v is Video => !!v);
  const sources = [...events, ...chans];
  const v = sources.find((x) => x.id === params.get('v')) ?? sources[0];
  const program = v.kind === 'channel' ? programAt(v.id.slice(3), now) : undefined;
  const pick = (id: string) => setParams({ v: id }, { replace: true });
  const upcoming = programs
    .filter((p) => p.start > now && p.start < now + 6 * 3_600_000 && !BREAKS.includes(p.title))
    .sort((a, b) => a.start - b.start)
    .slice(0, 6);
  return (
    <Page className="max-w-[96rem] py-4 sm:py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-panel">
            <Player key={`${v.id}:${program?.id ?? ''}`} v={v} live liveEdge={liveEdgeFor(v, now)} />
          </div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-sans text-xl leading-snug font-bold normal-case sm:text-2xl">{v.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <LiveTag />
                <span>{v.subtitle}</span>
                {program && (
                  <span className="tnum">
                    · {fmtTime(program.start, state.tz)} – {fmtTime(program.end, state.tz)}
                  </span>
                )}
              </p>
            </div>
            <Link to={`/watch/${v.id}`} className="text-sm font-semibold text-muted hover:text-text">
              Details & related →
            </Link>
          </div>
          <TagList v={v} className="mt-4" />
        </div>

        <aside className="space-y-6">
          <section aria-label="Live now">
            <h2 className="mb-3 font-sans text-base font-bold normal-case">Live now</h2>
            {events.length > 0 && (
              <>
                <h3 className="mt-4 mb-2 text-xs font-semibold tracking-wide text-subtle uppercase first:mt-0">Events</h3>
                <ul className="space-y-2">
                  {events.map((x) => (
                <SourceItem key={x.id} x={x} on={x.id === v.id} onPick={pick} />
              ))}
                </ul>
              </>
            )}
            <h3 className="mt-4 mb-2 text-xs font-semibold tracking-wide text-subtle uppercase first:mt-0">24/7 Channels</h3>
            <ul className="space-y-2">
              {chans.map((x) => (
                <SourceItem key={x.id} x={x} on={x.id === v.id} onPick={pick} />
              ))}
            </ul>
          </section>
          <section aria-label="Coming up">
            <div className="mb-2 flex items-end justify-between">
              <h2 className="font-sans text-base font-bold normal-case">Coming up</h2>
              <Link to="/tournaments" className="text-sm font-semibold text-muted hover:text-text">
                Full schedule →
              </Link>
            </div>
            <ol className="divide-y divide-line">
              {upcoming.map((p) => (
                <li key={p.id} className="flex gap-3 py-2 text-sm">
                  <span className="w-16 shrink-0 text-muted tnum">{fmtTime(p.start, state.tz)}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{p.title}</span>
                    <span className="block truncate text-xs text-subtle">{channelById(p.channelId)?.name}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </Page>
  );
}

/** One row of the Live list: thumbnail (play mark when it's on screen), title, where it's from. */
function SourceItem({ x, on, onPick }: { x: Video; on: boolean; onPick: (id: string) => void }) {
  return (
    <li>
      <button onClick={() => onPick(x.id)} aria-current={on || undefined} className={cx('flex w-full gap-3 rounded-card p-2 text-left transition-colors duration-150', on ? 'bg-surface-3' : 'hover:bg-surface-2')}>
        <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-chip bg-surface-2">
          <img src={x.thumb} style={{ objectPosition: x.thumbPos }} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          {on && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45" aria-hidden>
              <Icon name="play" size={18} />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm leading-snug font-semibold">{x.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{x.subtitle}</span>
        </span>
      </button>
    </li>
  );
}

// ---- Schedule ---------------------------------------------------------------------------------------

const BREAKS = ['Coming Up', 'A continuación'];

/**
 * Schedule: pick a channel (cards with what's on now) and a date, see that channel's day in time order,
 * then every channel side by side in the guide below.
 */
export function SchedulePage() {
  const { state } = useApp();
  const now = useTick(30_000);
  const remind = useProgramReminder();
  const today = dayKey(now, state.tz);
  // One chip per date that has programmes, from today on (a week ahead).
  const dates = [...new Set(programs.map((p) => dayKey(p.start, state.tz)))].filter((k) => k >= today).slice(0, 7);
  const [date, setDate] = useState(dates[0]);
  const [chId, setChId] = useState(channels[0].id);
  const ch = channelById(chId)!;
  const ofDay = programs.filter((p) => dayKey(p.start, state.tz) === date);
  const list = ofDay.filter((p) => p.channelId === ch.id && !BREAKS.includes(p.title)).sort((a, b) => a.start - b.start);
  // The guide follows the selected date: next 8 hours today, the whole day on a later date.
  const firstOfDay = Math.min(...ofDay.map((p) => p.start));
  const from = date === today ? undefined : firstOfDay - (firstOfDay % 3_600_000);
  const label = (k: string) => {
    const at = Date.parse(`${k}T12:00:00Z`);
    return { wd: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(at), md: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(at) };
  };
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title">Tournaments</h1>
      <p className="mt-1 text-sm text-muted">All times in your time zone.</p>

      {/* 24/7 channels: the channel's picture, what's on, its time slot, and Watch now. Selecting a card shows its day below. */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Channel">
        {channels.map((c) => (
          <ChannelCard key={c.id} c={c} now={now} selected={c.id === ch.id} onSelect={() => setChId(c.id)} />
        ))}
      </div>

      <div className="hscroll mt-4" role="tablist" aria-label="Date">
        {dates.map((k) => {
          const l = label(k);
          const on = k === date;
          return (
            <button key={k} role="tab" aria-selected={on} onClick={() => setDate(k)} className={cx('flex w-[4.5rem] flex-col items-center rounded-card border py-1.5 transition-colors duration-150', on ? 'border-gold bg-gold-dim text-text' : 'border-line-strong text-muted hover:text-text')}>
              <span className="text-[11px] font-semibold uppercase">{l.wd}</span>
              <span className="text-sm font-bold tnum">{l.md}</span>
            </button>
          );
        })}
      </div>

      <ol className="mt-4 divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
        {list.map((p) => {
          const isNow = p.start <= now && now < p.end;
          const past = p.end <= now;
          const on = state.reminders.includes(reminderKey(p));
          const team = commentaryFor(p);
          return (
            <li key={p.id} className={cx('flex items-center gap-4 px-4 py-3', isNow && 'bg-gold-dim', past && 'opacity-55')}>
              <span className="w-[4.5rem] shrink-0 text-sm font-bold tnum">{fmtTime(p.start, state.tz)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {isNow && <LiveTag />}
                  <span className="truncate text-[15px] font-semibold">{p.title}</span>
                </span>
                <span className="block truncate text-xs text-muted">
                  {p.subtitle}
                  {team && <span className="text-subtle"> · {team}</span>}
                </span>
              </span>
              {isNow ? (
                <Link to={`/live?v=ch-${ch.id}`}>
                  <Button size="sm" variant="primary" tabIndex={-1}>
                    <Icon name="play" size={14} /> Watch
                  </Button>
                </Link>
              ) : (
                !past && (
                  <button
                    onClick={() => remind(p, ch)}
                    aria-pressed={on}
                    aria-label={on ? `Reminder set for ${p.title}` : `Remind me about ${p.title}`}
                    className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-chip border transition-colors duration-150', on ? 'border-gold bg-gold-dim text-gold-strong' : 'border-line-strong text-muted hover:text-text')}
                  >
                    <Icon name="bell" size={16} />
                  </button>
                )
              )}
            </li>
          );
        })}
      </ol>

      <ChannelGuide now={now} active={ch.id} onSelect={setChId} from={from} />
    </Page>
  );
}

// ---- Events -----------------------------------------------------------------------------------------

const eventVideos = (id: string) => catalog.filter((v) => v.eventId === id && v.kind === 'broadcast');

function EventCard({ e }: { e: TourEvent }) {
  const { state } = useApp();
  const list = eventVideos(e.id);
  const cover = list.find((v) => v.title.endsWith('Final Table')) ?? list[list.length - 1];
  const live = list.some((v) => isLive(v, state.streamMode));
  return (
    <Link to={`/events/${e.id}`} className="group block min-w-0">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={cover.thumb} style={{ objectPosition: cover.thumbPos }} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        {live && <LiveTag className="absolute top-2 left-2" />}
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold group-hover:text-gold-strong">{e.name.replace(' World Championship', '')}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {seriesById(e.seriesId).name} · {list.length} broadcast{list.length === 1 ? '' : 's'}
      </span>
    </Link>
  );
}

/** Events: this series by tournament, then WSOP Classics. */
export function EventsPage() {
  const withVideo = events.filter((e) => eventVideos(e.id).length);
  const bySeries = [...new Set(withVideo.map((e) => e.seriesId))];
  return (
    <Page className="max-w-[96rem] space-y-12">
      <h1 className="text-title">Events</h1>
      {bySeries.map((sid) => (
        <section key={sid} aria-label={seriesById(sid).name}>
          <h2 className="mb-3 text-xl sm:text-2xl">{seriesById(sid).name}</h2>
          <div className={rowGrid}>
            {withVideo
              .filter((e) => e.seriesId === sid)
              .map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
          </div>
        </section>
      ))}
      <section aria-label="WSOP Classics">
        <h2 className="mb-3 text-xl sm:text-2xl">WSOP Classics</h2>
        <div className={rowGrid}>
          {classics.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </section>
    </Page>
  );
}

/** One event: its broadcasts in order and its key hands. */
export function EventPage() {
  const { eventId = '' } = useParams();
  const { state } = useApp();
  const e = eventById(eventId);
  const list = e ? eventVideos(e.id) : [];
  if (!e || !list.length) return <NotFound />;
  const live = list.some((v) => isLive(v, state.streamMode));
  const clips = highlightClips.filter((v) => v.eventId === e.id);
  return (
    <Page className="max-w-[96rem] space-y-10">
      <div>
        <Link to="/events" className="text-sm text-muted hover:text-text">
          ← Events
        </Link>
        <h1 className="mt-2 text-title">{e.name.replace(' World Championship', '')}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {live && <LiveTag />}
          <span>
            {seriesById(e.seriesId).name} · {e.game} · Buy-in {e.buyIn ? money(e.buyIn) : 'Invitational'} · {e.entrants.toLocaleString('en-US')} entries · Prize pool {money(e.prizePool)}
          </span>
        </p>
      </div>
      <section aria-label="Broadcasts">
        <h2 className="mb-3 text-xl sm:text-2xl">Broadcasts</h2>
        <div className={rowGrid}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} progress={state.progress[v.id] ? state.progress[v.id] / v.durationSec : undefined} />
          ))}
        </div>
      </section>
      <VideoRow title="Key hands" videos={clips} action={<Link to={`/tag/event-${e.id}`} className="text-sm font-semibold text-muted hover:text-text">All videos →</Link>} />
    </Page>
  );
}

// ---- 24/7 channel cards (Home and Tournaments) ---------------------------------------------------------

/**
 * One 24/7 channel: its picture, what's on, the channel and when it ends, and Watch now. On Tournaments the card
 * selects the channel (`onSelect`); on Home the whole card opens it on Live.
 */
function ChannelCard({ c, now, selected, onSelect }: { c: LinearChannel; now: number; selected?: boolean; onSelect?: () => void }) {
  const { state } = useApp();
  const p = programAt(c.id, now);
  const a = CHANNEL_ART[c.id];
  const hit = "block w-full min-w-0 text-left after:absolute after:inset-0 after:content-['']";
  const text = (
    <>
      <span className="block truncate text-base font-bold" title={p?.title}>
        {p?.title}
      </span>
      <span className="mt-0.5 block truncate text-sm text-muted tnum">
        {c.name}
        {p && ` · until ${fmtTime(p.end, state.tz)}`}
      </span>
    </>
  );
  return (
    <div className={cx('relative flex min-w-0 items-center gap-3.5 rounded-panel border p-3 transition-colors duration-150', selected ? 'border-gold bg-gold-dim' : 'border-line-strong bg-surface hover:border-text/40')}>
      <img src={a.src} style={{ objectPosition: a.pos }} alt="" className="size-16 shrink-0 rounded-card object-cover" />
      <div className="min-w-0 flex-1">
        {/* The whole card is the hit area; the Watch link sits above it. */}
        {onSelect ? (
          <button role="tab" aria-selected={selected} onClick={onSelect} className={hit}>
            {text}
          </button>
        ) : (
          <Link to={`/live?v=ch-${c.id}`} className={hit} aria-label={`${c.name}: ${p?.title ?? ''}`}>
            {text}
          </Link>
        )}
        <Link to={`/live?v=ch-${c.id}`} className="relative z-10 mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-strong hover:underline">
          <Icon name="play" size={14} /> Watch now
        </Link>
      </div>
    </div>
  );
}

/** Home: the four 24/7 channels right under the banner. */
export function TodayCards({ now }: { now: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="24/7 channels">
      {channels.map((c) => (
        <ChannelCard key={c.id} c={c} now={now} />
      ))}
    </div>
  );
}
