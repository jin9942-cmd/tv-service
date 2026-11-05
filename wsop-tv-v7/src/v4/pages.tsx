// v4 — the common watch page, Live, Videos (Highlights / Replays), the schedule, tag pages and the Home season strip
// (all built from the catalog and the one card).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { Button, Icon, LiveTag, Page, cx } from '../components/ui';
import { channelById, channels, programAt, programs, upNext, type LinearChannel } from '../data/channels';
import { HERO_DAY_ID, dayById, eventById, events, series, seriesById } from '../data/mock';
import type { Day, TourEvent } from '../data/types';
import { VENUE_TZ, fmtDate, fmtTime, tzAbbr } from '../lib/time';
import { isBroadcasting } from '../lib/broadcast';
import { duration, money } from '../lib/format';
import { MyListButton } from '../features/library/listActions';
import { NotFound } from '../pages/NotFound';
import { About, TagList, VideoCard, VideoRow, listKind, rowGrid } from './detail';
import { Player } from './Player';
import { CHANNEL_ART, EXTERIOR, HERO_IMAGES, PLAYER_ART, TABLE_ART, VENUE_ART, artStyle, type Art } from '../lib/brand';
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
  if (!v) {
    const ref = dayById(dayId);
    return ref && ref.day.status === 'upcoming' ? <UpcomingView e={ref.event} d={ref.day} /> : <NotFound />;
  }
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

/** A broadcast day's picture: its own video, else the event's, else a venue photo. */
function dayArt(e: TourEvent, d: Day) {
  const v = catalog.find((x) => x.dayId === d.id) ?? catalog.find((x) => x.eventId === e.id && x.kind === 'broadcast');
  return v ? { src: v.thumb, pos: v.thumbPos, fit: v.thumbFit } : VENUE_ART[0];
}

const pad = (n: number) => String(n).padStart(2, '0');
const untilParts = (at: string) => {
  const ms = Math.max(0, Date.parse(at) - Date.now());
  return { ms, d: Math.floor(ms / 86_400_000), h: Math.floor(ms / 3_600_000) % 24, m: Math.floor(ms / 60_000) % 60, s: Math.floor(ms / 1000) % 60 };
};
const broadcastTitle = (e: TourEvent, d: Day) => `${e.name.replace(' World Championship', '')} · ${d.label}`;

/**
 * An upcoming broadcast: the countdown sits where the player will be, with the start time (yours and Las Vegas) and
 * Remind me; beside it, replays to watch while you wait.
 */
