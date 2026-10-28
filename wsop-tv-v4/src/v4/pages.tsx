// v4 — the common watch page, tag pages, Highlights and Archive (all built from the catalog and the one card).
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { Icon, LiveTag, Page, cx } from '../components/ui';
import { channelById, channels, programAt, upNext } from '../data/channels';
import { dayById } from '../data/mock';
import { fmtTime } from '../lib/time';
import { duration } from '../lib/format';
import { MyListButton } from '../features/library/listActions';
import { NotFound } from '../pages/NotFound';
import { About, TagList, VideoCard, VideoRow, listKind, rowGrid } from './detail';
import { Player } from './Player';
import { byTag, catalog, classics, highlightClips, isLive, recommended, relatedTo, replays, videoById, type Video } from './catalog';

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
                      <img src={x.thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
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

// ---- Highlights & Archive ------------------------------------------------------------------------------

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

export function ArchivePage() {
  const byEvent = [...new Set(replays.map((v) => v.eventId))].map((id) => replays.filter((v) => v.eventId === id));
  return (
    <Page className="max-w-[96rem] space-y-12">
      <h1 className="text-title">Archive</h1>
      <section aria-label="Classics">
        <h2 className="mb-3 text-xl sm:text-2xl">Classics</h2>
        <div className={rowGrid}>
          {classics.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </section>
      {byEvent.map((list) => (
        <VideoRow key={list[0].eventId} title={list[0].title.split(' · ')[0]} videos={list} action={<Link to={`/tag/event-${list[0].eventId}`} className="text-sm font-semibold text-muted hover:text-text">All →</Link>} />
      ))}
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
      <VideoRow title="Classics" videos={classics} action={more('/archive')} />
      <VideoRow title="Latest replays" videos={[...replays].reverse().filter((v) => !started.has(v.id))} action={more('/archive')} />
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
