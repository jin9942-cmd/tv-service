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
import { CHANNEL_ART, EXTERIOR, HERO_IMAGES, PLAYER_ART, TABLE_ART, VENUE_ART, artStyle } from '../lib/brand';
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
export function VideosPage({ tab }: { tab: 'highlights' | 'replays' }) {
  const tabs = [
    ['/videos', 'Highlights', 'highlights'],
    ['/videos/replays', 'Replays', 'replays'],
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
      {tab === 'highlights' ? <HighlightsTab /> : <ReplaysTab />}
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
 * v7 Home rows, in this order: Continue watching, Editor's pick (best final tables), My List, Recommended for you,
 * Latest replays, Curated collections, Shorts. No video appears in two rows.
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
  const picks = take(editorsFinalTables(), 3);
  const myRow = take(mine, 6);
  const recs = take(recommended, 4);
  const latest = take([...replays].reverse(), 4);
  const shorts = take(highlightClips, 10);
  const pick = photoPicker(shown);
  return (
    <>
      <ContinueRow items={continuing} onRemove={removeContinue} />
      <EditorsPick picks={picks} />
      <MyListRow videos={myRow} />
      <VideoRow title="Recommended for you" videos={recs} />
      <VideoRow title="Latest replays" videos={latest} action={more('/videos/replays')} />
      <CollectionsRow skip={shown} pick={pick} />
      <ShortsRow videos={shorts} pick={pick} />
    </>
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
  // Different pictures side by side, and pictures of play (no casino exteriors).
  for (const x of [...finals].sort((a, b) => b.views - a.views)) if (!EXTERIOR.has(x.thumb) && !picked.some((p) => p.thumb === x.thumb && p.thumbPos === x.thumbPos)) picked.push(x);
  return picked;
};

/**
 * Editorial areas (Editor's pick, Curated collections) sit on their own band — a warm tinted panel with a gold rule and
 * an "Editor's pick" / "Curated" label — so they read as chosen by people, apart from the personal and automatic rows.
 */
function EditorialBand({ label, title, note, action, children }: { label: string; title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="relative overflow-hidden rounded-panel border border-gold/30 bg-[linear-gradient(135deg,#2a2010_0%,#16130c_45%,#0f0f10_100%)] p-5 sm:p-7">
      <span className="absolute inset-y-0 left-0 w-1 bg-gold" aria-hidden />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-gold-strong uppercase">
            <Icon name="star" size={12} /> {label}
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl">{title}</h2>
          {note && <p className="mt-1.5 text-[15px] leading-relaxed text-text/80">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Editor's pick: a big lead final table with the story on the picture, and the next two beside it. */
function EditorsPick({ picks }: { picks: Video[] }) {
  if (!picks.length) return null;
  const [lead, ...rest] = picks;
  const total = picks.reduce((n, v) => n + v.durationSec, 0);
  return (
    <EditorialBand
      label="Editor’s pick"
      title="The best final tables"
      note={`Where bracelets are won: the final tables worth watching start to finish. ${picks.length} picks · ${duration(total)} in all.`}
      action={more('/collections/final-tables', 'All final tables')}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Link to={`/watch/${lead.id}`} className="group relative block aspect-video overflow-hidden rounded-card bg-surface-2">
          <img src={lead.thumb} style={artStyle({ pos: lead.thumbPos, fit: lead.thumbFit })} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" aria-hidden />
          <span className="absolute top-3 left-3 rounded-[4px] bg-gold px-2 py-0.5 text-[11px] font-black tracking-wide text-ink uppercase">No. 1</span>
          <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <span className="block text-xl leading-tight font-bold sm:text-3xl">{lead.title}</span>
            <span className="mt-1.5 line-clamp-2 block max-w-xl text-sm text-white/80">{lead.description}</span>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
              <Icon name="play" size={14} /> Watch · {duration(lead.durationSec)}
            </span>
          </span>
        </Link>
        <ol className="grid gap-4">
          {rest.map((v, i) => (
            <li key={v.id}>
              <Link to={`/watch/${v.id}`} className="group flex h-full gap-3 rounded-card bg-black/30 p-2.5 hover:bg-black/50 lg:flex-col">
                <span className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-chip bg-surface-2 lg:w-full">
                  <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute top-2 left-2 rounded-[4px] bg-black/75 px-1.5 py-0.5 text-[10px] font-black text-gold-strong uppercase">No. {i + 2}</span>
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[15px] font-bold group-hover:text-gold-strong">{v.title}</span>
                  <span className="mt-0.5 block text-xs text-muted tnum">{duration(v.durationSec)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </EditorialBand>
  );
}

/** My List: small cards, six across, like a shelf. */
function MyListRow({ videos }: { videos: Video[] }) {
  if (!videos.length) return null;
  return (
    <Section title="My List" action={more('/my-list', 'See all')}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {videos.map((v) => (
          <Link key={v.id} to={`/watch/${v.id}`} className="group min-w-0">
            <span className="relative block aspect-video overflow-hidden rounded-chip bg-surface-2">
              <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
            </span>
            <span className="mt-1.5 block truncate text-[13px] font-semibold group-hover:text-gold-strong">{v.title}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
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

function CollectionsRow({ skip, pick }: { skip: Set<string>; pick: (own?: Pic) => Pic }) {
  return (
    <EditorialBand label="From the archive" title="Curated collections" note="Hand-picked sets of the hands and tables people still talk about.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLLECTIONS.map((c) => {
          const vs = c.videos();
          // A photo from the collection the rows above don't show, else another photo not on the page.
          const own = [...vs].reverse().find((v) => !skip.has(v.id) && !isStill(v.thumb));
          const cover = pick(own);
          return (
            <Link key={c.id} to={`/collections/${c.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-surface-2 ring-1 ring-gold/25 hover:ring-gold">
              {cover && <img src={cover.thumb} style={artStyle({ pos: cover.thumbPos, fit: cover.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <span className="mb-2 block h-0.5 w-8 bg-gold" aria-hidden />
                <span className="block text-base leading-tight font-bold sm:text-xl">{c.title}</span>
                <span className="mt-1 block text-xs text-white/75">
                  {vs.length} videos · {c.blurb}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </EditorialBand>
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
    <Section title="Shorts" kicker="Key hands in under a few minutes" action={more('/shorts', 'Watch Shorts')}>
      <ul className="hscroll gap-3 [&>*]:w-[42%] sm:[&>*]:w-[calc((100%-2.25rem)/4)] lg:[&>*]:w-[calc((100%-4.5rem)/7)]">
        {videos.map((v, i) => (
          <li key={v.id} className="min-w-0">
            <Link to={`/shorts?start=${v.id}`} className="group relative block aspect-[9/16] overflow-hidden rounded-card bg-surface-2">
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

/** The Shorts feed: one vertical clip per screen, swipe or scroll to the next; starts at ?start=. */
export function ShortsPage() {
  const [params] = useSearchParams();
  const start = params.get('start');
  const list = start ? [...highlightClips.filter((v) => v.id === start), ...highlightClips.filter((v) => v.id !== start)] : highlightClips;
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title">Shorts</h1>
      <div className="mx-auto mt-4 h-[calc(100dvh-13rem)] max-w-[24rem] snap-y snap-mandatory overflow-y-auto rounded-panel bg-black" aria-label="Shorts">
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
    </Page>
  );
}

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
 * Schedule, in the wsop.com/schedule style: a filter bar (All · Live · Past · Upcoming), then the broadcasts as cards
 * under month headings — live now first, then earlier broadcasts (newest first), then what's coming. A live card carries
 * the LIVE icon; an upcoming card counts down and opens its waiting screen (timer and Remind me).
 */
type ScheduleFilter = 'all' | 'live' | 'replays' | 'upcoming';
type ScheduleItem = { e: TourEvent; d: Day };

export function SchedulePage() {
  const { state } = useApp();
  const now = useTick(1000);
  const [f, setF] = useState<ScheduleFilter>('all');
  const status = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
  const all = events.flatMap((e) => e.days.map((d) => ({ e, d }))).sort((a, b) => a.d.start.localeCompare(b.d.start));
  const liveNow = all.filter((x) => isBroadcasting(status(x.d)));
  // Past: the last two weeks of finished broadcasts, newest first.
  const earlier = all.filter((x) => status(x.d) === 'vod' && Date.parse(x.d.start) > now - 14 * 86_400_000).reverse();
  const upcoming = all.filter((x) => status(x.d) === 'upcoming');
  const tabs: [ScheduleFilter, string, number][] = [
    ['all', 'All', liveNow.length + earlier.length + upcoming.length],
    ['live', 'Live', liveNow.length],
    ['replays', 'Past', earlier.length],
    ['upcoming', 'Upcoming', upcoming.length],
  ];
  const show = (k: ScheduleFilter) => f === 'all' || f === k;
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title">Schedule</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-4" role="tablist" aria-label="Show">
        {tabs.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className={chip(f === k)}>
            {k === 'live' && <i className="live-dot mr-1.5 inline-block size-2 rounded-full bg-live align-middle" aria-hidden />}
            {label} <span className="ml-1 text-xs opacity-70 tnum">{n}</span>
          </button>
        ))}
        <span className="ml-auto text-sm text-muted">Times in your time zone ({tzAbbr(state.tz, new Date(now))})</span>
      </div>
      <div className="mt-8 space-y-12">
        {show('live') && liveNow.length > 0 && (
          <ScheduleGroup title="Live now" live>
            {liveNow.map((x) => (
              <ScheduleCard key={x.d.id} {...x} st={status(x.d)} now={now} />
            ))}
          </ScheduleGroup>
        )}
        {show('replays') && earlier.length > 0 && (
          <ScheduleGroup title="Past" sub="Earlier broadcasts — watch the full replay">
            {byMonth(earlier, state.tz).map(([m, items]) => (
              <MonthBlock key={m} month={m}>
                {items.map((x) => (
                  <ScheduleCard key={x.d.id} {...x} st={status(x.d)} now={now} />
                ))}
              </MonthBlock>
            ))}
          </ScheduleGroup>
        )}
        {show('upcoming') && upcoming.length > 0 && (
          <ScheduleGroup title="Upcoming" sub="Open one for the countdown, or set a reminder">
            {byMonth(upcoming, state.tz).map(([m, items]) => (
              <MonthBlock key={m} month={m}>
                {items.map((x) => (
                  <ScheduleCard key={x.d.id} {...x} st={status(x.d)} now={now} />
                ))}
              </MonthBlock>
            ))}
          </ScheduleGroup>
        )}
      </div>
    </Page>
  );
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
/** Items grouped under month headings ("November 2026"), in the order given. */
function byMonth(items: ScheduleItem[], tz: string): [string, ScheduleItem[]][] {
  const out = new Map<string, ScheduleItem[]>();
  for (const x of items) {
    const k = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: tz }).format(new Date(x.d.start)) || MONTH.format(new Date(x.d.start));
    out.set(k, [...(out.get(k) ?? []), x]);
  }
  return [...out.entries()];
}

function ScheduleGroup({ title, sub, live, children }: { title: string; sub?: string; live?: boolean; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl">
        {live && <i className="live-dot size-2.5 rounded-full bg-live" aria-hidden />}
        {title}
      </h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-4 space-y-6">{children}</div>
    </section>
  );
}

function MonthBlock({ month, children }: { month: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">{month}</p>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

/** Countdown text: "2d 04:12:09" / "04:12:09". */
const countdownText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d ? `${d}d ${hms}` : hms;
};

/**
 * One broadcast as a wsop.com-style card: date block, a status label (LIVE with its dot, REPLAY, UPCOMING), the title,
 * series and venue, the time — and Watch live / Watch replay, or the countdown and Remind me.
 */
function ScheduleCard({ e, d, st, now }: ScheduleItem & { st: Day['status']; now: number }) {
  const { state } = useApp();
  const se = seriesById(e.seriesId);
  const title = titleOf({ e, d });
  const [on, toggle] = useReminder(`day:${d.id}`, title);
  const live = isBroadcasting(st);
  const upcoming = st === 'upcoming';
  const date = new Date(d.start);
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: state.tz }).format(date);
  const dd = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: state.tz }).format(date);
  return (
    // Live cards span the page, so Watch live sits at their right end; the two-across cards keep it under the title.
    <div className={cx('flex min-w-0 gap-4 rounded-panel border bg-surface p-4', live ? 'flex-wrap items-center border-live/60 sm:flex-nowrap' : 'border-line')}>
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-card bg-surface-2 py-2">
        <span className="text-[11px] font-bold text-muted uppercase">{wd}</span>
        <span className="text-2xl leading-none font-black tnum">{dd}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <LiveTag />
          ) : (
            <span className={cx('label rounded-[4px] px-1.5 py-0.5 text-[10px]', upcoming ? 'bg-gold-dim text-gold-strong' : 'bg-surface-3 text-muted')}>{upcoming ? 'Upcoming' : 'Replay'}</span>
          )}
          <span className="text-xs text-muted tnum">
            {fmtTime(d.start, state.tz)} · {fmtTime(d.start, VENUE_TZ)} in Las Vegas
          </span>
        </div>
        <Link to={`/watch/${d.id}`} className="mt-1.5 block truncate text-[17px] font-bold hover:text-gold-strong">
          {title}
        </Link>
        <p className="mt-0.5 truncate text-sm text-muted">
          {se.name} · {se.venue}, {se.city}
        </p>
        {!live && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {upcoming ? (
            <>
              <Link to={`/watch/${d.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-semibold tnum hover:border-text" aria-label={`Starts in ${countdownText(Date.parse(d.start) - now)} — open the countdown`}>
                <Icon name="history" size={14} /> {countdownText(Date.parse(d.start) - now)}
              </Link>
              <Button size="sm" variant={on ? 'secondary' : 'outline'} onClick={toggle} aria-pressed={on}>
                <Icon name={on ? 'check' : 'bell'} size={14} /> {on ? 'Reminder set' : 'Remind me'}
              </Button>
            </>
          ) : (
            <Link to={`/watch/${d.id}`}>
              <Button size="sm" variant="secondary" tabIndex={-1}>
                <Icon name="play" size={14} /> Watch replay · {duration(d.durationMin * 60)}
              </Button>
            </Link>
          )}
        </div>
        )}
      </div>
      {live && (
        <Link to={`/watch/${d.id}`} className="shrink-0 sm:ml-auto">
          <Button variant="primary" tabIndex={-1}>
            <Icon name="play" size={16} /> Watch live
          </Button>
        </Link>
      )}
    </div>
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
