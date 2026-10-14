import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { AudioTrack, Hand, OverlayLevel } from '../data/types';
import { HERO_DAY_ID, dayById, hands, playerById, seriesById } from '../data/mock';
import { PLATFORMS, overlayAllowed } from '../data/platforms';
import { chips, duration } from '../lib/format';
import { countdown, fmtDateTime } from '../lib/time';
import { gateFor, useApp, useTick } from '../state/app';
import { useLiveStacks } from '../state/stacks';
import { BraceletIcon, Button, Icon, Page, Segmented, Skeleton, Spoiler, StatusBadge, cx } from '../components/ui';
import { Stage } from '../features/player/Stage';
import { AUDIO_LABEL, Controls } from '../features/player/Controls';
import { SidePanel } from '../features/player/SidePanel';
import { HAND_META, HandGlyph } from '../features/player/markers';
import { PlaybackGate, RegionBlocked } from '../features/auth/Gates';
import { NotFound } from './NotFound';

const CAPTIONS: Record<AudioTrack, string[]> = {
  en: ['Han has been patient all level — this is the spot she was waiting for.', 'Whitfield takes his time. Seven-time champion, never rushed.', 'The crowd in Las Vegas is completely silent.'],
  es: ['Han ha sido paciente todo el nivel.', 'Whitfield se toma su tiempo.', 'Silencio absoluto en Las Vegas.'],
  natural: ['[Crowd murmurs]', '[Dealer: "Action is on you, sir."]', '[Applause from the rail]'],
};

export function Watch() {
  const { dayId = '' } = useParams();
  const [params] = useSearchParams();
  const ref = dayById(dayId);
  if (!ref) return <NotFound />;
  return <WatchInner key={dayId} dayId={dayId} startAt={params.get('t')} />;
}

