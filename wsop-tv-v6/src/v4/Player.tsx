// v4 — the one player for everything (broadcasts, classics, hand clips, live events and 24/7 channels).
// Plain OTT controls: play/pause, 10 s back/forward, seek bar, sound, settings (playback speed on demand, quality),
// full screen; live adds a 4-hour DVR and a LIVE button. English commentary only, so no subtitles or audio tracks.
// `mini` renders the docked mini player's compact controls.
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/app';
import { Icon, cx } from '../components/ui';
import { duration } from '../lib/format';
import type { Video } from './catalog';

const DVR_WINDOW = 4 * 3600;

const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p'];
/** Playback speed, 0.5× to 2× in 0.5 steps (on demand only; live plays at 1×). */
const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
const speedLabel = (x: number) => (x === 1 ? 'Normal' : `${x}×`);

export function Player({ v, live, liveEdge, mini = false }: { v: Video; live: boolean; /** Seconds into the broadcast at the live edge. */ liveEdge?: () => number; mini?: boolean }) {
  const { state, set } = useApp();
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [quality, setQuality] = useState<string>('Auto');
  const [speed, setSpeed] = useState(1);
  const rate = live ? 1 : speed;
  const [menu, setMenu] = useState(false);
  const saves = v.kind === 'broadcast' || v.kind === 'classic';
  // VOD: position in seconds · live: how far behind the live edge.
  const [pos, setPos] = useState(() => (saves && !live ? Math.min(state.progress[v.id] ?? 0, v.durationSec - 5) : 0));
  const [behind, setBehind] = useState(0);
  const [edge, setEdge] = useState(() => liveEdge?.() ?? v.durationSec);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (live) {
        setEdge(liveEdge?.() ?? v.durationSec);
        if (!playing) setBehind((b) => Math.min(DVR_WINDOW, b + 1));
      } else if (playing) setPos((p) => Math.min(v.durationSec, p + rate));
    }, 1000);
    return () => window.clearInterval(t);
  }, [live, playing, liveEdge, v.durationSec, rate]);

  // Continue Watching: save the position every few seconds of play.
  const posRef = useRef(pos);
  posRef.current = pos;
  useEffect(() => {
    if (!saves || live) return;
    const t = window.setInterval(() => set((s) => ({ progress: { ...s.progress, [v.id]: posRef.current } })), 5000);
    return () => window.clearInterval(t);
  }, [saves, live, v.id, set]);

  useEffect(() => {
    const el = vid.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing]);
  useEffect(() => {
    if (vid.current) vid.current.playbackRate = rate;
  }, [rate]);

  const windowLen = Math.min(DVR_WINDOW, edge);
  const skip = (d: number) => {
    if (live) setBehind((b) => Math.max(0, Math.min(windowLen, b - d)));
    else setPos((p) => Math.max(0, Math.min(v.durationSec, p + d)));
  };
  const seekTo = (frac: number) => {
    if (live) setBehind(Math.round((1 - frac) * windowLen));
    else setPos(Math.round(frac * v.durationSec));
  };
  const frac = live ? (windowLen ? 1 - behind / windowLen : 1) : v.durationSec ? pos / v.durationSec : 0;
  const atLive = live && behind < 3;
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.())?.catch?.(() => {});
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') (e.preventDefault(), setPlaying((p) => !p));
    if (e.key === 'ArrowLeft') (e.preventDefault(), skip(-10));
    if (e.key === 'ArrowRight') (e.preventDefault(), skip(10));
    if (e.key === 'm') setMuted((m) => !m);
  };

  const btn = 'flex size-9 items-center justify-center rounded-full text-white hover:bg-white/15';
  return (
    <div ref={box} tabIndex={0} onKeyDown={onKey} className="group/player relative aspect-video w-full overflow-hidden bg-black outline-none" aria-label={`Player: ${v.title}`}>
      <video
        ref={vid}
        key={v.media.url}
        className="absolute inset-0 size-full object-cover"
        src={`${v.media.url}#t=${v.media.start}`}
        poster={v.thumb}
        autoPlay
        loop
        muted={muted}
        playsInline
        onClick={() => setPlaying((p) => !p)}
      />
      {!playing && (
        <button onClick={() => setPlaying(true)} aria-label="Play" className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex size-16 items-center justify-center rounded-full bg-black/70 text-white">
            <Icon name="play" size={30} />
          </span>
        </button>
      )}
      {muted && !mini && (
        <button onClick={() => setMuted(false)} className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black">
          <Icon name="mute" size={14} /> Tap to unmute
        </button>
      )}

      <div className={cx('absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pt-8 pb-2 transition-opacity duration-150', playing && 'opacity-0 group-hover/player:opacity-100 group-focus-within/player:opacity-100 [@media(hover:none)]:opacity-100')}>
        {!mini && (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(frac * 100)}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
            }}
            className="group/seek relative mb-1.5 h-4 cursor-pointer"
          >
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25 group-hover/seek:h-1.5" />
            <span className={cx('absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full group-hover/seek:h-1.5', live ? 'bg-live' : 'bg-gold')} style={{ width: `${frac * 100}%` }} />
            <span className={cx('absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full', live ? 'bg-live' : 'bg-gold')} style={{ left: `${frac * 100}%` }} />
          </div>
        )}
        <div className="flex items-center gap-1 text-white">
          <button className={btn} onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} size={20} />
          </button>
          {!mini && (
            <>
              <button className={btn} onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10 s">
                <Icon name="back10" size={20} />
              </button>
              <button className={btn} onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10 s" disabled={atLive}>
                <Icon name="fwd10" size={20} className={atLive ? 'opacity-40' : undefined} />
              </button>
            </>
          )}
          <button className={btn} onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
            <Icon name={muted ? 'mute' : 'volume'} size={20} />
          </button>
          {live ? (
            <button onClick={() => setBehind(0)} className="ml-1 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold hover:bg-white/15" aria-label={atLive ? 'Live' : 'Go to live'}>
              <i className={cx('size-2 rounded-full', atLive ? 'live-dot bg-live' : 'bg-white/50')} aria-hidden />
              LIVE
              {!atLive && !mini && <span className="font-medium text-white/70 tnum">−{duration(behind)}</span>}
            </button>
          ) : (
            !mini && (
              <span className="ml-1 text-xs text-white/85 tnum">
                {duration(pos)} / {duration(v.durationSec)}
              </span>
            )
          )}
          {!mini && (
            <>
              {rate !== 1 && <span className="ml-auto text-xs font-semibold text-white/85 tnum">{rate}×</span>}
              <button className={cx(btn, rate === 1 && 'ml-auto', menu && 'bg-white/15')} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={live ? 'Settings: quality' : 'Settings: speed and quality'} title="Settings">
                <Icon name="gear" size={20} />
              </button>
              <button className={btn} onClick={full} aria-label="Full screen">
                <Icon name="full" size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings: playback speed (on demand) and video quality. */}
      {menu && !mini && (
        <div role="dialog" aria-label="Player settings" className={cx('absolute right-3 bottom-16 z-10 grid gap-3 rounded-card bg-black/90 p-3 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur', live ? 'w-[min(12rem,calc(100%-1.5rem))] grid-cols-1' : 'w-[min(24rem,calc(100%-1.5rem))] grid-cols-2')}>
          {(
            [
              ...(live ? [] : [['Speed', SPEED_OPTIONS.map(speedLabel), speedLabel(speed), (x: string) => setSpeed(SPEED_OPTIONS.find((o) => speedLabel(o) === x)!)] as const]),
              ['Quality', QUALITY_OPTIONS, quality, setQuality] as const,
            ]
          ).map(([title, options, current, pick]) => (
            <fieldset key={title} className="min-w-0">
              <legend className="mb-1.5 text-[11px] font-semibold tracking-wide text-white/60 uppercase">{title}</legend>
              <ul className="space-y-0.5">
                {options.map((o) => (
                  <li key={o}>
                    <button onClick={() => pick(o)} aria-pressed={o === current} className={cx('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-white/10', o === current && 'font-semibold')}>
                      <Icon name="check" size={14} className={o === current ? 'text-gold-strong' : 'invisible'} />
                      <span className="truncate">{o}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}
