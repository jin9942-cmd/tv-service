import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { VideoSource } from '../data/types';
import { demoStore, progressStore, saveProgress, clearProgress, useStore } from '../state/stores';
import { formatClock } from '../lib/time';

export interface ProgressMeta {
  key: string;
  title: string;
  subtitle: string;
  url: string;
  image?: string;
}

interface Props {
  source: VideoSource | null;
  mode: 'live' | 'vod' | 'clip';
  /** Live simulation: playback position is derived from this start time so all viewers "join" mid-stream. */
  liveStartAt?: string;
  clip?: { start: number; duration: number };
  progress?: ProgressMeta;
  /** When set, the video is not loaded at all and this overlay is shown instead (locked, delayed, ended…). */
  blocked?: ReactNode;
  autoPlay?: boolean;
  /** Rendered over the frame when a clip finishes. */
  endSlot?: ReactNode;
  label: string;
  /** Still frame shown before playback and behind blocked states. */
  poster?: string;
}

interface PlayerState {
  playing: boolean;
  muted: boolean;
  volume: number;
  time: number;
  duration: number;
  buffering: boolean;
  error: string | null;
  needsTap: boolean;
  ended: boolean;
  resumedFrom: number | null;
}

const INITIAL: PlayerState = {
  playing: false,
  muted: false,
  volume: 1,
  time: 0,
  duration: 0,
  buffering: true,
  error: null,
  needsTap: false,
  ended: false,
  resumedFrom: null,
};