function WatchInner({ dayId, startAt }: { dayId: string; startAt: string | null }) {
  const { state, set, toast } = useApp();
  const { event, day } = dayById(dayId)!;
  const se = seriesById(event.seriesId);
  const caps = PLATFORMS[state.platform];
  const now = useTick(1000);
  const stacks = useLiveStacks();

  const status = dayId === HERO_DAY_ID ? state.streamMode : day.status;
  const isLive = status === 'live' || status === 'delayed';
  const fullLen = day.durationMin * 60;
  const delaySec = status === 'delayed' ? 30 * 60 : 0;
  const elapsed = (now - Date.parse(day.start)) / 1000;
  /** VOD: full length · live: the (possibly delayed) live edge. */
  const end = status === 'vod' ? fullLen : Math.max(120, Math.min(fullLen, elapsed - delaySec));

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [follow, setFollow] = useState(isLive && !startAt);
  const [position, setPosition] = useState(() => (startAt ? Number(startAt) : isLive ? end : (state.progress[dayId] ?? 0)));
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [cc, setCc] = useState(state.ccDefault);
  const [audio, setAudio] = useState<AudioTrack>(caps.audioTracks ? state.audioDefault : 'en');
  const [quality, setQuality] = useState('Auto');
  const [overlay, setOverlay] = useState<OverlayLevel>(overlayAllowed(state.platform, state.overlayDefault) ? state.overlayDefault : caps.overlayMax);
  const [views, setViews] = useState<1 | 2 | 4>(1);
  const [mainTable, setMainTable] = useState(day.tables[0].id);
  const [audioTable, setAudioTable] = useState(day.tables[0].id);
  const [fullscreen, setFullscreen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, []);

  // Platform change may lower what's allowed.
  useEffect(() => {
    if (!overlayAllowed(state.platform, overlay)) setOverlay(caps.overlayMax);
    if (views > caps.multiview) setViews(caps.multiview);
  }, [state.platform, caps, overlay, views]);

  // Clock: live follows the edge; VOD advances while playing.
  useEffect(() => {
    if (!playing) return;
    if (isLive && follow) setPosition(end);
    else setPosition((p) => Math.min(end, p + 1));
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mode switch from the demo panel (LIVE / DELAYED / VOD) → reposition sensibly.
  useEffect(() => {
    setFollow(isLive);
    setPosition((p) => (isLive ? end : Math.min(p, fullLen)));
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember VOD progress for Continue Watching (on leave).
  const posRef = useRef(position);
  posRef.current = position;
  useEffect(() => () => set((s) => (status === 'vod' ? { progress: { ...s.progress, [dayId]: posRef.current } } : {})), []); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = useCallback(
    (t: number) => {
      const c = Math.max(0, Math.min(end, t));
      setPosition(c);
      setFollow(isLive && end - c < 5);
    },
    [end, isLive],
  );

  // Hand markers. Live: scale into what has aired so far so the timeline is always populated.
  const markers: Hand[] = useMemo(
    () =>
      hands
        .filter((h) => h.dayId === dayId)
        .map((h) => (isLive ? { ...h, t: Math.round((h.t / fullLen) * end * 0.96) } : h))
        .sort((a, b) => a.t - b.t),
    [dayId, isLive, fullLen, end],
  );
  const prevHand = () => {
    const h = [...markers].reverse().find((m) => m.t < position - 3);
    if (h) seek(h.t);
    else toast('This is the first hand of the broadcast');
  };
  const nextHand = () => {
    const h = markers.find((m) => m.t > position + 3);
    if (h) seek(h.t);
    else toast(isLive ? 'You are at the latest hand' : 'No more hands in this broadcast');
  };

  const toggleFullscreen = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => setFullscreen((f) => !f));
  };
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const phase = Math.floor(now / 6000) % 3;
  const captionLine = cc ? CAPTIONS[audio][Math.floor(now / 5000) % 3] : null;

  // Access checks happen at play time (soft paywall).
  const gate = gateFor(state.scenario);
  const blocked = state.regionBlocked ? 'region' : status === 'upcoming' ? 'upcoming' : gate !== 'ok' ? gate : null;

  const onKey = (e: React.KeyboardEvent) => {
    if (blocked || (e.target as HTMLElement).closest('input, [role="menu"], [role="slider"]')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') (e.preventDefault(), setPlaying((p) => !p), setFollow(false));
    if (k === 'j') seek(position - 10);
    if (k === 'l') seek(position + 10);
    if (k === 'm') setMuted((m) => !m);
    if (k === 'c') setCc((c) => !c);
    if (k === 'f') toggleFullscreen();
  };

  const tiles = (() => {
    const ordered = [day.tables.find((t) => t.id === mainTable)!, ...day.tables.filter((t) => t.id !== mainTable)];
    return ordered.slice(0, views);
  })();
  const multiAvailable = Math.min(caps.multiview, day.tables.length);

  const panel = <SidePanel stacks={stacks} phase={phase} tables={day.tables} mainTable={mainTable} onSelectTable={(id) => (setMainTable(id), setAudioTable(id))} spoilerKey={dayId} />;

  return (
    <Page className="max-w-[96rem] py-4 sm:py-6">
      {/* title */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label flex items-center gap-1.5 text-subtle">
            <BraceletIcon size={14} /> {se.name} · Event #{event.number}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {event.name} <span className="text-muted">· {day.label}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Link to={`/events/${event.id}`} className="text-sm font-semibold text-muted hover:text-text">
            Event details →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {/* player */}
          <div
            ref={box}
            tabIndex={-1}
            onKeyDown={onKey}
            className={cx('group/player relative overflow-hidden rounded-panel border border-line bg-black', fullscreen && 'fixed inset-0 z-[70] rounded-none border-0')}
            aria-label={`${event.name} ${day.label} player`}
          >
            <div className={cx('relative', fullscreen ? 'h-full' : 'aspect-video')}>
              {loading ? (
                <Skeleton className="absolute inset-0 rounded-none" />
              ) : blocked === 'region' ? (
                <RegionBlocked />
              ) : blocked === 'upcoming' ? (
                <Upcoming dayId={dayId} start={day.start} />
              ) : blocked ? (
                <PlaybackGate gate={blocked} returnTo={`/watch/${dayId}`} />
              ) : (
                <>
                  <div className={cx('grid size-full gap-0.5 bg-black', views === 2 && 'grid-cols-2', views === 4 && 'grid-cols-2 grid-rows-2')}>
                    {tiles.map((t, i) => {
                      const Tile = views > 1 ? 'button' : 'div';
                      return (
                      <Tile
                        key={t.id}
                        onClick={views > 1 ? () => setAudioTable(t.id) : undefined}
                        className={cx('relative min-h-0 text-left', views > 1 && 'cursor-pointer', views > 1 && audioTable === t.id && 'outline-2 -outline-offset-2 outline-gold')}
                        aria-label={views > 1 ? `${t.name}${audioTable === t.id ? ', audio on' : ', select to hear this table'}` : undefined}
                      >
                        {t.failing && views > 1 ? (
                          <div className="stage flex size-full items-center justify-center text-xs text-muted">{t.name} · feed unavailable</div>
                        ) : (
                          <Stage
                            overlay={overlay}
                            tableName={t.name}
                            seats={stacks}
                            playing={playing}
                            phase={phase}
                            caption={audioTable === t.id ? captionLine : null}
                            compact={views > 1}
                            hue={220 + i * 25}
                            muted={muted || (views > 1 && audioTable !== t.id)}
                          />
                        )}
                        {views > 1 && (
                          <span className="label absolute top-1.5 left-1.5 flex items-center gap-1 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[9px]">
                            {t.name}
                            {audioTable === t.id && <Icon name="volume" size={11} className="text-gold" />}
                          </span>
                        )}
                      </Tile>
                      );
                    })}
                  </div>
                  <div className="pointer-events-none absolute top-3 left-3 hidden items-center gap-2 sm:flex">
                    <StatusBadge status={status} />
                    {quality !== 'Auto' && <span className="label rounded-[3px] bg-black/60 px-1.5 py-0.5 text-[10px]">{quality}</span>}
                  </div>
                  {!playing && (
                    <button onClick={() => setPlaying(true)} className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:border-gold" aria-label="Play">
                      <Icon name="play" size={30} />
                    </button>
                  )}
                </>
              )}
            </div>
            {!loading && !blocked && (
              // Phones: control bar sits under the picture; larger screens: overlaid on it.
              <div className={cx(fullscreen ? 'absolute inset-x-0 bottom-0' : 'relative bg-black sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent')}>
                <Controls
                  status={status}
                  playing={playing}
                  onTogglePlay={() => (setPlaying((p) => !p), setFollow(false))}
                  position={position}
                  end={end}
                  onSeek={seek}
                  markers={markers}
                  onPrevHand={prevHand}
                  onNextHand={nextHand}
                  onJumpLive={() => (seek(end), setPlaying(true))}
                  volume={volume}
                  muted={muted}
                  onVolume={(v) => (setVolume(v), setMuted(v === 0))}
                  onMute={() => setMuted((m) => !m)}
                  cc={cc}
                  onCc={() => setCc((c) => !c)}
                  audio={audio}
                  onAudio={(a) => (setAudio(a), toast(`Audio: ${AUDIO_LABEL[a]}`))}
                  audioTracksSupported={caps.audioTracks}
                  quality={quality}
                  onQuality={setQuality}
                  onFullscreen={toggleFullscreen}
                  fullscreen={fullscreen}
                />
              </div>
            )}
          </div>

          {/* player toolbar */}
          {!blocked && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="label text-subtle">Overlay</span>
                <Segmented<OverlayLevel>
                  label="Overlay level"
                  size="sm"
                  value={overlay}
                  onChange={setOverlay}
                  options={(['off', 'basic', 'pro'] as OverlayLevel[]).map((o) => ({
                    value: o,
                    label: o === 'off' ? 'Off' : o === 'basic' ? 'Basic' : 'Pro',
                    disabled: !overlayAllowed(state.platform, o),
                    title: !overlayAllowed(state.platform, o) ? `Not available on ${caps.label}` : undefined,
                  }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="label text-subtle">Multiview</span>
                <Segmented<'1' | '2' | '4'>
                  label="Multiview layout"
                  size="sm"
                  value={String(views) as '1' | '2' | '4'}
                  onChange={(v) => setViews(Number(v) as 1 | 2 | 4)}
                  options={(['1', '2', '4'] as const).map((v) => ({
                    value: v,
                    label: <Icon name={v === '1' ? 'grid1' : v === '2' ? 'grid2' : 'grid4'} size={15} />,
                    disabled: Number(v) > multiAvailable,
                    title: Number(v) > caps.multiview ? `Multiview ${v} isn't supported on ${caps.label}` : Number(v) > day.tables.length ? 'Not enough tables in this broadcast' : `${v} table${v === '1' ? '' : 's'}`,
                  }))}
                />
              </div>
              <span className="text-xs text-muted">
                Audio: <b className="text-text">{AUDIO_LABEL[audio]}</b>
                {views > 1 && <> · from {day.tables.find((t) => t.id === audioTable)?.name}</>}
              </span>
              <div className="ml-auto flex gap-1 sm:hidden">
                <Button size="sm" variant="secondary" onClick={prevHand} aria-label="Previous hand">
                  <Icon name="prev" size={14} />
                </Button>
                <Button size="sm" variant="secondary" onClick={nextHand} aria-label="Next hand">
                  <Icon name="next" size={14} />
                </Button>
              </div>
              <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setSheet(true)}>
                Chip counts & tables
              </Button>
            </div>
          )}

          {/* hands in this broadcast */}
          {!blocked && markers.length > 0 && (
            <section className="mt-6" aria-label="Hands in this broadcast">
              <h2 className="mb-2 text-base font-bold">Hands in this broadcast</h2>
              <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
                {markers.map((h) => (
                  <li key={h.id} className={cx('flex items-center transition-colors duration-150 hover:bg-surface-2', Math.abs(position - h.t) < 30 && 'bg-gold-dim')}>
                    <button onClick={() => seek(h.t)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
                      <HandGlyph type={h.type} />
                      <span className="w-14 text-xs text-muted tnum">{duration(h.t)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{h.title}</span>
                        <span className="text-xs text-muted">
                          {HAND_META[h.type].label} · {h.playerIds.map((id) => playerById(id).name).join(' vs ')} · Pot <span className="tnum">{chips(h.pot)}</span>
                        </span>
                      </span>
                    </button>
                    <span className="hidden pr-4 text-xs sm:block">
                      <Spoiler k={`hand-${h.id}`} inline>
                        <span>{h.result}</span>
                      </Spoiler>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="hidden lg:block">{!blocked && <div className="sticky top-20 h-[calc(100dvh-7rem)] max-h-[44rem]">{panel}</div>}</aside>
      </div>

      {/* mobile/tablet bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="Broadcast panel" className="h-[70dvh] w-full rounded-t-panel bg-surface pt-2">
            <div className="flex items-center justify-between px-4 pb-1">
              <span className="mx-auto h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            </div>
            <div className="flex justify-end px-3">
              <button className="rounded-chip p-1.5 text-muted" aria-label="Close panel" onClick={() => setSheet(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)] px-2 pb-2">{panel}</div>
          </div>
        </div>
      )}
    </Page>
  );
}

function Upcoming({ dayId, start }: { dayId: string; start: string }) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const now = useTick(1000);
  const on = state.reminders.includes(dayId);
  return (
    <div className="stage flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
      <StatusBadge status="upcoming" />
      <p className="text-sm text-muted">Starts {fmtDateTime(start, state.tz)}</p>
      <p className="text-4xl font-black tnum sm:text-5xl">{countdown(Date.parse(start) - now)}</p>
      <Button
        variant={on ? 'secondary' : 'primary'}
        onClick={() => {
          if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder before the broadcast starts.' });
          set((s) => ({ reminders: on ? s.reminders.filter((r) => r !== dayId) : [...s.reminders, dayId] }));
          toast(on ? 'Reminder removed' : 'We’ll remind you 15 minutes before');
        }}
      >
        <Icon name="bell" size={16} /> {on ? 'Reminder set' : 'Remind me'}
      </Button>
    </div>
  );
}