function UpcomingView({ e, d }: { e: TourEvent; d: Day }) {
  const { state } = useApp();
  useTick(1000);
  const title = broadcastTitle(e, d);
  const [on, toggle] = useReminder(`day:${d.id}`, title);
  const t = untilParts(d.start);
  const art = dayArt(e, d);
  const wait = [...catalog.filter((v) => v.eventId === e.id && v.kind === 'broadcast'), ...replays.filter((v) => eventById(v.eventId!)?.seriesId === e.seriesId && v.eventId !== e.id)].slice(0, 6);
  const units: [number, string][] = [
    [t.d, 'Days'],
    [t.h, 'Hours'],
    [t.m, 'Min'],
    [t.s, 'Sec'],
  ];
  return (
    <Page className="max-w-[96rem] py-4 sm:py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-panel bg-black">
            <img src={art.src} style={artStyle(art)} alt="" className="absolute inset-0 size-full object-cover opacity-35 blur-[2px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-4 text-center sm:gap-5">
              <p className="text-xs font-bold tracking-[0.2em] text-gold-strong uppercase sm:text-sm">{t.ms ? 'Live in' : 'Starting any moment'}</p>
              {t.ms > 0 && (
                <div className="flex gap-2 sm:gap-4" role="timer" aria-label={`Starts in ${t.d} days ${t.h} hours ${t.m} minutes`}>
                  {units.map(([n, l]) => (
                    <div key={l} className="w-14 sm:w-24">
                      <div className="rounded-card border border-white/15 bg-black/60 py-2 text-2xl font-bold tnum sm:py-3 sm:text-5xl">{pad(n)}</div>
                      <div className="mt-1 text-[10px] font-bold tracking-wider text-muted uppercase sm:text-xs">{l}</div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted tnum sm:text-base">
                {fmtDate(d.start, state.tz)} · <b className="text-text">{fmtTime(d.start, state.tz)} {tzAbbr(state.tz, d.start)}</b> · {fmtTime(d.start, VENUE_TZ)} in Las Vegas
              </p>
              <Button variant={on ? 'secondary' : 'primary'} onClick={toggle} aria-pressed={on}>
                <Icon name={on ? 'check' : 'bell'} size={16} /> {on ? 'Reminder set' : 'Remind me'}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="font-sans text-xl leading-snug font-bold normal-case sm:text-2xl">{title}</h1>
            <p className="mt-1 text-sm text-muted">
              {seriesById(e.seriesId).name} · {d.tables.length} table{d.tables.length === 1 ? '' : 's'} · about {Math.round(d.durationMin / 60)} hours
            </p>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-text/85">
              {d.label} of the {e.name.replace(' World Championship', '')}, live from the feature table. This page turns into the live player when the broadcast starts.
            </p>
          </div>
        </div>
        <aside>
          <section aria-label="While you wait">
            <h2 className="mb-3 font-sans text-base font-bold normal-case">While you wait</h2>
            <ul className="space-y-3">
              {wait.map((x) => (
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

/** An upcoming broadcast on an event page: its picture dimmed, when it starts, and a link to its waiting screen. */
function UpcomingCard({ e, d }: { e: TourEvent; d: Day }) {
  const { state } = useApp();
  const art = dayArt(e, d);
  return (
    <Link to={`/watch/${d.id}`} className="group block min-w-0">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={art.src} style={artStyle(art)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-40" />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-[11px] font-bold tracking-wider text-gold-strong uppercase">Coming up</span>
          <span className="text-lg font-bold tnum">{fmtDate(d.start, state.tz)}</span>
          <span className="text-sm text-muted tnum">{fmtTime(d.start, state.tz)}</span>
        </span>
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold group-hover:text-gold-strong">{broadcastTitle(e, d)}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">{seriesById(e.seriesId).name}</span>
    </Link>
  );
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

// ---- Videos ------------------------------------------------------------------------------------------

const HAND_FILTERS = [
  ['all', 'All'],
  ['all-in', 'All-in'],
  ['big-pot', 'Big pot'],
  ['bluff', 'Bluff'],
  ['bad-beat', 'Bad beat'],
  ['hero-fold', 'Hero fold'],
] as const;

const chip = (on: boolean) => cx('h-9 shrink-0 rounded-full border px-4 text-sm font-semibold', on ? 'border-text bg-text text-bg' : 'border-line-strong text-muted hover:text-text');

/** Videos: the Highlights tab (hand clips) and the Replays tab (series → event → broadcast). */
export function VideosPage({ tab }: { tab: 'highlights' | 'replays' | 'shorts' }) {
  const tabs = [
    ['/videos', 'Highlights', 'highlights'],
    ['/videos/replays', 'Replays', 'replays'],
    ['/videos/shorts', 'Shorts', 'shorts'],
  ] as const;
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title">Videos</h1>
      <nav className="mt-4 flex gap-6 border-b border-line" aria-label="Videos">
        {tabs.map(([to, label, k]) => (
          <Link key={k} to={to} aria-current={tab === k ? 'page' : undefined} className={cx('-mb-px border-b-[3px] pb-2.5 text-[15px] font-semibold', tab === k ? 'border-gold text-text' : 'border-transparent text-muted hover:text-text')}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'highlights' ? <HighlightsTab /> : tab === 'replays' ? <ReplaysTab /> : <ShortsFeed />}
    </Page>
  );
}

/** Hand clips by views; "This series" (first, only while a series runs) narrows them to its events. */
function HighlightsTab() {
  const [f, setF] = useState<string>('all');
  const running = runningSeries(false);
  const filters: (readonly [string, string])[] = [...(running ? [['series', 'This series'] as const] : []), ...HAND_FILTERS];
  const list =
    f === 'all'
      ? highlightClips
      : f === 'series'
        ? highlightClips.filter((v) => eventById(v.eventId!)?.seriesId === running?.id)
        : highlightClips.filter((v) => v.tags.some((t) => t.slug === f));
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Hand type">
        {filters.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className={chip(f === k)}>
            {label}
          </button>
        ))}
      </div>
      <div className={cx(rowGrid, 'mt-6')}>
        {list.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    </>
  );
}

/** Events worth a card: ones with broadcasts, or (in the running series) with broadcasts still to come. */
const eventsOf = (sid: string) => events.filter((e) => e.seriesId === sid && (eventVideos(e.id).length || e.days.some((d) => d.status === 'upcoming')));

/** Series with broadcasts: the running one first, then the most recent. WSOP Classics comes last. */
const replaySeries = () => {
  const running = runningSeries(false);
  return series
    .filter((x) => events.some((e) => e.seriesId === x.id && eventVideos(e.id).length))
    .sort((a, b) => (a.id === running?.id ? -1 : b.id === running?.id ? 1 : b.start.localeCompare(a.start)));
};

/** Replays: pick a series (kept in ?series=), then its events; WSOP Classics shows the classic broadcasts. */
function ReplaysTab() {
  const [params, setParams] = useSearchParams();
  const list = replaySeries();
  const sid = params.get('series') === 'classics' ? 'classics' : (list.find((x) => x.id === params.get('series')) ?? list[0])?.id;
  const options: [string, string][] = [...list.map((x) => [x.id, x.name] as [string, string]), ['classics', 'WSOP Classics']];
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Series">
        {options.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={sid === k} onClick={() => setParams({ series: k })} className={chip(sid === k)}>
            {label}
          </button>
        ))}
      </div>
      <div className={cx(rowGrid, 'mt-6')}>
        {sid === 'classics' ? classics.map((v) => <VideoCard key={v.id} v={v} />) : eventsOf(sid ?? '').map((e) => <EventCard key={e.id} e={e} />)}
      </div>
    </>
  );
}

export { catalog };

// ---- Home rows ---------------------------------------------------------------------------------------

/**
 * v7 Home rows: Coming up (right after the 24/7 channels: now, then next), Continue watching, My List, Editor's pick (best final tables), Recommended for you, Latest replays,
 * Highlights (automatic, by hand type) and Shorts. No video appears in two rows.
 */
export function HomeRows() {
  const { state, set, toast, signedIn } = useApp();
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
    : [];
  const mine = signedIn
    ? [...state.myList]
        .sort((a, b) => b.addedAt - a.addedAt)
        .map((x) => videoById(x.kind === 'archive' ? `classic-${x.id}-finaltable` : x.kind === 'event' ? (catalog.find((v) => v.eventId === x.id && v.kind !== 'clip')?.id ?? '') : x.id))
        .filter((v): v is Video => !!v)
    : [];
  // Each row skips what the rows above it already show.
  const shown = new Set(continuing.map((x) => x.v.id));
  const take = (list: Video[], n: number) => {
    const out = list.filter((v) => !shown.has(v.id)).slice(0, n);
    out.forEach((v) => shown.add(v.id));
    return out;
  };
  const myRow = take(mine, 4);
  const picks = take(editorsFinalTables(), 3);
  const recs = take(recommended, 4);
  const latest = take([...replays].reverse(), 4);
  // Hand clips split between the two hand rows (alternate clips), so Highlights and Shorts never show the same hand.
  const highlightPool = highlightClips.filter((v, i) => i % 2 === 0 && !shown.has(v.id));
  const shorts = take(highlightClips.filter((_, i) => i % 2 === 1), 10);
  const pick = photoPicker(shown);
  return (
    <>
      <ComingUpRow />
      <ContinueRow items={continuing} onRemove={removeContinue} />
      <MyListRow videos={myRow} />
      <EditorsPick picks={picks} />
      <VideoRow title="Recommended for you" videos={recs} />
      <VideoRow title="Latest replays" videos={latest} action={more('/videos/replays')} />
      <HighlightsRow pool={highlightPool} skip={shown} />
      <ShortsRow videos={shorts} pick={pick} />
    </>
  );
}

/** Coming up: the next live broadcasts — date and time on the picture, a countdown and Remind me; each opens its countdown. */
function ComingUpRow() {
  const now = useTick(30_000);
  const next = events
    .flatMap((e) => e.days.filter((d) => d.status === 'upcoming').map((d) => ({ e, d })))
    .sort((a, b) => a.d.start.localeCompare(b.d.start))
    .slice(0, 4);
  if (!next.length) return null;
  // Broadcasts not aired yet have no picture of their own: each card gets a different photo of play.
  const pick = photoPicker(new Set());
  return (
    <Section title="Coming up" action={more('/schedule', 'Full schedule')}>
      <div className={rowGrid}>
        {next.map((x) => (
          <ComingUpCard key={x.d.id} {...x} now={now} pic={pick()} />
        ))}
      </div>
    </Section>
  );
}

function ComingUpCard({ e, d, now, pic }: ScheduleItem & { now: number; pic: Pic }) {
  const { state } = useApp();
  const title = titleOf({ e, d });
  const [on, toggle] = useReminder(`day:${d.id}`, title);
  const mins = Math.max(0, Math.round((Date.parse(d.start) - now) / 60_000));
  const days = Math.round(mins / 1440);
  const inText = mins >= 1440 ? `in ${days} day${days === 1 ? '' : 's'}` : mins >= 60 ? `in ${Math.floor(mins / 60)}h ${mins % 60}m` : `in ${mins} min`;
  return (
    <div className="group min-w-0">
      <Link to={`/watch/${d.id}`} className="relative block aspect-video overflow-hidden rounded-card bg-surface-2" aria-label={`${title}, ${inText}`}>
        <img src={pic.thumb} style={artStyle({ pos: pic.thumbPos, fit: pic.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-45 transition-transform duration-200 group-hover:scale-[1.03]" />
        <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-bold tracking-wider text-gold-strong uppercase">{fmtDate(d.start, state.tz)}</span>
          <span className="mt-0.5 text-2xl font-black tnum">{fmtTime(d.start, state.tz)}</span>
          <span className="mt-0.5 text-xs text-white/75 tnum">{inText}</span>
        </span>
      </Link>
      <div className="mt-2 flex items-start justify-between gap-2">
        <Link to={`/watch/${d.id}`} className="min-w-0">
          <span className="block truncate text-[15px] font-semibold group-hover:text-gold-strong">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{seriesById(e.seriesId).name}</span>
        </Link>
        <button onClick={toggle} aria-pressed={on} aria-label={on ? `Reminder set for ${title}` : `Remind me about ${title}`} title={on ? 'Reminder set' : 'Remind me'} className={cx('flex size-9 shrink-0 items-center justify-center rounded-full border', on ? 'border-gold bg-gold-dim text-gold-strong' : 'border-line-strong text-muted hover:text-text')}>
          <Icon name={on ? 'check' : 'bell'} size={16} />
        </button>
      </div>
    </div>
  );
}

/** Continue watching: big pictures with a thick progress bar, the time left beside the title; one sideways line. */
function ContinueRow({ items, onRemove }: { items: { v: Video; sec: number }[]; onRemove: (v: Video) => void }) {
  if (!items.length) return null;
  return (
    <Section title="Continue watching">
      <ul className="hscroll gap-5 [&>*]:w-[78%] sm:[&>*]:w-[calc((100%-1.25rem)/2)] lg:[&>*]:w-[calc((100%-2.5rem)/3)]">
        {items.map(({ v, sec }) => {
          const left = Math.max(60, v.durationSec - sec);
          const pct = Math.min(100, Math.round((sec / v.durationSec) * 100));
          return (
            <li key={v.id} className="group relative min-w-0">
              <Link to={`/watch/${v.id}`} className="block" aria-label={`Resume ${v.title}`}>
                <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
                  <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                  <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
                    <i className="block h-full bg-gold" style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-semibold group-hover:text-gold-strong">{v.title}</span>
                  <span className="shrink-0 text-xs text-muted tnum">{left >= 3600 ? `${Math.floor(left / 3600)}h ${Math.round((left % 3600) / 60)}m left` : `${Math.round(left / 60)} min left`}</span>
                </span>
              </Link>
              <button
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v.title} from Continue Watching`}
                title="Remove from Continue Watching"
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Editor's pick: one theme — the best final tables — with the editor's note beside three of them. */
const editorsFinalTables = () => {
  const finals = catalog.filter((v) => (v.kind === 'classic' || (v.kind === 'broadcast' && v.status === 'vod')) && v.title.includes('Final Table'));
  const picked: Video[] = [];
  // Different pictures side by side.
  for (const x of [...finals].sort((a, b) => b.views - a.views)) if (!picked.some((p) => p.thumb === x.thumb && p.thumbPos === x.thumbPos)) picked.push(x);
  return picked;
};

function EditorsPick({ picks }: { picks: Video[] }) {
  if (!picks.length) return null;
  const total = picks.reduce((n, v) => n + v.durationSec, 0);
  return (
    <Section title="The best final tables" label="Editor’s pick" action={more('/collections/final-tables', 'All final tables')}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-3 rounded-card border border-line bg-surface p-4">
          <p className="text-[15px] leading-relaxed text-text/85">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-gold-strong uppercase">From the editor</span>
            Where bracelets are won: the final tables worth watching start to finish, from this series and the archive.
          </p>
          <p className="text-sm text-muted tnum">
            {picks.length} final tables · {duration(total)} in all
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {picks.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </div>
    </Section>
  );
}

/** My List: the standard card, four across (same size as the rows around it). */
function MyListRow({ videos }: { videos: Video[] }) {
  return <VideoRow title="My List" videos={videos} action={more('/my-list', 'See all')} />;
}

// ---- curated collections ----------------------------------------------------------------------------

const withTag = (slug: string) => highlightClips.filter((v) => v.tags.some((t) => t.slug === slug));
export const COLLECTIONS: { id: string; title: string; blurb: string; videos: () => Video[] }[] = [
  { id: 'final-tables', title: 'Greatest final tables', blurb: 'Classic and recent final tables, start to finish.', videos: editorsFinalTables },
  { id: 'legendary-bluffs', title: 'Legendary bluffs', blurb: 'Big lies, bigger pots.', videos: () => withTag('bluff') },
  { id: 'all-in', title: 'All-in, everything on the line', blurb: 'Tournament lives decided on one card.', videos: () => withTag('all-in') },
  { id: 'bad-beats', title: 'Bad beats & comebacks', blurb: 'The hands nobody saw coming.', videos: () => withTag('bad-beat') },
];


/** Curated collections (from the archive): four tiles, each opening its own page. */
/** Broadcast stills come from a handful of CC clips (the same faces again and again), so tiles use photos instead. */
const isStill = (src: string) => src.includes('/media/');
type Pic = { thumb: string; thumbPos: string; thumbFit?: 'contain' };

/**
 * Hands out photos for the tiles at the bottom of Home (collection covers, Shorts): each photo once before any repeats,
 * ones not already on the page first.
 */
function photoPicker(skip: Set<string>) {
  const onPage = new Set<string>([...Object.values(HERO_IMAGES), ...Object.values(CHANNEL_ART).map((a) => a.src), ...[...skip].map((id) => videoById(id)?.thumb ?? '')]);
  // One photo per pictured player (several of the same face side by side read as repeats).
  const pool = [...TABLE_ART, ...Object.values(PLAYER_ART).map((list) => list[0]), ...VENUE_ART.filter((a) => !EXTERIOR.has(a.src))].filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
  const faces = new Set(Object.values(PLAYER_ART).flat().map((a) => a.src));
  const uses = new Map<string, number>();
  return (own?: Pic): Pic => {
    if (own && !isStill(own.thumb) && !faces.has(own.thumb) && !onPage.has(own.thumb) && !uses.has(own.thumb)) {
      uses.set(own.thumb, 1);
      return own;
    }
    const a = [...pool].sort((x, y) => (uses.get(x.src) ?? 0) - (uses.get(y.src) ?? 0) || Number(onPage.has(x.src)) - Number(onPage.has(y.src)))[0];
    uses.set(a.src, (uses.get(a.src) ?? 0) + 1);
    return { thumb: a.src, thumbPos: a.pos, thumbFit: a.fit };
  };
}

/** Highlights: hand clips, filled automatically (the hand-type filters are on Videos > Highlights). */
function HighlightsRow({ pool, skip }: { pool: Video[]; skip: Set<string> }) {
  // Photos instead of the look-alike broadcast stills, so the same face doesn't fill the row.
  const pick = photoPicker(skip);
  const list = pool.slice(0, 4).map((v) => ({ ...v, ...pick(v) }));
  if (!list.length) return null;
  return (
    <Section title="Highlights" action={more('/videos', 'All highlights')}>
      <div className={rowGrid}>
        {list.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
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
      <Link to="/" className="text-sm text-muted hover:text-text">
        ← Home
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

// ---- Shorts -------------------------------------------------------------------------------------------

/** Shorts on Home: tall cards in one sideways line; each opens the vertical Shorts feed at that clip. */
function ShortsRow({ videos, pick }: { videos: Video[]; pick: (own?: Pic) => Pic }) {
  if (!videos.length) return null;
  const pics = videos.map((v) => pick(v));
  return (
    <Section title="Shorts" action={more('/videos/shorts', 'Watch Shorts')}>
      <ul className="hscroll gap-3 [&>*]:w-[42%] sm:[&>*]:w-[calc((100%-2.25rem)/4)] lg:[&>*]:w-[calc((100%-4.5rem)/7)]">
        {videos.map((v, i) => (
          <li key={v.id} className="min-w-0">
            <Link to={`/videos/shorts?start=${v.id}`} className="group relative block aspect-[9/16] overflow-hidden rounded-card bg-surface-2">
              <img src={pics[i].thumb} style={{ objectPosition: pics[i].thumbPos }} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-2.5">
                <span className="line-clamp-3 text-[13px] leading-snug font-bold">{v.title}</span>
                <span className="mt-1 block text-[11px] text-white/70 tnum">{duration(v.durationSec)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Old /shorts links (with ?start=) land on the Shorts tab of Videos. */
export function ShortsRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={`/videos/shorts${params.toString() ? `?${params}` : ''}`} replace />;
}

/** The Shorts tab of Videos: one vertical clip per screen, swipe or scroll to the next; starts at ?start=. */
function ShortsFeed() {
  const [params] = useSearchParams();
  const start = params.get('start');
  const list = start ? [...highlightClips.filter((v) => v.id === start), ...highlightClips.filter((v) => v.id !== start)] : highlightClips;
  return (
    <>
      <div className="mx-auto mt-6 h-[calc(100dvh-13rem)] max-w-[24rem] snap-y snap-mandatory overflow-y-auto rounded-panel bg-black" aria-label="Shorts">
        {list.map((v) => (
          <article key={v.id} className="relative h-full snap-start overflow-hidden">
            <video className="absolute inset-0 size-full object-cover" src={`${v.media.url}#t=${v.media.start}`} poster={v.thumb} muted loop playsInline autoPlay preload="none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h2 className="font-sans text-lg leading-snug font-bold normal-case">{v.title}</h2>
              <p className="text-xs text-white/75">
                {v.subtitle} · {duration(v.durationSec)}
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
    </>
  );
}

const more = (to: string, label = 'More') => (
  <Link to={to} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
    {label} →
  </Link>
);

/** A Home section: the title (editorial ones carry a gold label beside it, as Curated collections does) and a link. */
function Section({ title, label, action, children }: { title: string; label?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xl sm:text-2xl">{title}</h2>
          {label && <EditorialLabel>{label}</EditorialLabel>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EditorialLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-gold-strong uppercase">
      <Icon name="star" size={12} /> {children}
    </span>
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
              <Link to="/schedule" className="text-sm font-semibold text-muted hover:text-text">
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

/** The series running now (none in the between-series preview). */
const runningSeries = (off: boolean) => (off ? undefined : series.find((s) => Date.parse(s.start) <= Date.now() && Date.now() <= Date.parse(s.end)));

/** A reminder toggle (sign-in required), kept in `state.reminders` under `key`. */
function useReminder(key: string, what: string) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const on = state.reminders.includes(key);
  const toggle = () => {
    if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder.' });
    set((x) => ({ reminders: on ? x.reminders.filter((k) => k !== key) : [...x.reminders, key] }));
    toast(on ? 'Reminder removed' : `We'll remind you before ${what} starts`);
  };
  return [on, toggle] as const;
}

const titleOf = (x: { e: TourEvent; d: Day }) => `${x.e.name.replace(' World Championship', '')} · ${x.d.label}`;

// ---- Events -----------------------------------------------------------------------------------------

const eventVideos = (id: string) => catalog.filter((v) => v.eventId === id && v.kind === 'broadcast');

function EventCard({ e }: { e: TourEvent }) {
  const { state } = useApp();
  const list = eventVideos(e.id);
  const cover = list.find((v) => v.title.endsWith('Final Table')) ?? list[list.length - 1];
  const art = cover ? { src: cover.thumb, pos: cover.thumbPos, fit: cover.thumbFit } : dayArt(e, e.days[0]);
  const ahead = e.days.filter((d) => d.status === 'upcoming').length;
  const live = list.some((v) => isLive(v, state.streamMode));
  return (
    <Link to={`/events/${e.id}`} className="group block min-w-0">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={art.src} style={artStyle(art)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        {live && <LiveTag className="absolute top-2 left-2" />}
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold group-hover:text-gold-strong">{e.name.replace(' World Championship', '')}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {seriesById(e.seriesId).name} · {list.length ? `${list.length} broadcast${list.length === 1 ? '' : 's'}` : `${ahead} coming up`}
      </span>
    </Link>
  );
}

/**
 * Schedule, as on wsop.com/schedule: the year's series (three or four big ones) as cards under month headings — tag,
 * name, dates, venue; each opens its page with the broadcast schedule. Only a series that is live carries anything to
 * press on the list: the LIVE badge, its live broadcasts and Watch live.
 */
type ScheduleItem = { e: TourEvent; d: Day };
type SeriesStop = { id: string; name: string; venue: string; city: string; start: string; end: string; art: Art };

const DAY_MS = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();
/** The year's series: the two with broadcasts in the demo, plus last spring's and next winter's. */
const SEASON: SeriesStop[] = [
  { id: 'sp26', name: '2026 Spring Open', venue: 'Bicycle Hotel & Casino', city: 'Los Angeles, CA', start: at(-200), end: at(-179), art: VENUE_ART[3] },
  // The demo series' dates cover all of their broadcasts.
  ...series.map((s, i) => {
    const starts = events.filter((e) => e.seriesId === s.id).flatMap((e) => e.days.map((d) => d.start));
    const first = [s.start, ...starts].sort()[0];
    const last = [s.end, ...starts].sort().pop()!;
    return { ...s, start: first, end: last, art: i === 0 ? TABLE_ART[0] : VENUE_ART[2] };
  }),
  { id: 'wi27', name: '2027 Winter Festival', venue: 'Boardwalk Hall', city: 'Atlantic City, NJ', start: at(110), end: at(131), art: VENUE_ART[0] },
];

const seriesState = (s: SeriesStop, now: number) => (Date.parse(s.start) <= now && now <= Date.parse(s.end) ? 'live' : Date.parse(s.start) > now ? 'upcoming' : 'past');
const shortDate = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: tz }).format(new Date(iso));

/** Month key (YYYY-MM) of a date in the viewer's time zone, and its tab label ("November", "January 2027"). */
const monthKey = (iso: string | number, tz: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: tz }).format(new Date(iso)).slice(0, 7);
const monthLabel = (key: string, tz: string, now: number) => {
  const d = new Date(`${key}-15T12:00:00Z`);
  const sameYear = key.slice(0, 4) === monthKey(now, tz).slice(0, 4);
  return new Intl.DateTimeFormat('en-US', { month: 'long', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(d);
};

/** What the schedule menu shows: everything ahead (live included), one month ahead, or the past (all, or one month). */
type ScheduleView = { kind: 'upcoming' } | { kind: 'month'; key: string } | { kind: 'past'; key?: string };

/**
 * The schedule menu, PokerGO style: Past ▾ (a menu of past months) · All upcoming · one tab per month ahead.
 */
function ScheduleBar({ view, onChange, ahead, past }: { view: ScheduleView; onChange: (v: ScheduleView) => void; ahead: string[]; past: string[] }) {
  const { state } = useApp();
  const now = Date.now();
  const [open, setOpen] = useState(false);
  const seg = (on: boolean) => cx('h-11 px-4 text-sm font-bold whitespace-nowrap uppercase transition-colors sm:px-5', on ? 'bg-gold text-ink' : 'text-text/85 hover:bg-surface-3');
  return (
    <div className="relative mt-4">
      <div className="inline-flex max-w-full overflow-x-auto rounded-card border border-line-strong bg-surface [&>*+*]:border-l [&>*+*]:border-line-strong" role="tablist" aria-label="Schedule">
        <button role="tab" aria-selected={view.kind === 'past'} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cx(seg(view.kind === 'past'), 'inline-flex items-center gap-1.5')}>
          {view.kind === 'past' && view.key ? monthLabel(view.key, state.tz, now) : 'Past'}
          <Icon name="chevron" size={14} className="rotate-90" />
        </button>
        <button role="tab" aria-selected={view.kind === 'upcoming'} onClick={() => (onChange({ kind: 'upcoming' }), setOpen(false))} className={seg(view.kind === 'upcoming')}>
          All upcoming
        </button>
        {ahead.map((k) => (
          <button key={k} role="tab" aria-selected={view.kind === 'month' && view.key === k} onClick={() => (onChange({ kind: 'month', key: k }), setOpen(false))} className={seg(view.kind === 'month' && view.key === k)}>
            {monthLabel(k, state.tz, now)}
          </button>
        ))}
      </div>
      {open && (
        <ul role="menu" className="absolute top-12 left-0 z-20 min-w-48 rounded-card border border-line-strong bg-surface-2 py-1 shadow-2xl">
          <li>
            <button role="menuitem" onClick={() => (onChange({ kind: 'past' }), setOpen(false))} className="block w-full px-4 py-2 text-left text-sm hover:bg-surface-3">
              All past
            </button>
          </li>
          {past.map((k) => (
            <li key={k}>
              <button role="menuitem" onClick={() => (onChange({ kind: 'past', key: k }), setOpen(false))} className="block w-full px-4 py-2 text-left text-sm hover:bg-surface-3">
                {monthLabel(k, state.tz, now)}
              </button>
            </li>
          ))}
          {!past.length && <li className="px-4 py-2 text-sm text-muted">Nothing yet</li>}
        </ul>
      )}
    </div>
  );
}

/** Items for a menu choice: ahead ones (live included) by `aheadKey`, past ones by `pastKey`, newest first. */
function useScheduleView<T>(items: T[], isPast: (x: T) => boolean, aheadKey: (x: T) => string, pastKey: (x: T) => string) {
  const [view, setView] = useState<ScheduleView>({ kind: 'upcoming' });
  const ahead = items.filter((x) => !isPast(x));
  const gone = items.filter(isPast).reverse();
  const aheadMonths = [...new Set(ahead.map(aheadKey))];
  const pastMonths = [...new Set(gone.map(pastKey))];
  const shown = view.kind === 'upcoming' ? ahead : view.kind === 'month' ? ahead.filter((x) => aheadKey(x) === view.key) : view.key ? gone.filter((x) => pastKey(x) === view.key) : gone;
  return { view, setView, shown, aheadMonths, pastMonths };
}

/**
 * Schedule, season first. While a series is live it opens on that series' broadcasts by date — times (yours and Las
 * Vegas), buy-in and game, and Watch live / Remind me — with the year's series below. Between series it is the list of series.
 */
export function SchedulePage() {
  const now = useTick(60_000);
  const live = SEASON.find((s) => seriesState(s, now) === 'live');
  const others = [...SEASON].filter((s) => s !== live).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Page className="max-w-[72rem]">
      <h1 className="text-title">Schedule</h1>
      {live ? (
        <>
          <LiveSeriesSchedule s={live} />
          <section aria-label="This season" className="mt-14">
            <h2 className="text-xl sm:text-2xl">This season</h2>
            <div className="mt-4 space-y-4">
              {others.map((s) => (
                <SeriesCard key={s.id} s={s} st={seriesState(s, now)} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <SeriesList />
      )}
    </Page>
  );
}

/** Between series: every series under the PokerGO-style menu. */
function SeriesList() {
  const { state } = useApp();
  const now = useTick(60_000);
  const sorted = [...SEASON].sort((a, b) => a.start.localeCompare(b.start));
  const { view, setView, shown, aheadMonths, pastMonths } = useScheduleView(
    sorted,
    (s) => seriesState(s, now) === 'past',
    (s) => monthKey(Math.max(Date.parse(s.start), now), state.tz),
    (s) => monthKey(s.start, state.tz),
  );
  return (
    <>
      <ScheduleBar view={view} onChange={setView} ahead={aheadMonths} past={pastMonths} />
      <div className="mt-8 space-y-4">{shown.length ? shown.map((s) => <SeriesCard key={s.id} s={s} st={seriesState(s, now)} />) : <p className="text-sm text-muted">Nothing scheduled here.</p>}</div>
    </>
  );
}

/** The live series: a compact header, the menu, then its broadcasts under date headings. */
function LiveSeriesSchedule({ s }: { s: SeriesStop }) {
  const { state } = useApp();
  const now = useTick(30_000);
  const status = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
  const all = events
    .filter((e) => e.seriesId === s.id)
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .sort((a, b) => a.d.start.localeCompare(b.d.start));
  const { view, setView, shown, aheadMonths, pastMonths } = useScheduleView(
    all,
    (x) => status(x.d) === 'vod',
    (x) => monthKey(x.d.start, state.tz),
    (x) => monthKey(x.d.start, state.tz),
  );
  const byDate = new Map<string, ScheduleItem[]>();
  for (const x of shown) {
    const k = fmtDate(x.d.start, state.tz);
    byDate.set(k, [...(byDate.get(k) ?? []), x]);
  }
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <LiveTag />
        <Link to={`/schedule/${s.id}`} className="text-lg font-bold hover:text-gold-strong">
          {s.name}
        </Link>
        <span className="text-sm text-muted tnum">
          {shortDate(s.start, state.tz)} – {shortDate(s.end, state.tz)} · {s.venue}, {s.city}
        </span>
      </div>
      <ScheduleBar view={view} onChange={setView} ahead={aheadMonths} past={pastMonths} />
      <p className="mt-3 text-xs text-muted">Times in your time zone ({tzAbbr(state.tz, new Date(now))}), with Las Vegas time.</p>
      <div className="mt-6 space-y-8">
        {[...byDate.entries()].map(([date, items]) => (
          <section key={date} aria-label={date}>
            <h3 className="mb-2 text-base font-bold">{date}</h3>
            <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line">
              {items.map((x) => (
                <SeasonRow key={x.d.id} {...x} st={status(x.d)} />
              ))}
            </ol>
          </section>
        ))}
        {!byDate.size && <p className="text-sm text-muted">Nothing scheduled here.</p>}
      </div>
    </>
  );
}

/** One broadcast: time (yours / Las Vegas), title, buy-in and game, and Watch live / Remind me / Replay. */
function SeasonRow({ e, d, st }: ScheduleItem & { st: Day['status'] }) {
  const { state } = useApp();
  const title = titleOf({ e, d });
  const [on, toggle] = useReminder(`day:${d.id}`, title);
  const live = isBroadcasting(st);
  return (
    <li className={cx('flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5', live ? 'bg-live/5' : 'bg-surface')}>
      <span className="w-24 shrink-0 tnum">
        <span className="block text-base font-bold">{fmtTime(d.start, state.tz)}</span>
        <span className="block text-xs text-muted">{fmtTime(d.start, VENUE_TZ)} Las Vegas</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          {live && <LiveTag />}
          <Link to={`/watch/${d.id}`} className="text-[15px] font-bold hover:text-gold-strong">
            {title}
          </Link>
          <span className="text-xs text-muted">
            {e.buyIn ? money(e.buyIn) : 'Invitational'} · {e.game}
          </span>
        </span>
      </span>
      <span className="shrink-0">
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
          <Link to={`/watch/${d.id}`} className="text-sm font-semibold text-muted hover:text-text">
            Replay →
          </Link>
        )}
      </span>
    </li>
  );
}

/** One series, wsop.com style. Live: LIVE badge, what's on air and Watch live. Otherwise: just the facts. */
function SeriesCard({ s, st }: { s: SeriesStop; st: 'live' | 'upcoming' | 'past' }) {
  const { state } = useApp();
  const status = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
  const onAir = st === 'live' ? events.filter((e) => e.seriesId === s.id).flatMap((e) => e.days.filter((d) => isBroadcasting(status(d))).map((d) => ({ e, d }))) : [];
  const body = (
    <>
      <img src={s.art.src} style={artStyle(s.art)} alt="" className="aspect-video w-full shrink-0 rounded-card object-cover sm:w-56" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[4px] bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted uppercase">Bracelet series</span>
          {st === 'live' && <LiveTag />}
        </div>
        <p className="mt-2 text-xl font-bold">{s.name}</p>
        <p className="mt-1 text-sm text-text/85 tnum">
          {shortDate(s.start, state.tz)} – {shortDate(s.end, state.tz)}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {s.venue} · {s.city}
        </p>
        {onAir.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {onAir.map(({ e, d }) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <i className="live-dot size-1.5 rounded-full bg-live" aria-hidden />
                <Link to={`/watch/${d.id}`} className="font-semibold hover:text-gold-strong">
                  {titleOf({ e, d })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
  if (st === 'live')
    return (
      <div className="flex flex-col gap-4 rounded-panel border border-live/60 bg-surface p-4 sm:flex-row sm:items-center">
        {body}
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Link to={`/watch/${onAir[0]?.d.id ?? HERO_DAY_ID}`}>
            <Button variant="primary" tabIndex={-1}>
              <Icon name="play" size={16} /> Watch live
            </Button>
          </Link>
          <Link to={`/schedule/${s.id}`} className="text-sm font-semibold text-muted hover:text-text">
            Event schedule →
          </Link>
        </div>
      </div>
    );
  // Every other series opens its page (header and broadcast schedule).
  return (
    <Link to={`/schedule/${s.id}`} className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-4 hover:border-line-strong sm:flex-row sm:items-center">
      {body}
      <Icon name="chevron" size={18} className="hidden shrink-0 text-muted sm:block" />
    </Link>
  );
}

/**
 * One series, as on wsop.com/tournaments/<series>: the header (tag, name, dates, venue) and its broadcast schedule as a
 * table — date block, broadcast, buy-in, game, tables, and what you can do: Watch live, Watch replay or a reminder.
 */
export function SeriesSchedulePage() {
  const { seriesId = '' } = useParams();
  const { state } = useApp();
  const now = useTick(60_000);
  const s = SEASON.find((x) => x.id === seriesId);
  if (!s) return <NotFound />;
  const st = seriesState(s, now);
  const status = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
  const all = events
    .filter((e) => e.seriesId === s.id)
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .sort((a, b) => a.d.start.localeCompare(b.d.start));
  const { view, setView, shown: rows, aheadMonths, pastMonths } = useScheduleView(
    all,
    (x) => status(x.d) === 'vod',
    (x) => monthKey(x.d.start, state.tz),
    (x) => monthKey(x.d.start, state.tz),
  );
  return (
    <Page className="max-w-[72rem]">
      <Link to="/schedule" className="text-sm text-muted hover:text-text">
        ← Schedule
      </Link>
      <header className="mt-4 flex flex-col gap-5 rounded-panel border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[4px] bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted uppercase">Bracelet series</span>
            {st === 'live' && <LiveTag />}
          </div>
          <h1 className="mt-2 text-title">{s.name}</h1>
          <p className="mt-1 text-text/85 tnum">
            {shortDate(s.start, state.tz)} – {shortDate(s.end, state.tz)}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {s.venue} · {s.city}
          </p>
        </div>
        <img src={s.art.src} style={artStyle(s.art)} alt="" className="aspect-video w-full shrink-0 rounded-card object-cover sm:w-72" />
      </header>

      <section aria-label="Broadcast schedule" className="mt-10">
        <h2 className="text-xl sm:text-2xl">Broadcast schedule</h2>
        <p className="mt-1 text-sm text-muted">Times in your time zone ({tzAbbr(state.tz, new Date(now))}).</p>
        {all.length > 0 && <ScheduleBar view={view} onChange={setView} ahead={aheadMonths} past={pastMonths} />}
        {rows.length ? (
          <div className="mt-4 overflow-x-auto rounded-panel border border-line">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Broadcast</th>
                  <th className="px-4 py-3 font-semibold">Buy-in</th>
                  <th className="px-4 py-3 font-semibold">Game</th>
                  <th className="px-4 py-3 font-semibold">Tables</th>
                  <th className="px-4 py-3" aria-label="Watch" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ e, d }) => (
                  <BroadcastRow key={d.id} e={e} d={d} st={status(d)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-panel border border-line bg-surface p-5 text-sm text-muted">{all.length ? 'Nothing scheduled here.' : 'The broadcast schedule is announced closer to the series.'}</p>
        )}
      </section>
    </Page>
  );
}

function BroadcastRow({ e, d, st }: ScheduleItem & { st: Day['status'] }) {
  const { state } = useApp();
  const title = titleOf({ e, d });
  const [on, toggle] = useReminder(`day:${d.id}`, title);
  const date = new Date(d.start);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: state.tz }).format(date);
  const live = isBroadcasting(st);
  return (
    <tr className={cx(live ? 'bg-live/5' : 'bg-surface', st === 'vod' && 'text-text/80')}>
      <td className="px-4 py-3">
        <span className="flex items-center gap-3">
          <span className="w-10 text-center leading-tight">
            <span className="block text-[11px] text-muted uppercase">{part({ month: 'short' })}</span>
            <span className="block text-xl font-black tnum">{part({ day: '2-digit' })}</span>
            <span className="block text-[10px] font-bold text-muted uppercase">{part({ weekday: 'short' })}</span>
          </span>
          <span className="text-xs whitespace-nowrap text-muted tnum">{fmtTime(d.start, state.tz)}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          {live && <LiveTag />}
          <Link to={`/watch/${d.id}`} className="font-semibold hover:text-gold-strong">
            {title}
          </Link>
        </span>
        <span className="mt-0.5 block text-xs text-muted">Event #{e.number}</span>
      </td>
      <td className="px-4 py-3 tnum">{e.buyIn ? money(e.buyIn) : 'Invitational'}</td>
      <td className="px-4 py-3">{e.game}</td>
      <td className="px-4 py-3 tnum">{d.tables.length}</td>
      <td className="px-4 py-3 text-right">
        {live ? (
          <Link to={`/watch/${d.id}`}>
            <Button size="sm" variant="primary" tabIndex={-1}>
              <Icon name="play" size={14} /> Watch live
            </Button>
          </Link>
        ) : st === 'upcoming' ? (
          <button onClick={toggle} aria-pressed={on} aria-label={on ? `Reminder set for ${title}` : `Remind me about ${title}`} title={on ? 'Reminder set' : 'Remind me'} className={cx('inline-flex size-8 items-center justify-center rounded-full border', on ? 'border-gold bg-gold-dim text-gold-strong' : 'border-line-strong text-muted hover:text-text')}>
            <Icon name={on ? 'check' : 'bell'} size={14} />
          </button>
        ) : (
          <Link to={`/watch/${d.id}`} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
            Replay →
          </Link>
        )}
      </td>
    </tr>
  );
}

/** One event: its broadcasts in order and its key hands. */
export function EventPage() {
  const { eventId = '' } = useParams();
  const { state } = useApp();
  const e = eventById(eventId);
  const list = e ? eventVideos(e.id) : [];
  const ahead = e ? e.days.filter((d) => d.status === 'upcoming' && d.id !== HERO_DAY_ID) : [];
  if (!e || !(list.length + ahead.length)) return <NotFound />;
  const live = list.some((v) => isLive(v, state.streamMode));
  const clips = highlightClips.filter((v) => v.eventId === e.id);
  return (
    <Page className="max-w-[96rem] space-y-10">
      <div>
        <Link to={`/videos/replays?series=${e.seriesId}`} className="text-sm text-muted hover:text-text">
          ← Replays
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
          {ahead.map((d) => (
            <UpcomingCard key={d.id} e={e} d={d} />
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
