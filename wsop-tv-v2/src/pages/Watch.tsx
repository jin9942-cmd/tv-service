import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { frameFrom, tableFrame, tableVideo } from '../lib/media';
import { money } from '../lib/format';
import { Link, useNavigate } from 'react-router-dom';
import type { AudioTrack, Hand, OverlayLevel, TableFeed } from '../data/types';
import { HERO_DAY_ID, HERO_EXPECTED_START, dayById, hands, playerById, seriesById } from '../data/mock';
import { PLATFORMS, overlayAllowed } from '../data/platforms';
import { chips, duration } from '../lib/format';
import { VENUE_TZ, countdown, fmtDateTime, fmtTime } from '../lib/time';
import { isOnAir, shortTableName, tableDelay, tableStatus } from '../lib/broadcast';
import { canWatch, gateForAccess, useApp, useTick, type Gate } from '../state/app';
import { useLiveStacks } from '../state/stacks';
import { AccessBadge, BraceletIcon, Button, Icon, Page, Segmented, Skeleton, Spoiler, StatusBadge, cx } from '../components/ui';
import { Stage } from '../features/player/Stage';
import { AUDIO_LABEL, Controls } from '../features/player/Controls';
import { SidePanel } from '../features/player/SidePanel';
import { HAND_META, HandGlyph } from '../features/player/markers';
import { PlaybackGate, RegionBlocked } from '../features/auth/Gates';

const CAPTIONS: Record<AudioTrack, string[]> = {
  en: ['Han has been patient all level — this is the spot she was waiting for.', 'Whitfield takes his time. Seven-time champion, never rushed.', 'The crowd in Las Vegas is completely silent.'],
  es: ['Han ha sido paciente todo el nivel.', 'Whitfield se toma su tiempo.', 'Silencio absoluto en Las Vegas.'],
  natural: ['[Crowd murmurs]', '[Dealer: "Action is on you, sir."]', '[Applause from the rail]'],
};

/**
 * The full player screen. `variant="live"` is the Live page (v1 layout): no title on top, event info + overview under
 * the player, the table selection controlled by the page, and extra content (the Streams list) at the top of the aside.
 */