export function VideoPlayer(props: Props) {
  const { source, mode, clip, blocked } = props;
  const demo = useStore(demoStore);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [st, setSt] = useState<PlayerState>(INITIAL);
  const [attempt, setAttempt] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const lastSaved = useRef(0);
  const progressRef = useRef(props.progress);
  useEffect(() => {
    progressRef.current = props.progress;
  });

  const offset = mode === 'clip' && clip ? clip.start : 0;
  const url = demo.forceVideoError ? '/__forced-failure__/missing-sample.webm' : source?.url;
  const update = (patch: Partial<PlayerState>) => setSt((s) => ({ ...s, ...patch }));

  const persist = useCallback(
    (force = false) => {
      const v = videoRef.current;
      const meta = progressRef.current;
      if (!v || !meta || mode === 'live' || !Number.isFinite(v.duration)) return;
      const now = Date.now();
      if (!force && now - lastSaved.current < 4000) return;
      lastSaved.current = now;
      const pos = v.currentTime - offset;
      const dur = mode === 'clip' && clip ? clip.duration : v.duration;
      if (pos < 3) return;
      if (pos > dur - 5) clearProgress(meta.key);
      else saveProgress({ ...meta, position: pos, duration: dur });
    },
    [mode, offset, clip],
  );

  // Save on unmount (navigating away mid-replay).
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });
  useEffect(() => {
    const onHide = () => persistRef.current(true); // refresh / tab close
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      persistRef.current(true);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(
      () => update({ needsTap: false }),
      (err: DOMException) => {
        if (err?.name === 'NotAllowedError') update({ needsTap: true, buffering: false });
      },
    );
  }, []);

  const onLoadedMetadata = () => {
    const v = videoRef.current!;
    let resumedFrom: number | null = null;
    if (mode === 'live' && props.liveStartAt && Number.isFinite(v.duration)) {
      const elapsed = (Date.now() - new Date(props.liveStartAt).getTime()) / 1000;
      v.currentTime = Math.max(0, elapsed % v.duration);
    } else {
      const saved = props.progress ? progressStore.get()[props.progress.key] : undefined;
      const dur = mode === 'clip' && clip ? clip.duration : v.duration;
      if (saved && saved.position > 3 && saved.position < dur - 5) {
        resumedFrom = saved.position;
        v.currentTime = offset + saved.position;
      } else if (offset) {
        v.currentTime = offset;
      }
    }
    update({ duration: mode === 'clip' && clip ? clip.duration : v.duration, resumedFrom });
    if (props.autoPlay !== false) tryPlay();
    else update({ needsTap: true, buffering: false });
  };

  const onTimeUpdate = () => {
    const v = videoRef.current!;
    const t = v.currentTime - offset;
    if (mode === 'clip' && clip && t >= clip.duration) {
      v.pause();
      clearProgress(props.progress?.key ?? '');
      update({ ended: true, playing: false, time: clip.duration });
      return;
    }
    update({ time: Math.max(0, t) });
    persist();
  };

  const onError = () => {
    const v = videoRef.current;
    const code = v?.error?.code;
    const reason =
      code === 2
        ? 'A network error interrupted the download.'
        : code === 3
          ? 'The video could not be decoded.'
          : // code 4, or a <source> failure (video.error stays null)
            'The sample file is missing or this browser cannot play its format (WebM/VP9).';
    update({ error: reason, buffering: false, playing: false });
  };

  const retry = () => {
    setSt(INITIAL);
    setAttempt((a) => a + 1);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (st.ended && clip) {
      v.currentTime = clip.start;
      update({ ended: false });
      tryPlay();
      return;
    }
    if (v.paused) tryPlay();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.5;
  };

  const setVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
  };

  const seek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = offset + val;
    update({ time: val, ended: false });
  };

  const toggleFullscreen = () => {
    const frame = frameRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (frame?.requestFullscreen) {
      frame.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    } else {
      v?.webkitEnterFullscreen?.(); // iOS Safari
    }
  };

  const startOver = () => {
    seek(0);
    update({ resumedFrom: null });
    if (props.progress) clearProgress(props.progress.key);
  };

  if (blocked || !source) {
    return (
      <div className="player" ref={frameRef}>
        <div className="player-stage">
          {props.poster && <img className="player-poster" src={props.poster} alt="" />}
          <div className="player-overlay player-overlay-solid">{blocked ?? <p>No video available.</p>}</div>
        </div>
      </div>
    );
  }

  const canSeek = mode !== 'live';
  const showSpinner = st.buffering && !st.error && !st.needsTap && !st.ended;

  return (
    <div className={`player ${fullscreen ? 'is-fullscreen' : ''}`} ref={frameRef}>
      <div className="player-stage">
        <video
          key={`${url}-${attempt}`}
          ref={videoRef}
          className="player-video"
          playsInline
          poster={props.poster}
          preload="metadata"
          loop={mode === 'live'}
          aria-label={props.label}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={() => update({ playing: true, ended: false })}
          onPlaying={() => update({ playing: true, buffering: false, needsTap: false })}
          onPause={() => {
            update({ playing: false });
            persist(true);
          }}
          onWaiting={() => update({ buffering: true })}
          onCanPlay={() => update({ buffering: false })}
          onVolumeChange={(e) => update({ muted: e.currentTarget.muted, volume: e.currentTarget.volume })}
          onEnded={() => {
            if (props.progress) clearProgress(props.progress.key);
            update({ ended: true, playing: false });
          }}
          onError={onError}
          onClick={togglePlay}
        >
          {url && <source src={url} type={source.type} onError={onError} />}
        </video>

        {mode === 'live' && !st.error && (
          <span className="live-badge" title="Simulated with a looping sample video">
            <span className="live-dot" /> LIVE · SIMULATED
          </span>
        )}

        {showSpinner && (
          <div className="player-overlay player-overlay-clear" aria-live="polite">
            <span className="spinner" aria-label="Loading video" />
          </div>
        )}

        {st.needsTap && !st.error && (
          <div className="player-overlay">
            <button className="big-play" onClick={togglePlay} aria-label="Play video">
              <PlayIcon />
            </button>
            <p className="overlay-hint">Autoplay was blocked by your browser. Tap to play.</p>
          </div>
        )}

        {st.error && (
          <div className="player-overlay player-overlay-solid" role="alert">
            <p className="overlay-title">Couldn’t play this sample video</p>
            <p className="overlay-text">{st.error}</p>
            {demo.forceVideoError && <p className="overlay-text">“Force video failure” is on in Demo tools.</p>}
            <button className="btn btn-primary" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {st.ended && !st.error && (
          <div className="player-overlay">
            {props.endSlot ?? <p className="overlay-title">Finished</p>}
            <button className="btn btn-secondary" onClick={togglePlay}>
              ↻ Replay
            </button>
          </div>
        )}

        {st.resumedFrom !== null && !st.error && (
          <div className="resume-toast" role="status">
            Resumed at {formatClock(st.resumedFrom)}
            <button className="link-btn" onClick={startOver}>
              Start over
            </button>
            <button className="link-btn" aria-label="Dismiss" onClick={() => update({ resumedFrom: null })}>
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="player-controls">
        <button className="ctrl" onClick={togglePlay} aria-label={st.playing ? 'Pause' : 'Play'} disabled={!!st.error}>
          {st.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="ctrl" onClick={toggleMute} aria-label={st.muted ? 'Unmute' : 'Mute'} disabled={!!st.error}>
          {st.muted || st.volume === 0 ? <MuteIcon /> : <VolumeIcon />}
        </button>
        <input
          className="volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={st.muted ? 0 : st.volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          disabled={!!st.error}
        />
        {canSeek ? (
          <>
            <input
              className="seek"
              type="range"
              min={0}
              max={st.duration || 0}
              step={0.1}
              value={Math.min(st.time, st.duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              disabled={!st.duration || !!st.error}
            />
            <span className="time">
              {formatClock(st.time)} / {formatClock(st.duration)}
            </span>
          </>
        ) : (
          <span className="seek-live">Live simulation · no rewind (DVR not offered)</span>
        )}
        <button className="ctrl" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
          {fullscreen ? <ExitFsIcon /> : <FsIcon />}
        </button>
      </div>
    </div>
  );
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
  </svg>
);
const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
  </svg>
);
const MuteIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" />
  </svg>
);
const FsIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M5 5h5v2H7v3H5zm9 0h5v5h-2V7h-3zM5 14h2v3h3v2H5zm12 0h2v5h-5v-2h3z" />
  </svg>
);
const ExitFsIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M8 5h2v5H5V8h3zm6 0h2v3h3v2h-5zM5 14h5v5H8v-3H5zm9 0h5v2h-3v3h-2z" />
  </svg>
);
