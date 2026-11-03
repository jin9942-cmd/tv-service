// v4 — the common watch page, Live, Events, tag pages and Highlights (all built from the catalog and the one card).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { Button, Icon, LiveTag, Page, cx } from '../components/ui';
import { channelById, channels, programAt, programs, upNext, type LinearChannel } from '../data/channels';
import { HERO_DAY_ID, dayById, eventById, events, series, seriesById } from '../data/mock';
import type { Day, Series, TourEvent } from '../data/types';
import { VENUE_TZ, dayKey, fmtTime, tzAbbr } from '../lib/time';
import { isBroadcasting } from '../lib/broadcast';
import { duration, money } from '../lib/format';
import { MyListButton } from '../features/library/listActions';
import { NotFound } from '../pages/NotFound';
import { About, TagList, VideoCard, VideoRow, listKind, rowGrid } from './detail';
import { Player } from './Player';
import { CHANNEL_ART, VENUE_ART, artStyle, type Art } from '../lib/brand';
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
                      <img src={x.thumb} style={artStyle({ pos: x.thumbPos, fit: x.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
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

/** 24/7 channels: a clear Now playing block (with how far in it is), Up next, and what's on the other channels. */
function OnThisChannel({ channelId, now }: { channelId: string; now: number }) {
  const { state } = useApp();
  const ch = channelById(channelId)!;
  const p = programAt(ch.id, now);
  const next = upNext(ch.id, now, 8)
    .filter((x) => !['Coming Up', 'A continuación'].includes(x.title))
    .slice(0, 3);
  const label = 'text-[11px] font-bold tracking-wider text-subtle uppercase';
  const left = p ? Math.max(1, Math.round((p.end - now) / 60_000)) : 0;
  const done = p ? (now - p.start) / (p.end - p.start) : 0;
  return (
    <section aria-label="On this channel" className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="font-sans text-lg font-bold normal-case">{ch.name}</h2>
        <span className={label}>24/7 channel</span>
      </div>
      {p && (
        <div className="border-b border-gold/40 bg-gold-dim px-4 py-4">
          <p className="flex items-center gap-2">
            <LiveTag />
            <span className="text-xs font-bold tracking-wider text-gold-strong uppercase">Now playing</span>
          </p>
          <p className="mt-2 text-lg leading-snug font-bold">{p.title}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-gold" style={{ width: `${Math.min(100, done * 100)}%` }} />
          </div>
          <p className="mt-1.5 flex justify-between text-xs text-muted tnum">
            <span>
              {fmtTime(p.start, state.tz)} – {fmtTime(p.end, state.tz)}
            </span>
            <span>{left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : `${left} min`} left</span>
          </p>
        </div>
      )}
      <div className="px-4 py-4">
        <p className={label}>Up next</p>
        <ol className="mt-2 space-y-2.5">
          {next.map((x) => (
            <li key={x.id} className="flex gap-3 text-[15px]">
              <span className="w-[4.5rem] shrink-0 font-semibold tnum">{fmtTime(x.start, state.tz)}</span>
              <span className="min-w-0 truncate text-text/85">{x.title}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="border-t border-line px-4 py-4">
        <p className={label}>Other channels</p>
        <ul className="mt-2 space-y-1">
          {channels
            .filter((c) => c.id !== ch.id)
            .map((c) => (
              <li key={c.id}>
                <Link to={`/watch/ch-${c.id}`} className="group -mx-2 flex items-center gap-3 rounded-chip px-2 py-2 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold group-hover:text-gold-strong">{c.name}</span>
                    <span className="block truncate text-xs text-muted">Now: {programAt(c.id, now)?.title ?? '—'}</span>
                  </span>
                  <Icon name="play" size={14} className="shrink-0 text-subtle group-hover:text-text" />
                </Link>
              </li>
            ))}
        </ul>
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

/** Home rows: Continue watching, Editor's picks, Recommended, My List, Latest replays, Highlights. */
export function HomeRows() {
  const { state, set, toast, signedIn } = useApp();
  const progressOf = (v: Video) => (state.progress[v.id] ? state.progress[v.id] / v.durationSec : undefined);
  // Remove one video from Continue Watching (with Undo).
  const removeContinue = (v: Video) => {
    const before = state.progress;
    set((s) => {
      const next = { ...s.progress };
      delete next[v.id];
      return { progress: next };
    });
    // Undo puts the list back exactly as it was, so the card returns to its place in the row.
    toast('Removed from Continue Watching', { label: 'Undo', onClick: () => set({ progress: before }) });
  };
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
  const onHome = new Set(mustWatch().map((v) => v.id));
  return (
    <>
      <VideoRow title="Continue watching" videos={continuing} progressOf={progressOf} onRemove={removeContinue} />
      <EditorsPicks />
      <VideoRow title="Recommended for you" videos={recommendedRow(new Set([...started, ...onHome]))} />
      <VideoRow title="My List" videos={mine} action={more('/my-list', 'See all')} />
      <VideoRow title="Latest replays" videos={[...replays].reverse().filter((v) => !started.has(v.id))} action={more('/events')} />
      {/* Not the hands already shown above: each hand appears once on Home. */}
      <VideoRow title="Highlights" videos={highlightClips.filter((v) => !onHome.has(v.id))} action={more('/highlights')} />
    </>
  );
}
const recommendedRow = (skip: Set<string>) => recommended.filter((v) => !skip.has(v.id));

const more = (to: string, label = 'More') => (
  <Link to={to} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
    {label} →
  </Link>
);

/** A section with an optional small line above the title (from v5). */
function Section({ title, kicker, action, children }: { title: string; kicker?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
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

/** Editor's picks: three hands, with how long they take. */
const mustWatch = () => {
  // Three different pictures side by side: skip a hand whose thumbnail is already picked.
  const picked: Video[] = [];
  for (const slug of ['bluff', 'all-in', 'hero-fold']) {
    const v = highlightClips.find((x) => x.tags.some((t) => t.slug === slug) && !picked.some((p) => p.thumb === x.thumb && p.thumbPos === x.thumbPos));
    if (v) picked.push(v);
  }
  return picked;
};

function EditorsPicks() {
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
              <Link to="/events" className="text-sm font-semibold text-muted hover:text-text">
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
          <img src={x.thumb} style={artStyle({ pos: x.thumbPos, fit: x.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
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

type ScheduleItem = { e: TourEvent; d: Day };

/** "Tuesday, November 3" in the viewer's time zone. */
const longDate = (at: string, tz: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }).format(new Date(at));
/** A broadcast day's picture: its own video, else the event's, else a venue photo. */
function dayArt(e: TourEvent, d: Day) {
  const v = catalog.find((x) => x.dayId === d.id) ?? catalog.find((x) => x.eventId === e.id && x.kind === 'broadcast');
  return v ? { src: v.thumb, pos: v.thumbPos, fit: v.thumbFit } : VENUE_ART[0];
}

const DAY_MS = 86_400_000;
const shortDate = (at: string, tz: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: tz }).format(new Date(at));
const dateRange = (s: { start: string; end: string }, tz: string) => `${shortDate(s.start, tz)} – ${shortDate(s.end, tz)}`;

/** The year's series, one line each: the ones with broadcasts, plus last spring's and next year's (no broadcasts here). */
type SeasonStop = { id: string; name: string; city: string; start: string; end: string; art: Art };
const SEASON: SeasonStop[] = [
  { id: 'sp26', name: '2026 Spring Open', city: 'Los Angeles, CA', start: new Date(Date.now() - 200 * DAY_MS).toISOString(), end: new Date(Date.now() - 179 * DAY_MS).toISOString(), art: VENUE_ART[3] },
  ...series.map((s, i) => ({ ...s, art: VENUE_ART[i === 0 ? 0 : 2] })),
  { id: 'wi27', name: '2027 Winter Festival', city: 'Atlantic City, NJ', start: new Date(Date.now() + 110 * DAY_MS).toISOString(), end: new Date(Date.now() + 131 * DAY_MS).toISOString(), art: VENUE_ART[1] },
];

const itemsOf = (sid: string) =>
  events
    .filter((e) => e.seriesId === sid)
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .sort((x, y) => x.d.start.localeCompare(y.d.start));

/**
 * The top of Events, built around the series (3–4 a year, about three weeks each) rather than a calendar of days:
 * while a series runs, what's on today and what's left of it; between series, the next one with a countdown and the
 * last one's replays. A season line below shows the whole year. `?season=off` previews the between-series view.
 */
function SeriesSpotlight() {
  const { state } = useApp();
  useTick(30_000);
  const [params, setParams] = useSearchParams();
  const off = params.get('season') === 'off';
  const now = Date.now();
  const running = off ? undefined : series.find((s) => Date.parse(s.start) <= now && now <= Date.parse(s.end));
  const next = SEASON.find((s) => Date.parse(s.start) > now && s.id !== running?.id);
  const status = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
  const preview = (
    <div className="flex w-fit rounded-card border border-line text-xs font-bold tracking-wide uppercase" role="group" aria-label="Demo: preview">
      {[
        ['', 'During a series'],
        ['off', 'Between series'],
      ].map(([k, label]) => (
        <button key={k} aria-pressed={(k === 'off') === off} onClick={() => setParams(k ? { season: k } : {}, { replace: true })} className={cx('h-8 px-3', (k === 'off') === off ? 'bg-surface-2 text-text' : 'text-subtle hover:text-text')}>
          {label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-10">
      {running ? <RunningSeries s={running} status={status} action={preview} /> : <NextSeries stop={next} action={preview} />}
      <SeasonLine runningId={running?.id} off={off} />
    </div>
  );
}

/** A series in progress: its card with how far along it is, today's broadcasts, and the broadcast days still to come. */
function RunningSeries({ s, status, action }: { s: Series; status: (d: Day) => Day['status']; action: ReactNode }) {
  const { state } = useApp();
  const all = itemsOf(s.id);
  const today = dayKey(Date.now(), state.tz);
  const todays = all.filter((x) => dayKey(x.d.start, state.tz) === today || isBroadcasting(status(x.d)));
  const ahead = all.filter((x) => dayKey(x.d.start, state.tz) > today && !todays.includes(x));
  const byDate = new Map<string, ScheduleItem[]>();
  for (const x of ahead) {
    const k = dayKey(x.d.start, state.tz);
    byDate.set(k, [...(byDate.get(k) ?? []), x]);
  }
  const total = Math.round((Date.parse(s.end) - Date.parse(s.start)) / DAY_MS);
  const dayN = Math.min(total, Math.floor((Date.now() - Date.parse(s.start)) / DAY_MS) + 1);
  return (
    <Section title={s.name} kicker={`On now · ${s.city} · ${dateRange(s, state.tz)}`} action={action}>
      <div className="flex items-center gap-3 text-sm text-muted">
        <LiveTag />
        <span className="tnum">
          Day {dayN} of {total}
        </span>
        <span className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-surface-3">
          <span className="block h-full bg-gold" style={{ width: `${(dayN / total) * 100}%` }} />
        </span>
      </div>
      <div className="mt-6 flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-lg font-bold normal-case sm:text-xl">Today</h3>
        <span className="text-sm text-muted">Times in {tzAbbr(state.tz)}</span>
      </div>
      {todays.length ? <ScheduleList items={todays} status={status} /> : <p className="mt-3 text-sm text-muted">No broadcasts today. The next one is below.</p>}
      {byDate.size > 0 && (
        <>
          <h3 className="mt-8 font-sans text-lg font-bold normal-case sm:text-xl">Still to come in this series</h3>
          {[...byDate.values()].map((items) => (
            <div key={items[0].d.id} className="mt-4">
              <p className="mb-1 text-sm font-semibold text-muted">{longDate(items[0].d.start, state.tz)}</p>
              <ScheduleList items={items} status={status} />
            </div>
          ))}
        </>
      )}
    </Section>
  );
}

/** Between series: the next one with a countdown and a reminder, then the last one's replays. */
function NextSeries({ stop, action }: { stop?: SeasonStop; action: ReactNode }) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const last = [...series].reverse().find((s) => Date.parse(s.start) <= Date.now()) ?? series[0];
  const lastReplays = replays.filter((v) => eventById(v.eventId!)?.seriesId === last.id);
  if (!stop) return null;
  const days = Math.max(1, Math.ceil((Date.parse(stop.start) - Date.now()) / DAY_MS));
  const key = `series:${stop.id}`;
  const on = state.reminders.includes(key);
  const toggle = () => {
    if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder.' });
    set((x) => ({ reminders: on ? x.reminders.filter((k) => k !== key) : [...x.reminders, key] }));
    toast(on ? 'Reminder removed' : `We'll let you know when ${stop.name} goes live`);
  };
  return (
    <div className="space-y-10">
      <Section title="Next series" kicker="No live broadcasts right now" action={action}>
        <div className="relative overflow-hidden rounded-panel border border-line">
          <img src={stop.art.src} style={artStyle(stop.art)} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/20" />
          <div className="relative flex min-h-64 flex-col justify-end gap-2 p-6 sm:p-8">
            <p className="text-sm font-bold tracking-wide text-gold-strong uppercase">
              Starts in {days} day{days === 1 ? '' : 's'}
            </p>
            <h3 className="text-2xl sm:text-4xl">{stop.name}</h3>
            <p className="text-muted">
              {stop.city} · {dateRange(stop, state.tz)}
            </p>
            <div className="mt-2">
              <Button variant={on ? 'secondary' : 'primary'} onClick={toggle} aria-pressed={on}>
                <Icon name={on ? 'check' : 'bell'} size={16} /> {on ? 'Reminder set' : 'Notify me when it goes live'}
              </Button>
            </div>
          </div>
        </div>
      </Section>
      {lastReplays.length > 0 && (
        <ScrollRow title={`Catch up on ${last.name}`}>
          {lastReplays.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </ScrollRow>
      )}
    </div>
  );
}

/** The whole season on one line: replays for past series, live for the running one, dates for the ones ahead. */
function SeasonLine({ runningId, off }: { runningId?: string; off: boolean }) {
  const { state } = useApp();
  const now = Date.now();
  return (
    <Section title="This season" kicker="3–4 series a year, about three weeks each">
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SEASON.map((s) => {
          const live = s.id === runningId;
          const past = !live && (Date.parse(s.end) < now || (off && Date.parse(s.start) <= now));
          const first = events.find((e) => e.seriesId === s.id);
          const body = (
            <>
              <span className={cx('text-[11px] font-bold tracking-wide uppercase', live ? 'text-live' : past ? 'text-subtle' : 'text-gold-strong')}>{live ? '● Live now' : past ? 'Replays' : 'Coming up'}</span>
              <span className="mt-1 block truncate font-semibold">{s.name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {s.city} · {dateRange(s, state.tz)}
              </span>
            </>
          );
          const box = cx('block h-full rounded-card border p-4', live ? 'border-gold/50 bg-gold-dim' : 'border-line bg-surface', first && 'hover:border-line-strong');
          return <li key={s.id}>{first ? <Link to={`/events/${first.id}`} className={box}>{body}</Link> : <div className={box}>{body}</div>}</li>;
        })}
      </ol>
    </Section>
  );
}

/** One day as a timeline: the start time on the left, a dot on the line (red while live), the broadcast on the right. */
function ScheduleList({ items, status }: { items: ScheduleItem[]; status: (d: Day) => Day['status'] }) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  return (
    <ol className="mt-4">
      {items.map(({ e, d }, i) => {
        const st = status(d);
        const live = isBroadcasting(st);
        const title = `${e.name.replace(' World Championship', '')} · ${d.label}`;
        const key = `day:${d.id}`;
        const on = state.reminders.includes(key);
        const toggle = () => {
          if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder.' });
          set((x) => ({ reminders: on ? x.reminders.filter((k) => k !== key) : [...x.reminders, key] }));
          toast(on ? 'Reminder removed' : `We'll remind you before ${title} starts`);
        };
        const art = dayArt(e, d);
        return (
          <li key={d.id} className="grid grid-cols-[5rem_1fr] gap-x-4 sm:grid-cols-[7.5rem_1fr]">
            <div className="pt-3 text-right">
              <b className="block text-base font-bold tnum sm:text-lg">{fmtTime(d.start, state.tz)}</b>
              <span className="block text-xs text-subtle tnum">{fmtTime(d.start, VENUE_TZ)} Las Vegas</span>
            </div>
            <div className={cx('relative border-l border-line pl-5', i < items.length - 1 && 'pb-4')}>
              <span className={cx('absolute top-5 -left-[5px] size-2.5 rounded-full', live ? 'bg-live' : st === 'upcoming' ? 'bg-gold' : 'bg-line-strong')} aria-hidden />
              <div className={cx('flex items-center gap-4 rounded-panel border p-4', live ? 'border-gold/50 bg-gold-dim' : 'border-line bg-surface')}>
                <div className="min-w-0 flex-1">
                  <span className={cx('text-[11px] font-bold tracking-wide uppercase', live ? 'text-live' : st === 'upcoming' ? 'text-gold-strong' : 'text-subtle')}>
                    {live ? 'On now' : st === 'upcoming' ? 'Coming up' : 'Replay'}
                  </span>
                  <Link to={`/events/${e.id}`} className="mt-0.5 line-clamp-2 block text-base font-semibold hover:text-gold-strong sm:text-lg">
                    {title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {seriesById(e.seriesId).name} · {d.tables.length} table{d.tables.length === 1 ? '' : 's'} · {duration(d.durationMin * 60)}
                  </p>
                  <div className="mt-3">
                    {live ? (
                      <Link to={`/watch/${d.id}`}>
                        <Button size="sm" variant="primary" tabIndex={-1}>
                          <Icon name="play" size={14} /> Watch live
                        </Button>
                      </Link>
                    ) : st === 'upcoming' ? (
                      <Button size="sm" variant={on ? 'secondary' : 'outline'} onClick={toggle} aria-pressed={on}>
                        <Icon name={on ? 'check' : 'bell'} size={14} /> {on ? 'Reminder set' : 'Remind me'}
                      </Button>
                    ) : (
                      <Link to={`/watch/${d.id}`}>
                        <Button size="sm" variant="secondary" tabIndex={-1}>
                          <Icon name="play" size={14} /> Watch replay
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <Link to={live || st === 'vod' ? `/watch/${d.id}` : `/events/${e.id}`} className="relative hidden aspect-video w-40 shrink-0 overflow-hidden rounded-chip bg-surface-2 sm:block lg:w-52" tabIndex={-1} aria-hidden>
                  <img src={art.src} style={artStyle(art)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
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
        <img src={cover.thumb} style={artStyle({ pos: cover.thumbPos, fit: cover.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        {live && <LiveTag className="absolute top-2 left-2" />}
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold group-hover:text-gold-strong">{e.name.replace(' World Championship', '')}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {seriesById(e.seriesId).name} · {list.length} broadcast{list.length === 1 ? '' : 's'}
      </span>
    </Link>
  );
}

/**
 * Events: one menu for live, schedule and events: what's live now, the schedule as a
 * list by date, then this series by tournament and WSOP Classics.
 */
export function EventsPage() {
  const withVideo = events.filter((e) => eventVideos(e.id).length);
  const bySeries = [...new Set(withVideo.map((e) => e.seriesId))];
  return (
    <Page className="max-w-[96rem] space-y-12">
      <h1 className="text-title">Events</h1>
      <SeriesSpotlight />
      {bySeries.map((sid) => (
        <ScrollRow key={sid} title={seriesById(sid).name}>
          {withVideo
            .filter((e) => e.seriesId === sid)
            .map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
        </ScrollRow>
      ))}
      <ScrollRow title="WSOP Classics">
        {classics.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </ScrollRow>
    </Page>
  );
}

/**
 * One row that scrolls sideways (four cards in view on wide screens), with ‹ › buttons beside the title on screens
 * with a mouse; touch screens just swipe.
 */
function ScrollRow({ title, children }: { title: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current;
    if (el) setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 });
  };
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  const arrow = 'flex size-9 items-center justify-center rounded-full border border-line-strong text-text transition-colors duration-150 hover:border-text disabled:opacity-30 disabled:hover:border-line-strong';
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {!(edges.start && edges.end) && (
          <div className="hidden gap-2 [@media(hover:hover)]:flex">
            <button className={arrow} onClick={() => page(-1)} disabled={edges.start} aria-label={`Scroll ${title} back`}>
              <Icon name="chevron" size={18} className="rotate-180" />
            </button>
            <button className={arrow} onClick={() => page(1)} disabled={edges.end} aria-label={`Scroll ${title} forward`}>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        )}
      </div>
      <div ref={track} onScroll={update} className="hscroll gap-5 [&>*]:w-[78%] sm:[&>*]:w-[calc((100%-1.25rem)/2)] lg:[&>*]:w-[calc((100%-3.75rem)/4)]">
        {children}
      </div>
    </section>
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

// ---- 24/7 channel cards (Home) -------------------------------------------------------------------------

/**
 * One 24/7 channel: its picture, what's on, the channel and when it ends, and Watch now. On the Channel guide the card
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
      <img src={a.src} style={artStyle(a)} alt="" className="size-16 shrink-0 rounded-card object-cover" />
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