export function WatchInner({
  dayId,
  startAt,
  clipId,
  variant = 'default',
  tableId,
  onTable,
  asideTop,
}: {
  dayId: string;
  startAt: string | null;
  clipId: string | null;
  variant?: 'default' | 'live';
  tableId?: string | null;
  onTable?: (id: string) => void;
  asideTop?: ReactNode;
}) {
  const { state, set, toast } = useApp();
  const { event, day } = dayById(dayId)!;
  const se = seriesById(event.seriesId);
  const caps = PLATFORMS[state.platform];
  const now = useTick(1000);
  const stacks = useLiveStacks();

  const status = dayId === HERO_DAY_ID ? state.streamMode : day.status;
  const isLive = isOnAir(status);
  const fullLen = day.durationMin * 60;
  // The Live page controls which table is on screen; the standalone player keeps it locally.
  const [localTable, setLocalTable] = useState(tableId ?? day.tables[0].id);
  const mainTable = tableId ?? localTable;
  const setMainTable = (id: string) => (onTable ? onTable(id) : setLocalTable(id));
  const main = day.tables.find((t) => t.id === mainTable) ?? day.tables[0];
  // Each table can run its own delay (feature 30 min, outer tables 15 min): the live edge follows the table on screen.
  const delayMin = tableDelay(main, status);
  const delaySec = delayMin * 60;
  const elapsed = (now - Date.parse(day.start)) / 1000;
  /** VOD: full length · live: the (possibly delayed) live edge. */
  const end = status === 'vod' ? fullLen : Math.max(120, Math.min(fullLen, elapsed - delaySec));

  // Content access: the day's level, or a single free/sign-in hand opened as a highlight clip.
  const dayAccess = day.access ?? 'subscriber';
  const dayGate = gateForAccess(dayAccess, state.scenario);
  const clipHand = clipId ? hands.find((h) => h.id === clipId && h.dayId === dayId) : undefined;
  const clipMode = dayGate !== 'ok' && !!clipHand && canWatch(clipHand.access, state.scenario) && (isLive || status === 'vod');

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
  const [audioTable, setAudioTable] = useState(mainTable);
  useEffect(() => setAudioTable(mainTable), [mainTable]);
  const [clipEnded, setClipEnded] = useState(false);
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

  // Hand markers. Live: scale into what has aired so far so the timeline is always populated.
  const markers: Hand[] = useMemo(
    () =>
      hands
        .filter((h) => h.dayId === dayId)
        .map((h) => (isLive ? { ...h, t: Math.round((h.t / fullLen) * end * 0.96) } : h))
        .sort((a, b) => a.t - b.t),
    [dayId, isLive, fullLen, end],
  );
  const clipMarker = clipHand ? markers.find((m) => m.id === clipHand.id) : undefined;
  const clipStart = clipMarker?.t ?? 0;
  const clipEnd = clipHand ? Math.min(end, clipStart + clipHand.durationSec) : end;

  // Clock: live follows the edge; VOD advances while playing; a highlight clip stops at its end.
  useEffect(() => {
    if (!playing) return;
    if (clipMode) {
      // Out of range (initial ?t= from the card, or after a mode switch) → snap to the hand.
      if (position < clipStart || position > clipEnd) return setPosition(clipStart);
      if (position + 1 >= clipEnd) {
        setPosition(clipEnd);
        setPlaying(false);
        setClipEnded(true);
      } else setPosition(position + 1);
      return;
    }
    if (isLive && follow) setPosition(end);
    else setPosition((p) => Math.min(end, p + 1));
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight clip: start at the hand, never follow the live edge.
  useEffect(() => {
    if (!clipMode) return;
    setFollow(false);
    setPosition(clipStart);
    setClipEnded(false);
    setPlaying(true);
  }, [clipMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mode switch from the demo panel (LIVE / DELAYED / VOD) → reposition sensibly.
  useEffect(() => {
    if (clipMode) return;
    setFollow(isLive);
    setPosition((p) => (isLive ? end : Math.min(p, fullLen)));
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember VOD progress for Continue Watching (on leave).
  const posRef = useRef(position);
  posRef.current = position;
  useEffect(() => () => set((s) => (status === 'vod' ? { progress: { ...s.progress, [dayId]: posRef.current } } : {})), []); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = useCallback(
    (t: number) => {
      const lo = clipMode ? clipStart : 0;
      const hi = clipMode ? clipEnd : end;
      const c = Math.max(lo, Math.min(hi, t));
      setPosition(c);
      setFollow(!clipMode && isLive && end - c < 5);
      if (clipMode && c < clipEnd) setClipEnded(false);
    },
    [end, isLive, clipMode, clipStart, clipEnd],
  );

  const clipNudge = () => toast(dayGate === 'login' ? 'Sign in to watch the full broadcast' : 'The full broadcast is included with a subscription');
  const prevHand = () => {
    if (clipMode) return clipNudge();
    const h = [...markers].reverse().find((m) => m.t < position - 3);
    if (h) seek(h.t);
    else toast('This is the first hand of the broadcast');
  };
  const nextHand = () => {
    if (clipMode) return clipNudge();
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

  // Access checks happen at play time (soft paywall). Free highlight clips skip the account gate.
  const blocked = state.regionBlocked
    ? 'region'
    : status === 'upcoming' || status === 'late' || status === 'interrupted'
      ? status
      : clipMode || dayGate === 'ok'
        ? null
        : dayGate;

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

  const shownViews = clipMode ? 1 : views;
  const tiles = (() => {
    const ordered = [main, ...day.tables.filter((t) => t.id !== main.id)];
    return ordered.slice(0, shownViews);
  })();
  const firstOnAir = day.tables.find((t) => !t.state) ?? day.tables[0];
  const delays = [...new Set(day.tables.map((t) => tableDelay(t, status)))];
  const multiAvailable = Math.min(caps.multiview, day.tables.length);

  const panel = <SidePanel stacks={stacks} phase={phase} tables={day.tables} dayStatus={status} mainTable={mainTable} onSelectTable={(id) => (setMainTable(id), setAudioTable(id))} spoilerKey={dayId} />;

  return (
    <Page className="max-w-[96rem] py-4 sm:py-6">
      {/* title (the Live page shows it under the player instead) */}
      {variant !== 'live' && (
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
          <StatusBadge status={status} delayMin={tableDelay(day.tables[0], status) || 30} />
          <AccessBadge access={clipMode && clipHand ? clipHand.access : dayAccess} locked={!clipMode && dayGate !== 'ok'} size="md" />
          <Link to={`/events/${event.id}`} className="text-sm font-semibold text-muted hover:text-text">
            Event details →
          </Link>
        </div>
      </div>
      )}

      {clipMode && clipHand && !blocked && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-ok/40 bg-surface px-4 py-3">
          <AccessBadge access={clipHand.access} size="md" />
          <p className="min-w-0 flex-1 text-sm">
            <b>Highlight · {clipHand.title}</b>{' '}
            <span className="text-muted">
              ({duration(clipHand.durationSec)}) — the full broadcast is {dayAccess === 'signin' ? 'free with a GGPASS account' : 'included with a subscription'}.
            </span>
          </p>
          <ClipCta gate={dayGate} returnTo={`/watch/${dayId}`} />
        </div>
      )}

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
              ) : blocked === 'late' || blocked === 'interrupted' ? (
                <BroadcastHold kind={blocked} start={day.start} eventId={event.id} />
              ) : blocked ? (
                <PlaybackGate gate={blocked} returnTo={`/watch/${dayId}`} />
              ) : (
                <>
                  <div className={cx('grid size-full gap-0.5 bg-black', shownViews === 2 && 'grid-cols-2', shownViews === 4 && 'grid-cols-2 grid-rows-2')}>
                    {tiles.map((t, i) => {
                      const Tile = views > 1 ? 'button' : 'div';
                      const tStatus = tableStatus(t, status);
                      return (
                      <Tile
                        key={t.id}
                        onClick={views > 1 ? () => setAudioTable(t.id) : undefined}
                        className={cx('relative min-h-0 text-left', views > 1 && 'cursor-pointer', views > 1 && audioTable === t.id && 'outline-2 -outline-offset-2 outline-gold')}
                        aria-label={views > 1 ? `${t.name}${audioTable === t.id ? ', audio on' : ', select to hear this table'}` : undefined}
                      >
                        {tStatus === 'late' || tStatus === 'interrupted' ? (
                          <TableHold table={t} kind={tStatus} compact={shownViews > 1} onSwitch={shownViews > 1 ? undefined : () => (setMainTable(firstOnAir.id), setAudioTable(firstOnAir.id))} switchLabel={firstOnAir.name} />
                        ) : t.failing && views > 1 ? (
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
                            media={(() => {
                              // Real footage (v1): one moving video in single view, stills in multiview tiles.
                              const ti = day.tables.indexOf(t);
                              const v = tableVideo(ti);
                              return { poster: tableFrame(ti, event.number % 3), video: shownViews === 1 ? v.url : undefined, start: v.start };
                            })()}
                          />
                        )}
                        {shownViews > 1 && (
                          <span className="label absolute top-1.5 left-1.5 flex items-center gap-1 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[9px]">
                            {t.name}
                            {tStatus === 'delayed' && <span className="text-delayed">· {tableDelay(t, status)}m delay</span>}
                            {tStatus === 'late' && <span className="text-delayed">· Late start</span>}
                            {tStatus === 'interrupted' && <span className="text-live">· Interrupted</span>}
                            {audioTable === t.id && <Icon name="volume" size={11} className="text-gold" />}
                          </span>
                        )}
                      </Tile>
                      );
                    })}
                  </div>
                  {clipMode && clipEnded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                      <p className="label text-ok">Highlight ended</p>
                      <p className="text-lg font-bold sm:text-xl">Keep watching the full broadcast</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <ClipCta gate={dayGate} returnTo={`/watch/${dayId}`} size="md" />
                        <Button variant="secondary" onClick={() => (seek(clipStart), setPlaying(true))}>
                          Replay highlight
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute top-3 left-3 hidden items-center gap-2 sm:flex">
                    {/* multiview tiles carry their own labels */}
                    {shownViews === 1 && <StatusBadge status={clipMode ? 'vod' : tableStatus(main, status)} delayMin={delayMin || 30} />}
                    {quality !== 'Auto' && <span className="label rounded-[3px] bg-black/60 px-1.5 py-0.5 text-[10px]">{quality}</span>}
                  </div>
                  {!playing && !(clipMode && clipEnded) && (
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
                {/* A highlight clip gets its own short timeline (0 → clip length) instead of the live edge. */}
                <Controls
                  status={clipMode ? 'vod' : status}
                  playing={playing}
                  onTogglePlay={() => (clipMode && clipEnded ? (seek(clipStart), setPlaying(true)) : (setPlaying((p) => !p), setFollow(false)))}
                  position={clipMode ? position - clipStart : position}
                  end={clipMode ? Math.max(1, clipEnd - clipStart) : end}
                  onSeek={clipMode ? (t) => seek(clipStart + t) : seek}
                  markers={clipMode ? (clipMarker ? [{ ...clipMarker, t: 0 }] : []) : markers}
                  onPrevHand={prevHand}
                  onNextHand={nextHand}
                  onJumpLive={() => (clipMode ? clipNudge() : (seek(end), setPlaying(true)))}
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
              {!clipMode && (
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
              )}
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
              {!clipMode && (
                <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setSheet(true)}>
                  Chip counts & tables
                </Button>
              )}
            </div>
          )}

          {/* Live page (v1 layout): stream + event info under the player */}
          {variant === 'live' && (
            <div className="mt-4">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusBadge status={tableStatus(main, status)} size="sm" delayMin={delayMin || 30} />
                <span>
                  {se.name} · Event #{event.number} · {day.label} · {main.name}
                </span>
                <AccessBadge access={dayAccess} locked={dayGate !== 'ok'} />
              </p>
              <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-[28px]">{event.name}</h1>
            </div>
          )}

          {/* delay note: what the stream is showing vs the tournament floor */}
          {!blocked && !clipMode && status === 'delayed' && (
            <p className="mt-2 text-xs text-subtle">
              <b className="text-muted">{main.name}</b> runs {delayMin} min behind the tournament floor — showing play from about {fmtTime(now - delaySec * 1000, state.tz)} your time ({fmtTime(now - delaySec * 1000, VENUE_TZ)} Las Vegas). Chip counts and hands follow the stream.
              {delays.length > 1 && <> Delay by table: {day.tables.map((t) => `${shortTableName(t.name)} ${tableDelay(t, status)} min`).join(' · ')}.</>}
            </p>
          )}

          {variant === 'live' && <Overview eventId={event.id} dayId={dayId} delayMin={delayMin} status={status} />}

          {/* hands in this broadcast */}
          {!blocked && !clipMode && markers.length > 0 && (
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

        {variant === 'live' ? (
          <aside className="min-w-0 space-y-6">
            {asideTop}
            {!blocked && !clipMode && <div className="hidden h-[32rem] lg:block">{panel}</div>}
            <EventHandReplays eventId={event.id} />
          </aside>
        ) : (
          <aside className="hidden lg:block">{!blocked && !clipMode && <div className="sticky top-20 h-[calc(100dvh-7rem)] max-h-[44rem]">{panel}</div>}</aside>
        )}
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

/** Call to action from a free highlight to the full broadcast, by what the viewer still needs. */
function ClipCta({ gate, returnTo, size = 'sm' }: { gate: Gate; returnTo: string; size?: 'sm' | 'md' }) {
  const { requireLogin, set, toast } = useApp();
  const nav = useNavigate();
  if (gate === 'login')
    return (
      <Button variant="primary" size={size} onClick={() => requireLogin({ reason: 'Sign in to keep watching the full broadcast.', returnTo })}>
        Continue with GGPASS
      </Button>
    );
  if (gate === 'plans')
    return (
      <Button variant="primary" size={size} onClick={() => nav('/plans', { state: { returnTo } })}>
        See plans
      </Button>
    );
  if (gate === 'link')
    return (
      <Button variant="primary" size={size} onClick={() => (set({ scenario: 'active' }), toast('GGPASS linked (demo)'))}>
        Link GGPASS account
      </Button>
    );
  if (gate === 'devices')
    return (
      <Button variant="outline" size={size} onClick={() => nav('/devices', { state: { returnTo } })}>
        Manage devices
      </Button>
    );
  return null;
}

/** Whole broadcast starting late or interrupted (demo override on the hero broadcast). */
function BroadcastHold({ kind, start, eventId }: { kind: 'late' | 'interrupted'; start: string; eventId: string }) {
  const { state, toast } = useApp();
  const now = useTick(1000);
  return (
    <div className="stage flex size-full flex-col items-center justify-center gap-3 p-6 text-center" role="status">
      <StatusBadge status={kind} />
      {kind === 'late' ? (
        <>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Coverage is starting late</h2>
          <p className="max-w-md text-sm text-muted">
            Scheduled for {fmtTime(start, state.tz)} · now expected around <b className="text-text">{fmtTime(HERO_EXPECTED_START, state.tz)}</b> your time. The player starts automatically when the feed is up.
          </p>
          <p className="text-3xl font-black tnum sm:text-4xl">{countdown(Date.parse(HERO_EXPECTED_START) - now)}</p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">The broadcast is temporarily off air</h2>
          <p className="max-w-md text-sm text-muted">The feed from the venue has paused. Playback resumes here automatically — no need to refresh.</p>
        </>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={() => toast(kind === 'late' ? 'We’ll notify you when coverage starts' : 'We’ll notify you when the broadcast is back')}>
          <Icon name="bell" size={16} /> Notify me
        </Button>
        <Link to={`/events/${eventId}`}>
          <Button variant="outline" tabIndex={-1}>
            Catch up on key hands
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** One table on hold while the rest of the broadcast is on air (late start / interrupted). */
function TableHold({ table, kind, compact, onSwitch, switchLabel }: { table: TableFeed; kind: 'late' | 'interrupted'; compact?: boolean; onSwitch?: () => void; switchLabel: string }) {
  const { state } = useApp();
  return (
    <div className="stage flex size-full flex-col items-center justify-center gap-2 p-4 text-center" role="status">
      <StatusBadge status={kind} size={compact ? 'sm' : 'md'} />
      <p className={cx('font-semibold', compact ? 'text-[11px]' : 'text-base')}>
        {kind === 'late' ? `${table.name} hasn't started yet` : `${table.name} is temporarily off air`}
      </p>
      {!compact && (
        <p className="max-w-sm text-sm text-muted">
          {kind === 'late' && table.expected ? `Expected around ${fmtTime(table.expected, state.tz)} your time. ` : ''}
          {kind === 'interrupted' ? 'The production team is on it — other tables are unaffected.' : 'Other tables are on air now.'}
        </p>
      )}
      {onSwitch && (
        <Button size="sm" variant="secondary" onClick={onSwitch}>
          Watch {switchLabel}
        </Button>
      )}
    </div>
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

/** v1 "Overview": tournament figures for the event on the Live page. */
function Overview({ eventId, dayId, delayMin, status }: { eventId: string; dayId: string; delayMin: number; status: string }) {
  const { state } = useApp();
  const { event, day } = dayById(dayId)!;
  const se = seriesById(event.seriesId);
  const started = event.entrants > 0;
  const cells: [string, ReactNode][] = [
    ['Buy-in', event.buyIn ? money(event.buyIn) : 'Invitational'],
    ['Entries', started ? event.entrants.toLocaleString('en-US') : '—'],
    ['Prize pool', started ? money(event.prizePool) : 'TBD'],
    ['Players left', started ? event.remaining.toLocaleString('en-US') : '—'],
    ['Level', started ? `Level ${event.level}` : '—'],
    [
      'Started',
      <>
        {fmtDateTime(day.start, VENUE_TZ)} PT
        <span className="block text-muted">{fmtTime(day.start, state.tz)} your time</span>
      </>,
    ],
    ['Broadcast delay', status === 'delayed' ? `${delayMin}-minute delay` : status === 'live' ? 'Real time' : '—'],
    ['Venue', `${se.venue}, ${se.city}`],
  ];
  return (
    <section className="mt-5" aria-label="Overview" data-event={eventId}>
      <h2 className="mb-2 text-base font-bold">Overview</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map(([k, v]) => (
          <div key={k} className="rounded-card border border-line bg-surface px-3 py-2.5">
            <dt className="label text-[10px] text-subtle">{k}</dt>
            <dd className="mt-1 text-sm font-bold tnum">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 flex items-center gap-2 text-[11px] text-subtle">
        <span className="label rounded-[3px] border border-line-strong px-1 text-[9px]">Sample</span> Tournament figures are sample data, not an EBS / live-reporting feed.
      </p>
    </section>
  );
}

/** v1 "Hand replays from this event" for the Live page aside. */
function EventHandReplays({ eventId }: { eventId: string }) {
  const { state } = useApp();
  const list = hands.filter((h) => h.eventId === eventId).slice(0, 5);
  if (!list.length) return null;
  return (
    <section aria-label="Hand replays from this event">
      <p className="label mb-3 text-text/80">Hand replays from this event</p>
      <ul className="space-y-2">
        {list.map((h, i) => (
          <li key={h.id}>
            <Link to={`/watch/${h.dayId}?t=${h.t}&clip=${h.id}`} className="flex gap-3 rounded-card border border-line bg-surface p-2 transition-colors duration-150 hover:border-line-strong">
              <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-[6px]">
                <img src={frameFrom(i * 2 + h.title.length)} alt="" loading="lazy" className="size-full object-cover" />
                <span className="absolute right-1 bottom-1 rounded-[3px] bg-black/75 px-1 text-[10px] font-semibold tnum">{duration(h.durationSec)}</span>
              </span>
              <span className="min-w-0 py-0.5">
                <AccessBadge access={h.access} locked={!canWatch(h.access, state.scenario)} />
                <span className="mt-1 line-clamp-2 block text-sm leading-snug font-bold">{h.title}</span>
                <span className="block truncate text-xs text-muted">
                  {HAND_META[h.type].label} · Pot {chips(h.pot)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
