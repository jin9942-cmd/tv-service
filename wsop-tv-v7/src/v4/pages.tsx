// v4 — the common watch page, Live, Videos (Highlights / Replays), the schedule, tag pages and the Home season strip
// (all built from the catalog and the one card).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useTick } from '../state/app';
import { DEMO_NOW } from '../lib/clock';
import { Button, Icon, LiveTag, Page, cx } from '../components/ui';
import { channelById, channels, programAt, programs, upNext, type LinearChannel } from '../data/channels';
import { HERO_DAY_ID, classicEvents, dayById, eventById, events, isClassicEvent, playerById, players, series, seriesById } from '../data/mock';
import type { Day, TourEvent } from '../data/types';
import { VENUE_TZ, fmtDate, fmtTime, tzAbbr } from '../lib/time';
import { isBroadcasting } from '../lib/broadcast';
import { duration, money } from '../lib/format';
import { MyListButton } from '../features/library/listActions';
import { NotFound } from '../pages/NotFound';
import { About, BadgeScope, EYEBROW, TagList, VideoCard, VideoRow, listKind, rowGrid } from './detail';
import { Player } from './Player';
import { BrowseAll, seasonPhoto } from './browse';
import { Carousel } from './carousel';
/** This year's season (the live series). */
const CURRENT_SEASON = 2025;
import { CHANNEL_ART, EXTERIOR, HERO_IMAGES, PLAYER_ART, SEASON_ART, TABLE_ART, VENUE_ART, artStyle, type Art } from '../lib/brand';
import { USED_THUMBS, byTag, catalog, channelVideo, highlightClips, isLive, relatedTo, replays, stageOf, videoById, type Video } from './catalog';
import { activeThemes, featuredTheme, homeHands, themeById } from './themes';
import { HALL_OF_FAME } from './halloffame';
import { ARCHIVE, archiveEvent, broadcastsOf } from './archive';
import { ytGroup } from './youtube';

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
  // VOD: a pre-play page first; its Play opens the player full screen (?play=1). Live and 24/7 play right away.
  const vod = !live && v.kind !== 'channel';
  if (vod) return params.get('play') === '1' ? <FullPlayer key={v.id} v={v} /> : <TitleView key={v.id} v={v} />;
  const channelId = v.kind === 'channel' ? id.slice(3) : undefined;
  const program = channelId ? programAt(channelId, now) : undefined;
  // Live edge in seconds: a channel counts from the start of what's on; a live broadcast from the day's start.
  const liveEdge = () => {
    if (program) return Math.max(60, (Date.now() - program.start) / 1000);
    const ref = v.dayId ? dayById(v.dayId) : undefined;
    return ref ? Math.max(120, Math.min(v.durationSec, (Date.now() - Date.parse(ref.day.start)) / 1000)) : v.durationSec;
  };
  // A live broadcast plays full screen straight away (24/7 channels keep the watch page).
  if (live && v.kind !== 'channel') return <FullPlayer key={v.id} v={v} live liveEdge={liveEdge} />;
  return <WatchView key={`${v.id}:${program?.id ?? ''}`} v={v} live={live} liveEdge={live ? liveEdge : undefined} channelId={channelId} now={now} />;
}

/**
 * VOD pre-play page: the picture with the title, what it is (series, aired, length, game), the description, Play and
 * My List; then suggested videos. Nothing else (no tabs). Play goes full screen.
 */
function TitleView({ v }: { v: Video }) {
  const nav = useNavigate();
  const { state } = useApp();
  const resume = state.progress[v.id];
  const ref = v.dayId ? dayById(v.dayId) : undefined;
  const play = () => {
    enterFullScreen();
    nav(`/watch/${v.id}?play=1`);
  };
  const facts = [ref && fmtDate(ref.day.start, state.tz), v.durationSec > 0 && duration(v.durationSec), ref?.event.game, ref?.event.buyIn ? `Buy-in ${money(ref.event.buyIn)}` : undefined].filter(Boolean);
  const suggested = relatedTo(v, 8);
  return (
    <>
      <div className="relative overflow-hidden bg-black">
        <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" aria-hidden />
        <Page className="relative flex min-h-[min(32rem,70vw)] flex-col justify-end py-8 sm:py-12">
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back" title="Back" className="mb-auto grid size-10 place-items-center rounded-full bg-white/90 text-black hover:bg-white">
            <Icon name="chevron" size={20} className="rotate-180" />
          </button>
          <div className="mt-10 max-w-2xl">
            <p className="text-xs font-bold tracking-wide text-gold-strong uppercase">{v.tags.find((t) => t.slug.startsWith('series-'))?.label ?? v.subtitle}</p>
            <h1 className="mt-2 font-sans text-3xl leading-tight font-bold normal-case sm:text-5xl">{v.title}</h1>
            <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-white/80 tnum">
              {facts.map((x, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="text-white/40">·</span>}
                  {x}
                </span>
              ))}
            </p>
            {v.description && <p className="mt-3 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-white/85">{v.description}</p>}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={play} className="inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-bold text-black hover:bg-white/85">
                <Icon name="play" size={18} /> {resume ? 'Resume' : 'Play'}
              </button>
              <MyListButton kind={listKind(v)} id={v.id} size="lg" className="rounded-full" />
            </div>
          </div>
        </Page>
      </div>
      {suggested.length > 0 && (
        <Page className="py-8">
          <h2 className="text-xl sm:text-2xl">Suggested</h2>
          <div className={cx(rowGrid, 'mt-4')}>
            <BadgeScope videos={suggested}>
            {suggested.map((x) => (
              <VideoCard key={x.id} v={x} {...playsFull(x, state.streamMode)} />
            ))}
            </BadgeScope>
          </div>
        </Page>
      )}
    </>
  );
}

