// v5 — the common watch page and tag pages (Home, Live, Events, Highlights and My List are in screens.tsx).
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { Button, Icon, LiveTag, Page, cx } from '../components/ui';
import { channelById, channels, programAt, upNext } from '../data/channels';
import { HERO_DAY_ID, dayById } from '../data/mock';
import { fmtTime } from '../lib/time';
import { duration } from '../lib/format';
import { tableVideo } from '../lib/media';
import { shortTableName, tableDelay } from '../lib/broadcast';
import { MyListButton } from '../features/library/listActions';
import { NotFound } from '../pages/NotFound';
import { About, KindChip, TagList, VideoCard, listKind, rowGrid } from './detail';
import { Player } from './Player';
import { byTag, channelVideo, clipsOf, eventDays, isLive, kindLabel, relatedTo, thumbStyle, videoById, type Video } from './catalog';
import { languagesFor } from './screens';

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
  const t = params.get('t');
  const catchup = params.get('catchup') ?? undefined;
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
  return (
    <WatchView
      key={`${v.id}:${program?.id ?? ''}:${t ?? ''}`}
      v={v}
      live={live}
      liveEdge={live ? liveEdge : undefined}
      channelId={channelId}
      now={now}
      startAt={t ? Number(t) : undefined}
      catchup={catchup}
    />
  );
}

type Format = 'full' | 'condensed' | 'hands';
const CONDENSED_SEC = 45 * 60;

function WatchView({ v, live, liveEdge, channelId, now, startAt, catchup }: { v: Video; live: boolean; liveEdge?: () => number; channelId?: string; now: number; startAt?: number; catchup?: string }) {
  const { state, set, toast } = useApp();
  // Mini player: scrolling the player out of view docks it bottom-right and it keeps playing.
  const holder = useRef<HTMLDivElement>(null);
  const [mini, setMini] = useState(false);
  const [closed, setClosed] = useState(false);
  // Live: the table feed and commentary language are picked here, next to the player (one destination per event).
  const [feed, setFeed] = useState(0);
  const [lang, setLang] = useState('English');
  // Replays: full broadcast, a condensed cut, or just the key hands.
  const [format, setFormat] = useState<Format>('full');
  const [restart, setRestart] = useState(0);
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
  const ref = v.dayId ? dayById(v.dayId) : undefined;
  const liveEvent = live && v.kind === 'broadcast' && ref ? ref : undefined;
  const replay = !live && (v.kind === 'broadcast' || v.kind === 'classic');
  const langs = liveEvent ? languagesFor(v.dayId, now) : [];
  const shown: Video = liveEvent
    ? { ...v, media: lang === 'Español' ? (channelVideo('wsop-es', now)?.media ?? v.media) : feed ? tableVideo(feed) : v.media }
    : replay && format === 'condensed'
      ? { ...v, id: `${v.id}~condensed`, title: `${v.title} · condensed`, durationSec: Math.min(CONDENSED_SEC, v.durationSec) }
      : v;
  const saved = state.progress[v.id] ?? 0;
  const watched = state.watched.includes(v.id);
  const episodes = replay && v.eventId ? eventDays(v.eventId) : [];
  const nextEp = episodes[episodes.findIndex((x) => x.id === v.id) + 1];
  const eventClips = v.eventId ? clipsOf(v.eventId) : [];
  const share = (sec: number) => {
    const url = `${location.href.split('#')[0]}#/watch/${v.id}${sec ? `?t=${Math.round(sec)}` : ''}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    toast(sec ? `Link copied · starts at ${duration(sec)}` : 'Link copied');
  };
  const delayNote = () => {
    if (!liveEvent) return '';
    const st = v.dayId === HERO_DAY_ID ? state.streamMode : liveEvent.day.status;
    const d = tableDelay(liveEvent.day.tables[lang === 'Español' ? 0 : feed], st);
    return d ? ` · ${d}-min broadcast delay: you're seeing play from about ${d} minutes ago. LIVE on the player returns to the live edge.` : ' · no broadcast delay';
  };
  const pill = (on: boolean) => cx('inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-semibold', on ? 'border-gold bg-gold-dim text-text' : 'border-line-strong text-muted hover:text-text');
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
              <Player key={`${feed}:${lang}:${format}:${restart}`} v={shown} live={live} liveEdge={liveEdge} mini={docked} startAt={restart ? 0 : startAt} />
            </div>
          </div>

          {/* Live: what's on screen, right under the player — table, language, delay. */}
          {liveEvent && (
            <div className="mt-3 space-y-2 rounded-panel border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Table">
                <span className="w-24 text-xs font-semibold text-subtle uppercase">Table</span>
                {liveEvent.day.tables.map((t, i) => (
                  <button key={t.id} onClick={() => (setFeed(i), setLang('English'))} aria-pressed={feed === i && lang === 'English'} className={pill(feed === i && lang === 'English')}>
                    {shortTableName(t.name)}
                  </button>
                ))}
              </div>
              {langs.length > 1 && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Commentary">
                  <span className="w-24 text-xs font-semibold text-subtle uppercase">Commentary</span>
                  {langs.map((l) => (
                    <button key={l} onClick={() => (setLang(l), setFeed(0))} aria-pressed={lang === l} className={pill(lang === l)}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted">
                {lang === 'Español' ? 'Feature table · Spanish commentary' : `${liveEvent.day.tables[feed].name} · English commentary`}
                {delayNote()}
              </p>
            </div>
          )}

          {/* Replays: resume or start over, time left, full / condensed / key hands, the next broadcast. */}
          {replay && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-panel border border-line bg-surface p-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Format">
                {(
                  [
                    ['full', `Full · ${duration(v.durationSec)}`],
                    ['condensed', `Condensed · ${duration(Math.min(CONDENSED_SEC, v.durationSec))}`],
                    ['hands', `Key hands · ${eventClips.length}`],
                  ] as [Format, string][]
                ).map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={format === k} onClick={() => setFormat(k)} className={pill(format === k)}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {format === 'full' && saved > 60 && !restart && (
                  <>
                    <span className="text-xs text-muted tnum">Resumed · {duration(Math.max(0, v.durationSec - saved))} left</span>
                    <button onClick={() => (set((s) => ({ progress: { ...s.progress, [v.id]: 0 } })), setRestart((n) => n + 1))} className={pill(false)}>
                      Start from beginning
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    set((s) => ({ watched: watched ? s.watched.filter((x) => x !== v.id) : [...s.watched, v.id] }));
                    toast(watched ? 'Back in Continue watching' : 'Marked as watched');
                  }}
                  aria-pressed={watched}
                  className={pill(watched)}
                >
                  {watched ? 'Watched' : 'Mark as watched'}
                </button>
                <button onClick={() => share(state.progress[v.id] ?? 0)} className={pill(false)} title="Copy a link to this moment">
                  Share moment
                </button>
              </span>
            </div>
          )}
          {replay && format === 'hands' && (
            <ol className="mt-3 divide-y divide-line rounded-panel border border-line bg-surface">
              {eventClips.map((c) => (
                <li key={c.id}>
                  <Link to={`/watch/${c.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                    <img src={c.thumb} style={thumbStyle(c)} alt="" className="aspect-video w-24 shrink-0 rounded-chip object-cover" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.title}</span>
                    <span className="text-xs text-muted tnum">{duration(c.durationSec)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {/* Clips: the moment in the full broadcast, learn, share. */}
          {v.kind === 'clip' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-panel border border-line bg-surface p-3">
              {v.dayId && (
                <Link to={`/watch/${v.dayId}?t=${momentOf(v)}`} className={pill(false)}>
                  Watch this moment in the full broadcast
                </Link>
              )}
              <button onClick={() => toast('Opens this spot in WSOP Academy (demo)')} className={pill(false)}>
                Learn this spot · Academy
              </button>
              <button onClick={() => share(0)} className={pill(false)}>
                Share hand
              </button>
            </div>
          )}

          {/* A 24/7 channel that is simulcasting a live event: the event is the place to watch it. */}
          {v.kind === 'channel' && v.program?.kind === 'live' && v.dayId && (
            <p className="mt-3 rounded-panel border border-line bg-surface p-3 text-sm">
              This channel is simulcasting a live event.{' '}
              <Link to={`/watch/${v.dayId}`} className="font-semibold text-gold-strong hover:underline">
                Open the event to choose a table or language →
              </Link>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-sans text-xl leading-snug font-bold normal-case sm:text-2xl">{v.kind === 'channel' ? v.title : shown.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                {live ? <LiveTag /> : <KindChip label={kindLabel(v, live)} className="bg-surface-3" />}
                <span>{v.subtitle}</span>
                {!live && <span>· {duration(shown.durationSec)}</span>}
              </p>
            </div>
            {v.kind !== 'channel' && <MyListButton kind={listKind(v)} id={v.id} size="md" />}
          </div>
          {nextEp && (
            <Link to={`/watch/${nextEp.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold-strong hover:underline">
              Next broadcast: {nextEp.stage} →
            </Link>
          )}
          <TagList v={v} className="mt-4" />
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-text/85">{v.description}</p>
          <div className="mt-6">
            <About v={v} />
          </div>
        </div>

        <aside className="space-y-6">
          {catchup && <CatchUp eventId={catchup} current={v.id} />}
          {channelId && <OnThisChannel channelId={channelId} now={now} />}
          <section aria-label="Related videos">
            <h2 className="mb-3 font-sans text-base font-bold normal-case">Related videos</h2>
            <ul className="space-y-3">
              {related.map((x) => (
                <li key={x.id}>
                  <Link to={`/watch/${x.id}`} className="group flex gap-3">
                    <span className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-chip bg-surface-2">
                      <img src={x.thumb} style={thumbStyle(x)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                      {isLive(x, state.streamMode) ? <LiveTag className="absolute top-1.5 left-1.5" /> : <KindChip label={kindLabel(x, false)} className="absolute top-1.5 left-1.5" />}
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

/** Where a clip sits in its full broadcast (seconds) — spread through the day, stable per clip. */
const momentOf = (v: Video) => {
  const ref = v.dayId ? dayById(v.dayId) : undefined;
  const len = ref ? ref.day.durationMin * 60 : 3600;
  return Math.round(((v.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) * 977) % (len - 600)) + 300);
};

/** Catch-up: a short run of key hands that ends by joining the live table. */
function CatchUp({ eventId, current }: { eventId: string; current: string }) {
  const { state } = useApp();
  const list = clipsOf(eventId).slice(0, 3);
  const i = list.findIndex((x) => x.id === current);
  const live = eventDays(eventId).find((x) => isLive(x, state.streamMode));
  const next = list[i + 1];
  return (
    <section aria-label="Catch-up" className="rounded-panel border border-gold/50 bg-gold-dim p-4">
      <p className="label text-gold">
        Catch-up · {i + 1} of {list.length}
      </p>
      <ol className="mt-2 space-y-1.5">
        {list.map((c, n) => (
          <li key={c.id} className={cx('flex items-center gap-2 text-sm', n === i ? 'font-bold' : 'text-muted')}>
            <span className="w-4 tnum">{n + 1}</span>
            <span className="min-w-0 flex-1 truncate">{c.title}</span>
            <span className="text-xs tnum">{duration(c.durationSec)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <Link to={`/watch/${next.id}?catchup=${eventId}`}>
            <Button size="sm" variant="secondary" tabIndex={-1}>
              Next hand
            </Button>
          </Link>
        )}
        {live && (
          <Link to={`/watch/${live.id}`}>
            <Button size="sm" variant="primary" tabIndex={-1}>
              <Icon name="play" size={14} /> Join live
            </Button>
          </Link>
        )}
      </div>
    </section>
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
  // Players and events are links to their own pages now, not tags (old links still land in the right place).
  if (slug.startsWith('player-')) return <Navigate to={`/players/${slug.slice(7)}`} replace />;
  if (slug.startsWith('event-')) return <Navigate to={`/events/${slug.slice(6)}`} replace />;
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