/** Enter full screen (must run inside the click). */
const enterFullScreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
};
/** Card props that play a video full screen straight away (VOD); live and 24/7 open their player as usual. */
const playsFull = (x: Video, mode: Day['status']) => (isLive(x, mode) || x.kind === 'channel' ? {} : { href: `/watch/${x.id}?play=1`, onOpen: enterFullScreen });

/** VOD playback after Play: the player fills the screen; closing it (or leaving full screen) goes back to the pre-play page. */
function FullPlayer({ v, live = false, liveEdge }: { v: Video; live?: boolean; liveEdge?: () => number }) {
  const nav = useNavigate();
  // Leaving: VOD goes back to its pre-play page; live goes back to where you came from.
  const leave = () => (live ? (window.history.length > 1 ? nav(-1) : nav('/')) : nav(`/watch/${v.id}`, { replace: true }));
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  useEffect(() => {
    const on = () => {
      if (!document.fullscreenElement) leaveRef.current();
    };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const close = () => (document.fullscreenElement ? document.exitFullscreen().catch(leave) : leave());
  const { state } = useApp();
  const [panel, setPanel] = useState(false);
  const next = relatedTo(v, 10);
  // Picking from Suggested: VOD keeps playing full screen; a live broadcast opens its live player.
  const pick = (x: Video) => {
    setPanel(false);
    nav(isLive(x, state.streamMode) || x.kind === 'channel' ? `/watch/${x.id}` : `/watch/${x.id}?play=1`, { replace: true });
  };
  const round = 'grid size-10 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/30 hover:bg-black/80';
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black">
      <button onClick={close} aria-label="Close player" title="Close" className={cx(round, 'absolute top-4 left-4 z-10')}>
        <Icon name="close" size={20} />
      </button>
      <div className="w-full" style={{ maxWidth: 'calc(100vh * 16 / 9)' }}>
        <Player v={v} live={live} liveEdge={liveEdge} upNext={next.length ? { open: panel, toggle: () => setPanel((p) => !p) } : undefined} />
      </div>
      {/* Suggested: videos in a side panel over the player. */}
      {panel && (
        <aside aria-label="Suggested" className="absolute top-0 right-0 bottom-16 z-10 flex w-[min(24rem,90vw)] flex-col rounded-bl-panel bg-black/90 pt-6 backdrop-blur">
          <h2 className="px-5 text-lg font-bold">Suggested</h2>
          <ul className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
            {next.map((x) => (
              <li key={x.id}>
                <button onClick={() => pick(x)} className="group flex w-full gap-3 rounded-card p-2 text-left hover:bg-white/10">
                  <span className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-card bg-surface-2">
                    <img src={x.thumb} style={artStyle({ pos: x.thumbPos, fit: x.thumbFit })} alt="" className="absolute inset-0 size-full object-cover" />
                    {isLive(x, state.streamMode) ? null : <span className="absolute right-1.5 bottom-1.5 rounded-[4px] bg-black/80 px-1 text-[10px] font-semibold text-white tnum">{duration(x.durationSec)}</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-semibold group-hover:text-gold-strong">{x.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
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
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-semibold group-hover:text-gold-strong">{x.title}</span>
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
                {!live && v.durationSec > 0 && <span>· {duration(v.durationSec)}</span>}
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
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-semibold group-hover:text-gold-strong">{x.title}</span>
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
        <BadgeScope videos={videos}>
        {videos.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
        </BadgeScope>
      </div>
    </Page>
  );
}

// ---- Videos ------------------------------------------------------------------------------------------

/** Browse (as v8): Years and Players. Hand clips have no page of their own (Home's hands row and the themes carry them). */
/** Browse: one page, no Years / Players split (the old /videos/players address lands here too). */
export function VideosPage(_: { tab?: 'years' | 'players' }) {
  return (
    <Page className="max-w-[96rem]">
      <h1 className={PAGE_TITLE}>Browse</h1>
      <BrowseAll />
    </Page>
  );
}


export { catalog };

// ---- Home rows ---------------------------------------------------------------------------------------

/**
 * v7 Home rows, programmed like a sports network (see ./themes.ts):
 * - in season (the series and two weeks after): the featured theme (this series' final tables), Main Event day by
 *   day, Must-See Hands (no chip-count rows: the launch service has no chip feed);
 * - off-season: the week's featured theme, Best Hands of the <year> WSOP, This Day in WSOP History, Poker Hall of Fame;
 * then Seasons, the Collections shelf (six themes), and Continue watching and My List at the bottom.
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
  // The programming follows the calendar (see ./themes.ts). `?date=2025-11-10` shows Home as it reads on that day.
  const [params] = useSearchParams();
  const now = Date.parse(params.get('date') ?? '') || Date.now();
  // Home is programmed in three kinds of rows (what F1 TV, UFC Fight Pass and NBA League Pass have in common):
  //   Season — the last series' results;  Players — one player's story;  Classics — the hands and final tables people
  //   come back for. Then the collections, and the personal rows last. Rows already placed stay off the shelf.
  const placed = [EDITORS_THEME, 'this-series', 'mizrachi-run', 'main-event-day-by-day'];
  const hands = homeHands(now);
  return (
    <>
      {/* Season */}
      <ThemeRow id="this-series" now={now} />
      {/* Players */}
      <ThemeRow id="mizrachi-run" now={now} />
      {/* Continue watching in the middle of Home (signed in, with something to continue). */}
      <ContinueRow items={continuing} onRemove={removeContinue} />
      {/* Classics */}
      <CarouselRow title={hands.title} videos={hands.videos} />
      <SeasonTiles />
      <ThemeShelf skip={shown} now={now} placed={placed} />
      {/* My List last. */}
      <MyListRow videos={myRow} />
    </>
  );
}

// ---- players on Home ---------------------------------------------------------------------------------


/** A player card: type only (no photos yet), the name large, a line of fact under it. */
function PlayerTile({ to, rank, name, cc, line, out, photo }: { to?: string; rank: string; name: string; cc: string; line: string; out?: boolean; photo?: string }) {
  // With a photo: the face fills the card, the name under it (the Hall of Fame row).
  const body = photo ? (
    <span className="block">
      <span className="relative block aspect-square overflow-hidden rounded-card border border-line bg-surface-2 transition-colors group-hover:border-white/40">
        <img src={photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 to-transparent px-2.5 pt-8 pb-2">
          <span className="font-display text-xl leading-none tnum">{rank}</span>
          <span className="text-[11px] font-semibold text-white/80">{cc}</span>
        </span>
      </span>
      <span className="mt-2 line-clamp-2 block min-h-[2lh] text-[15px] leading-snug font-bold group-hover:text-gold-strong">{name}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">{line}</span>
    </span>
  ) : (
    <span className={cx('flex h-full flex-col justify-between gap-5 rounded-card border border-line bg-surface p-4 transition-colors', to && 'group-hover:border-white/40 group-hover:bg-surface-2', out && 'opacity-60')}>
      <span className="flex items-start justify-between gap-2">
        <span className="font-display text-3xl leading-none tnum">{rank}</span>
        <span className="text-xs font-semibold text-muted">{cc}</span>
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 min-h-[2lh] text-[15px] leading-snug font-bold group-hover:text-gold-strong">{name}</span>
        <span className="mt-1 block truncate text-xs text-muted tnum">{line}</span>
      </span>
    </span>
  );
  return to ? (
    <Link to={to} className="group block h-full">
      {body}
    </Link>
  ) : (
    <div className="h-full">{body}</div>
  );
}

/** A top-level page's title (Browse, Schedule): the same size and type on every page. */
export const PAGE_TITLE = 'text-2xl sm:text-3xl';

const playerRowGrid = 'hscroll gap-3 [&>*]:w-[42%] sm:[&>*]:w-[calc((100%-3*0.75rem)/4)] lg:[&>*]:w-[calc((100%-8*0.75rem)/9)]';

/** Poker Hall of Fame (off-season): the latest classes from WSOP.com's list, newest first; legends open their page. */
export function HallOfFameRow() {
  const list = HALL_OF_FAME.slice(0, 12);
  return (
    <Section title="Poker Hall of Fame" action={more('/videos/players', 'All players')}>
      <ul className={playerRowGrid}>
        {list.map((x) => (
          <li key={x.name} className="min-w-0">
            <PlayerTile to={x.to} rank={String(x.year)} name={x.name} cc={x.cc} line={x.country} photo={x.photo} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Continue watching: big pictures with a thick progress bar and the title (no time left); one sideways line. */
function ContinueRow({ items, onRemove }: { items: { v: Video; sec: number }[]; onRemove: (v: Video) => void }) {
  if (!items.length) return null;
  return (
    <Section title="Continue watching">
      <ul className="hscroll gap-5 [&>*]:w-[78%] sm:[&>*]:w-[calc((100%-1.25rem)/2)] lg:[&>*]:w-[calc((100%-2.5rem)/3)]">
        {items.map(({ v, sec }) => {
          const pct = Math.min(100, Math.round((sec / v.durationSec) * 100));
          return (
            <li key={v.id} className="group relative min-w-0">
              <Link to={`/watch/${v.id}`} className="block" aria-label={`Resume ${v.title}`}>
                <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
                  <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                  {/* Its length, as on every other card (above the progress bar). */}
                  {v.durationSec > 0 && <span className="pointer-events-none absolute right-2 bottom-3 rounded-[4px] bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white tnum">{duration(v.durationSec)}</span>}
                  <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
                    <i className="block h-full bg-gold" style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-semibold group-hover:text-gold-strong">{v.title}</span>
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


/**
 * Past videos for the archive row: every broadcast of the events from before the current series (the classics, and the
 * series that came before it), the final day first, with its year and, where it has one, its champion.
 */
type ArchiveEntry = { v: Video; year: number; playerId?: string; player?: string };
const archiveEntries = (): ArchiveEntry[] => {
  const current = seriesById(dayById(HERO_DAY_ID)!.event.seriesId);
  return [...classicEvents, ...events.filter((e) => seriesById(e.seriesId).start < current.start)]
    .flatMap((e) => {
      const year = Number((isClassicEvent(e) ? e.name : seriesById(e.seriesId).name).slice(0, 4));
      const champ = players.find((p) => p.id === e.winnerId);
      const playerId = champ?.id;
      const player = champ?.name;
      return e.days
        .filter((x) => x.status === 'vod')
        .reverse()
        .flatMap((d) => {
          const v = videoById(d.id);
          return v ? [{ v, year, playerId, player }] : [];
        });
    })
    .sort((a, b) => b.year - a.year);
};

/** The archive's groups: one per year (newest first) and one per champion (most videos first). */
type ArchiveGroup = { key: string; label: string; entries: ArchiveEntry[] };
function archiveGroups(by: 'year' | 'player'): ArchiveGroup[] {
  const all = archiveEntries().filter((x) => by === 'year' || x.playerId);
  const map = new Map<string, ArchiveGroup>();
  for (const x of all) {
    const key = by === 'year' ? `year-${x.year}` : `player-${x.playerId}`;
    const g = map.get(key) ?? { key, label: by === 'year' ? String(x.year) : x.player!, entries: [] };
    g.entries.push(x);
    map.set(key, g);
  }
  const list = [...map.values()];
  return by === 'year' ? list : list.sort((a, b) => b.entries.length - a.entries.length || a.label.localeCompare(b.label));
}
const archiveGroup = (key: string) => archiveGroups(key.startsWith('year-') ? 'year' : 'player').find((g) => g.key === key);

/**
 * Seasons: this year and the six before it as type-only season tiles (the same tiles and counts as Browse > Years);
 * each opens the year in Browse, and All years opens Browse.
 */
/**
 * Popular Final Tables From the Archive (F1 TV's "Popular Races From The Archive"): the past Main Event final tables as
 * videos, most watched first, each on its champion's winning moment. Home doesn't repeat Browse's year tiles.
 */
const archiveFinals = (): Video[] =>
  ARCHIVE.filter((y) => !y.classic && y.year < CURRENT_SEASON)
    .map((y) => {
      const ref = archiveEvent(`${y.year}-lv-main`);
      if (!ref) return undefined;
      const days = broadcastsOf(ref);
      const i = ref.event.days.findIndex((d) => /final/i.test(d.label));
      const v = days[i >= 0 ? i : days.length - 1];
      return v ? ({ ...v, title: `${y.year} Main Event Final Table`, subtitle: y.champion ? `Won by ${y.champion.name}` : v.subtitle, thumb: seasonPhoto(y.year), thumbPos: '50% 50%', thumbFit: undefined } as Video) : undefined;
    })
    .filter((v): v is Video => !!v)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

function SeasonTiles() {
  // The Main Event final tables of the archive, then the channel's iconic moments.
  const finals = [...archiveFinals(), ...ytGroup('iconic')];
  return (
    <Section title="Iconic Final Tables" action={more('/videos', 'View all')}>
      <Carousel className="gap-4 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*1rem)/3)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
        <BadgeScope videos={finals}>
          {finals.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard v={v} />
            </li>
          ))}
        </BadgeScope>
      </Carousel>
    </Section>
  );
}

/** One year or one champion from the archive: every video in it. */
export function ArchivePage() {
  const { key = '' } = useParams();
  // A year now lives in Browse (old /archive/year-2025 links land there).
  if (key.startsWith('year-')) return <Navigate to={`/videos/year/${key.slice(5)}`} replace />;
  const g = archiveGroup(key);
  if (!g) return <NotFound />;
  const vs = g.entries.map((x) => x.v);
  return (
    <Page className="max-w-[96rem]">
      <Link to="/" className="text-sm text-muted hover:text-text">
        ← Home
      </Link>
      <p className="mt-3 text-sm text-muted">{key.startsWith('year-') ? 'WSOP Season' : 'Champion'}</p>
      <h1 className="mt-1 text-title">{key.startsWith('year-') ? `${g.label} WSOP` : g.label}</h1>
      <p className="mt-1 text-sm text-muted">{vs.length} video{vs.length === 1 ? '' : 's'}</p>
      <div className={cx(rowGrid, 'mt-6')}>
        <BadgeScope videos={vs}>
          {vs.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </BadgeScope>
      </div>
    </Page>
  );
}

/** My List: the standard card, four across (same size as the rows around it). */
function MyListRow({ videos }: { videos: Video[] }) {
  return <VideoRow title="My List" videos={videos} action={more('/my-list', 'Go to My List')} />;
}

// ---- curated collections ----------------------------------------------------------------------------

// The themes themselves (rules, rotation, pin) live in ./themes.ts.
/** The all-time final tables theme: the featured theme already covers final tables, so it stays off Home. */
const EDITORS_THEME = 'final-tables';


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
  // Pictures no video card, channel or tile uses (so a cover never repeats a thumbnail on the page).
  const pool = [...TABLE_ART, ...Object.values(PLAYER_ART).map((list) => list[0]), ...VENUE_ART.filter((a) => !EXTERIOR.has(a.src))].filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i && !USED_THUMBS.has(a.src) && a.src !== SEASON_ART.src);
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

// The season's own theme carries no label (its title says it); a pinned or rotating one is marked Featured collection.
const FEATURED_LABEL = { pinned: 'Featured collection', seasonal: '', weekly: 'Featured collection' } as const;

/**
 * The featured theme on Home: one wide card (title, note, how long, Play all) with its first videos beside it. Which
 * theme it is comes from ./themes.ts: the operator's pin, a seasonal theme while it's on, or the weekly rotation.
 */
export function FeaturedTheme({ now, skip, id }: { now: number; skip: string[]; id?: string }) {
  const pinned = id ? themeById(id, now) : undefined;
  const f = pinned ? { ...pinned, why: 'seasonal' as const } : featuredTheme(now, skip);
  if (!f) return null;
  const { theme, videos } = f;
  return (
    <section aria-label={theme.title} className="relative overflow-hidden rounded-card border border-line bg-[radial-gradient(90%_120%_at_0%_0%,rgba(212,175,55,0.16),transparent_60%),linear-gradient(180deg,#141210,#0b0b0b)] p-5 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center">
        <div>
          {(theme.eyebrow ?? FEATURED_LABEL[f.why]) && <p className="text-[11px] font-bold tracking-wide text-gold-strong uppercase">{theme.eyebrow ?? FEATURED_LABEL[f.why]}</p>}
          <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">
            <Link to={`/collections/${theme.id}`} className="hover:underline hover:decoration-2 hover:underline-offset-4">
              {theme.title}
            </Link>
          </h2>
          <div className="mt-6">
            {/* No count or running time here: the videos are right beside it. The button opens the full list. */}
            <Link to={`/collections/${theme.id}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/85">
              See more <Icon name="chevron" size={16} />
            </Link>
          </div>
        </div>
        {/* Every video of the theme, three at a time, swiped or stepped with the arrows (the count above is what's here). */}
        <div className="min-w-0">
          <Carousel label={`${theme.title}: videos`} className="gap-4 [&>*]:w-[78%] sm:[&>*]:w-[calc((100%-2rem)/3)]">
            <BadgeScope videos={videos}>
              {videos.map((v) => (
                <li key={v.id} className="min-w-0">
                  <VideoCard v={v} />
                </li>
              ))}
            </BadgeScope>
          </Carousel>
        </div>
      </div>
    </section>
  );
}

/**
 * Every other theme on show, as a shelf of covers (title, note, how many videos); each opens its page. Filled by
 * ./themes.ts, so a new theme appears here on its own and one with too few videos drops out.
 */
function ThemeShelf({ skip, now, placed }: { skip: Set<string>; now: number; placed: string[] }) {
  // Five: one full row of covers (Home no longer has a separate featured theme, so none is held back for it).
  const list = activeThemes(now).filter((x) => !placed.includes(x.theme.id)).slice(0, 5);
  if (!list.length) return null;
  const pick = photoPicker(skip);
  const usedArt = new Set<string>();
  const skipThumbs = new Set([...skip].map((id) => videoById(id)?.thumb ?? ''));
  return (
    <Section title="WSOP Stories">
      {/* Tall poster covers (2:3), unlike the wide video rows around it: a collection reads as a set, not one video. */}
      {/* On wide screens the covers share the full row (4–6 of them), so the shelf never ends short. */}
      <ul
        style={{ '--n': Math.max(4, list.length) } as CSSProperties}
        className="hscroll gap-4 [&>*]:w-[44%] sm:[&>*]:w-[calc((100%-3*1rem)/3.5)] lg:[&>*]:w-[calc((100%_-_(var(--n)_-_1)*1rem)/var(--n))]"
      >
        {list.map(({ theme, videos }) => {
          // Each cover is a picture from its own videos that no other cover (or card above) shows; else a spare still.
          const own = videos.map((v) => v.thumb).find((t) => t && !usedArt.has(t) && !skipThumbs.has(t));
          const art: Pic = own ? { thumb: own, thumbPos: 'center' } : pick();
          usedArt.add(art.thumb);
          return (
            <li key={theme.id} className="min-w-0">
              <Link to={`/collections/${theme.id}`} className="group relative block aspect-[2/3] lg:aspect-[4/5] overflow-hidden rounded-card border border-line bg-surface-2 transition-colors hover:border-white/40">
                <img src={art.thumb} style={artStyle({ pos: art.thumbPos, fit: art.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
                <span className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" aria-hidden />
                <span className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 flex flex-col p-4">
                  <span className="font-display text-xl leading-[1.05] uppercase xl:text-2xl">{theme.title}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** One theme as its own Home row: the title and the videos in order. */
function ThemeRow({ id, now }: { id: string; now: number }) {
  const t = activeThemes(now).find((x) => x.theme.id === id);
  if (!t) return null;
  const { theme, videos } = t;
  return (
    <Section title={theme.title} eyebrow={theme.eyebrow} action={more(`/collections/${theme.id}`, 'View all')}>
      <ol className="hscroll gap-4 [&>*]:w-[78%] sm:[&>*]:w-[calc((100%-1rem)/2)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
        <BadgeScope videos={videos}>
          {videos.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard v={v} />
            </li>
          ))}
        </BadgeScope>
      </ol>
    </Section>
  );
}


/** A theme's page: its note, Play all, and the videos in watching order. */
/** ← Back: the previous screen in history (Home when the page was opened directly). */
function BackLink() {
  const nav = useNavigate();
  return (
    <button onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav('/'))} className="text-sm text-muted hover:text-text">
      ← Back
    </button>
  );
}

export function CollectionPage() {
  const { id = '' } = useParams();
  const t = themeById(id);
  if (!t || !t.videos.length) return <NotFound />;
  const { theme, videos: vs } = t;
  return (
    <Page className="max-w-[96rem]">
      {/* Back goes to exactly the screen (and the place on it) you came from. */}
      <BackLink />
      <p className="mt-3 text-[11px] font-bold tracking-wide text-gold-strong uppercase">Collection</p>
      <h1 className="mt-1 text-title">{theme.title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-text/85">{theme.blurb}</p>
      <p className="mt-1 text-sm text-muted tnum">
        {vs.length} videos
      </p>
      {/* No Play all: the collection is a set of videos to pick from, not a playlist. */}
      <div className={cx(rowGrid, 'mt-6')}>
        <BadgeScope videos={vs}>
        {vs.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
        </BadgeScope>
      </div>
    </Page>
  );
}


const more = (to: string, label = 'More') => (
  <Link to={to} className="text-sm font-semibold whitespace-nowrap text-muted hover:text-text">
    {label} →
  </Link>
);

/** A Home section: the title (editorial ones carry a gold label beside it, as Curated collections does) and a link. */
function Section({ title, eyebrow, label, action, children }: { title: string; eyebrow?: string; label?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xl sm:text-2xl">
            {eyebrow && <span className={EYEBROW}>{eyebrow}</span>}
            {title}
          </h2>
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
          <BadgeScope videos={list}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
          </BadgeScope>
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
          <span className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-semibold">{x.title}</span>
        </span>
      </button>
    </li>
  );
}

// ---- Schedule ---------------------------------------------------------------------------------------

const BREAKS = ['Coming Up', 'A continuación'];

/** The series running now (none in the between-series preview). */
export const runningSeries = (off: boolean) => (off ? undefined : series.find((s) => Date.parse(s.start) <= Date.now() && Date.now() <= Date.parse(s.end)));

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

export function EventCard({ e }: { e: TourEvent }) {
  const { state } = useApp();
  const list = eventVideos(e.id);
  const cover = list.find((v) => stageOf(v) === 'Final Table') ?? list[list.length - 1];
  const art = cover ? { src: cover.thumb, pos: cover.thumbPos, fit: cover.thumbFit } : dayArt(e, e.days[0]);
  const ahead = e.days.filter((d) => d.status === 'upcoming').length;
  // Replays only: a broadcast that is on air now is not counted, and the card carries no LIVE tag.
  const replayCount = list.filter((v) => !isLive(v, state.streamMode)).length;
  return (
    <Link to={`/events/${e.id}`} className="group block min-w-0">
      <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
        <img src={art.src} style={artStyle(art)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold group-hover:text-gold-strong">{e.name.replace(' World Championship', '')}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {seriesById(e.seriesId).name} · {replayCount ? `${replayCount} replay${replayCount === 1 ? '' : 's'}` : `${ahead} coming up`}
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
type SeriesStop = { id: string; name: string; venue: string; city: string; tz?: string; start: string; end: string; art: Art };

const DAY_MS = 86_400_000;
/** The season's WSOP series (the 2025 Las Vegas series), from the data. */
/** The Schedule's moment (see SchedulePage). */
const SCHEDULE_AT = Date.parse('2026-07-14T21:00:00Z');
const SEASON: SeriesStop[] = [
  // The demo series' dates cover all of their broadcasts.
  // The season as signed off: 2025 Paradise, 2026 WSOP Europe (Prague), the 2026 World Series of Poker, 2026 Super Circuit Canada.
  ...['pa25', 'eu26', 'lv26', 'ca26'].map((id) => series.find((x) => x.id === id)!).map((s) => {
    const starts = events.filter((e) => e.seriesId === s.id).flatMap((e) => e.days.map((d) => d.start));
    const first = [s.start, ...starts].sort()[0];
    const last = [s.end, ...starts].sort().pop()!;
    return { ...s, start: first, end: last, art: s.id === 'lv26' ? TABLE_ART[0] : s.id === 'pa25' ? VENUE_ART[3] : s.id === 'eu26' ? VENUE_ART[2] : VENUE_ART[0] };
  }),
];

const seriesState = (s: SeriesStop, now: number) => (Date.parse(s.start) <= now && now <= Date.parse(s.end) ? 'live' : Date.parse(s.start) > now ? 'upcoming' : 'past');
const shortDate = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: tz }).format(new Date(iso));

/**
 * Schedule: the season's series in date order, each a fold (picture, state, name, dates, venue). The running series is
 * open on arrival (else the next one); `/schedule/:seriesId` opens a given one. Open, a series shows its broadcasts
 * still to come (live first), with the ones already shown folded under "Earlier broadcasts".
 */
export function SchedulePage() {
  const { seriesId } = useParams();
  // The Schedule shows the season as signed off: Jul 14, 2026 in Las Vegas, the Main Event final table on air (the rest of
  // the demo is set on May 15, 2026). The clock keeps moving from there.
  const now = useTick(60_000) - DEMO_NOW + SCHEDULE_AT;
  const byStart = [...SEASON].sort((a, b) => a.start.localeCompare(b.start));
  const first =
    SEASON.find((x) => x.id === seriesId) ??
    SEASON.find((x) => seriesState(x, now) === 'live') ??
    byStart.find((x) => seriesState(x, now) === 'upcoming') ??
    byStart[byStart.length - 1];
  const [open, setOpen] = useState<Set<string>>(() => new Set([first.id]));
  useEffect(() => setOpen((o) => (o.has(first.id) ? o : new Set([...o, first.id]))), [first.id]);
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <Page className="max-w-[96rem]">
      {/* The page title, the same as Browse's (Schedule has no sub-menu, so no tabs under it). */}
      <h1 className={PAGE_TITLE}>Schedule</h1>
      <p className="mt-1 text-sm text-muted">This season's series. Open one to see its broadcasts.</p>
      <div className="mt-6 flex flex-col gap-3">
        {byStart.map((x) => (
          <SeriesFold key={x.id} s={x} open={open.has(x.id)} onToggle={() => toggle(x.id)} now={now} />
        ))}
      </div>
    </Page>
  );
}

/**
 * One series as a fold: the bar (picture, state, name, dates, venue, and a Show / Hide button) is always on view;
 * open, it holds the series' broadcast schedule. The running series opens by itself, the past and later ones stay folded.
 */
function SeriesFold({ s, open, onToggle, now }: { s: SeriesStop; open: boolean; onToggle: () => void; now: number }) {
  const { state } = useApp();
  const st = seriesState(s, now);
  const left = Math.ceil((Date.parse(s.start) - now) / DAY_MS);
  const total = Math.round((Date.parse(s.end) - Date.parse(s.start)) / DAY_MS) + 1;
  const day = Math.min(total, Math.floor((now - Date.parse(s.start)) / DAY_MS) + 1);
  const bodyId = `fold-${s.id}`;
  return (
    <section aria-label={s.name} className={cx('overflow-hidden rounded-panel border bg-surface', st === 'live' ? 'border-gold/70' : 'border-line')}>
      <button onClick={onToggle} aria-expanded={open} aria-controls={bodyId} className="flex w-full items-center gap-4 p-3 text-left hover:bg-surface-2 sm:p-4">
        <img src={s.art.src} style={artStyle(s.art)} alt="" className={cx('aspect-video shrink-0 rounded-card object-cover', 'w-24 sm:w-32', st === 'past' && 'opacity-70')} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            {st === 'live' ? (
              <LiveTag />
            ) : (
              <span className="rounded-[4px] border border-line-strong px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">{st === 'upcoming' ? 'Upcoming' : 'Past'}</span>
            )}
            <span className={cx('text-xs font-semibold tnum', st === 'live' ? 'text-live' : 'text-muted')}>
              {st === 'live' ? `Day ${day} of ${total}` : st === 'upcoming' ? (left <= 1 ? 'Starts tomorrow' : `Starts in ${left} days`) : 'Replays'}
            </span>
          </span>
          <span className={cx('mt-1 block font-bold', 'text-lg sm:text-xl', st === 'past' && !open && 'text-text/80')}>{s.name}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted sm:text-sm">
            <span className="tnum">{shortDate(s.start, s.tz ?? state.tz)} – {shortDate(s.end, s.tz ?? state.tz)}</span>
            <span className="hidden sm:inline">{s.venue} · {s.city}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-text/85">
          <span className="hidden sm:inline">{open ? 'Hide' : 'Schedule'}</span>
          <span className="grid size-9 place-items-center rounded-full border border-line-strong">
            <Icon name="chevron" size={18} className={cx('transition-transform', open ? '-rotate-90' : 'rotate-90')} />
          </span>
        </span>
      </button>
      {open && (
        <div id={bodyId} className="border-t border-line px-3 pt-4 pb-5 sm:px-5">
          <SeriesSchedule s={s} now={now} />
        </div>
      )}
    </section>
  );
}

/**
 * A series' broadcasts: the ones still to come (live included) in date order, then the ones already shown, folded
 * under "Earlier broadcasts (n)", newest first, each with its replay. A series that is over lists its replays only.
 */
function SeriesSchedule({ s, now }: { s: SeriesStop; now: number }) {
  const { state } = useApp();
  const st = seriesState(s, now);
  // Recommended from this series: its latest replays, then its key hands (four in all).
  const ofSeries = catalog.filter((v) => v.eventId && eventById(v.eventId)?.seriesId === s.id && !isLive(v, state.streamMode));
  // The 2026 series: the WSOP channel's real uploads of it (its broadcasts here are schedule entries, not files).
  const seriesVideos = s.id === 'lv26' ? ytGroup('season26').slice(0, 4) : [...ofSeries.filter((v) => v.kind === 'broadcast').reverse().slice(0, 2), ...ofSeries.filter((v) => v.kind === 'clip').slice(0, 2)];
  const status = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
  const all = events
    .filter((e) => e.seriesId === s.id)
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .sort((a, b) => a.d.start.localeCompare(b.d.start));
  // At most 10 rows: a series with more broadcast days lists one row per event (live day, else final table, else last day).
  const MAX_ROWS = 10;
  const rows =
    all.length <= MAX_ROWS
      ? all
      : events
          .filter((e) => e.seriesId === s.id)
          .map((e) => {
            const d = e.days.find((x) => isBroadcasting(status(x))) ?? e.days.find((x) => x.label === 'Final Table') ?? e.days[e.days.length - 1];
            return { e, d };
          })
          .sort((a, b) => a.d.start.localeCompare(b.d.start))
          .slice(-MAX_ROWS);
  // Live and upcoming first (soonest first), then what has aired (newest first); every row shown, nothing folded.
  const ahead = rows.filter((x) => status(x.d) !== 'vod');
  const earlier = rows.filter((x) => status(x.d) === 'vod').reverse();
  const table = (rows: ScheduleItem[]) => (
    <div className="mt-3 overflow-x-auto rounded-panel border border-line">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="bg-surface-2 text-xs text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Event</th>
            <th className="px-4 py-3 font-semibold">Buy-in</th>
            <th className="px-4 py-3 font-semibold">Game</th>
            <th className="px-4 py-3" aria-label="Watch" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ e, d }) => (
            <BroadcastRow key={d.id} e={e} d={d} st={status(d)} venueTz={s.tz ?? VENUE_TZ} />
          ))}
        </tbody>
      </table>
    </div>
  );
  if (!all.length)
    return (
      <p className="rounded-panel border border-line bg-surface-2 p-5 text-sm text-muted">
        {st === 'past' ? 'Replays of this series are in Browse.' : 'The broadcast schedule is announced closer to the series.'}
      </p>
    );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {st === 'past' ? 'Every broadcast is on demand. ' : ''}Times in your time zone ({tzAbbr(state.tz, new Date(now))}), with local time in {s.city.split(',')[0]}.
        </p>
        {/* A series that is over: no extra button here; its Videos row below carries the one All replays → link. */}
      </div>
      {/* One table: a series that is over reads first day to last; a running one puts live and upcoming on top. */}
      {rows.length > 0 && table(ahead.length === 0 ? [...earlier].reverse() : [...ahead, ...earlier])}
      {/* The series' videos: newest replays and key hands, with what they are and how long they run. */}
      {seriesVideos.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 className="text-base font-bold">Videos from this series</h3>
            <Link to={`/videos/year/${s.name.slice(0, 4)}`} className="text-sm font-semibold text-muted hover:text-text">
              All replays →
            </Link>
          </div>
          <div className={rowGrid}>
            <BadgeScope videos={seriesVideos}>
            {seriesVideos.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
            </BadgeScope>
          </div>
        </div>
      )}
    </>
  );
}

/** One broadcast in the table: date block (with the venue's local time), event and broadcast, buy-in, game, and what you can do. */
function BroadcastRow({ e, d, st, venueTz }: ScheduleItem & { st: Day['status']; venueTz: string }) {
  const { state } = useApp();
  const title = titleOf({ e, d });
  const [on, toggle] = useReminder(`day:${d.id}`, title);
  const date = new Date(d.start);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: state.tz }).format(date);
  const live = isBroadcasting(st);
  return (
    <tr className={cx(live ? 'bg-live/5' : 'bg-surface', st === 'vod' && 'text-text/80')}>
      <td className="px-4 py-3">
        <span className="flex w-24 flex-col items-center overflow-hidden rounded-card border border-line text-center leading-tight">
          <span className="block w-full bg-surface-3 py-0.5 text-[11px] text-muted">{part({ month: 'short' })}</span>
          <span className="block pt-1 text-lg font-black tnum">{part({ day: '2-digit' })}</span>
          <span className="block text-[10px] font-bold text-muted uppercase">{part({ weekday: 'short' })}</span>
          <span className="block pb-1 text-xs font-semibold tnum">{fmtTime(d.start, state.tz)}</span>
          <span className="block w-full border-t border-line py-0.5 text-[10px] text-muted tnum">{fmtTime(d.start, venueTz)} local</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="block text-xs text-gold-strong">Event #{e.number}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2">
          {live && <LiveTag />}
          <Link to={`/watch/${d.id}`} className="text-[15px] font-bold hover:text-gold-strong">
            {title}
          </Link>
        </span>
      </td>
      <td className="px-4 py-3 tnum">{e.buyIn ? (e.currency === '€' ? `€${e.buyIn.toLocaleString('en-US')}` : money(e.buyIn)) : 'TBA'}</td>
      <td className="px-4 py-3">{e.game}</td>
      <td className="px-4 py-3 text-right">
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
          // On demand: Watch on WSOP TV (grey, so Watch live stays the one red button in the table).
          <Link to={`/watch/${d.id}`}>
            <Button size="sm" variant="secondary" tabIndex={-1} className="whitespace-nowrap">
              <Icon name="play" size={14} /> Watch on WSOP TV
            </Button>
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
        <Link to={`/videos/year/${seriesById(e.seriesId).name.slice(0, 4)}`} className="text-sm text-muted hover:text-text">
          ← {seriesById(e.seriesId).name.slice(0, 4)} season
        </Link>
        <h1 className="mt-2 text-title">{e.name.replace(' World Championship', '')}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {live && <LiveTag />}
          <span>
            {seriesById(e.seriesId).name} · {e.game} · Buy-in {e.buyIn ? money(e.buyIn) : 'Invitational'} · {e.entrants.toLocaleString('en-US')} entries · Prize pool {money(e.prizePool)}
          </span>
        </p>
        {/* The winner: on to their page (the loop: event → player). */}
        {e.winnerId ? (
          <p className="mt-3 text-[15px]">
            Winner ·{' '}
            <Link to={`/videos/players/${e.winnerId}`} className="font-semibold text-gold-strong hover:underline">
              {playerById(e.winnerId).name}
            </Link>{' '}
            <span className="text-muted tnum">· {money(e.firstPrize)}</span>
          </p>
        ) : (
          live && <p className="mt-3 text-[15px] font-semibold">The final table is on air now</p>
        )}
      </div>
      <section aria-label="Broadcasts">
        <h2 className="mb-3 text-xl sm:text-2xl">Broadcasts</h2>
        <div className={rowGrid}>
          <BadgeScope videos={list}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} progress={state.progress[v.id] ? state.progress[v.id] / v.durationSec : undefined} />
          ))}
          </BadgeScope>
          {ahead.map((d) => (
            <UpcomingCard key={d.id} e={e} d={d} />
          ))}
        </div>
      </section>
      <VideoRow title="Key Hands" videos={clips} action={<Link to={`/tag/event-${e.id}`} className="text-sm font-semibold text-muted hover:text-text">All videos →</Link>} />
    </Page>
  );
}

// ---- 24/7 channel cards (Home) -------------------------------------------------------------------------

/**
 * One 24/7 channel: its picture, what's on, the channel (no end time) and Watch now. On the Channel guide the card
 * selects the channel (`onSelect`); on Home the whole card opens it on Live.
 */
function ChannelCard({ c, now, selected, onSelect }: { c: LinearChannel; now: number; selected?: boolean; onSelect?: () => void }) {
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

/** A Home row of videos in a sideways carousel (four across, the arrows step through the rest). */
function CarouselRow({ title, videos }: { title: string; videos: Video[] }) {
  if (!videos.length) return null;
  return (
    <Section title={title}>
      <Carousel className="gap-4 [&>*]:w-[70%] sm:[&>*]:w-[calc((100%-2*1rem)/3)] lg:[&>*]:w-[calc((100%-3*1rem)/4)]">
        <BadgeScope videos={videos}>
          {videos.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard v={v} />
            </li>
          ))}
        </BadgeScope>
      </Carousel>
    </Section>
  );
}
