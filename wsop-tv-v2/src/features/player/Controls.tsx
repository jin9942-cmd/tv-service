import { useEffect, useRef, useState } from 'react';
import type { AudioTrack, Hand, StreamStatus } from '../../data/types';
import { playerById } from '../../data/mock';
import { chips, duration } from '../../lib/format';
import { Icon, Spoiler, cx } from '../../components/ui';
import { HAND_META, HandGlyph } from './markers';

export const AUDIO_LABEL: Record<AudioTrack, string> = { en: 'English Commentary', natural: 'Natural Sound', es: 'Spanish Commentary' };
const QUALITIES = ['Auto', '1080p', '720p', '480p'];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
export const SUBTITLES = ['Off', 'English', 'Español', '한국어', '日本語'];

export interface ControlsProps {
  status: StreamStatus;
  playing: boolean;
  onTogglePlay: () => void;
  position: number;
  /** VOD: full length · LIVE/DELAYED: the live edge. */
  end: number;
  onSeek: (t: number) => void;
  markers: Hand[];
  onPrevHand: () => void;
  onNextHand: () => void;
  onJumpLive: () => void;
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onMute: () => void;
  cc: boolean;
  onCc: () => void;
  audio: AudioTrack;
  onAudio: (a: AudioTrack) => void;
  audioTracksSupported: boolean;
  quality: string;
  onQuality: (q: string) => void;
  onFullscreen: () => void;
  fullscreen: boolean;
  /** Replays only: playback speed, resume point, scrub previews and subtitle languages. */
  speed?: number;
  onSpeed?: (s: number) => void;
  resumeAt?: number;
  previewAt?: (t: number) => string;
  subtitle?: string;
  onSubtitle?: (s: string) => void;
}

export function Controls(p: ControlsProps) {
  const [menu, setMenu] = useState<'audio' | 'quality' | 'speed' | 'subs' | null>(null);
  const isLive = p.status === 'live' || p.status === 'delayed';
  const isVod = p.status === 'vod' && !!p.onSpeed;
  const atEdge = isLive && p.end - p.position < 5;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / Math.max(1, p.end)) * 100))}%`;

  return (
    <div className="relative px-3 pt-3 pb-2 sm:bg-gradient-to-t sm:from-black/90 sm:via-black/70 sm:to-transparent sm:px-4 sm:pt-6">
      <Timeline {...p} pct={pct} />

      <div className="mt-2 flex items-center gap-0.5 sm:gap-2">
        <CtlButton label={p.playing ? 'Pause' : 'Play'} onClick={p.onTogglePlay}>
          <Icon name={p.playing ? 'pause' : 'play'} size={22} />
        </CtlButton>
        <CtlButton label="Back 10 seconds" onClick={() => p.onSeek(p.position - 10)}>
          <Icon name="back10" />
        </CtlButton>
        <CtlButton label="Forward 10 seconds" onClick={() => p.onSeek(p.position + 10)} disabled={atEdge} className="hidden min-[400px]:inline-flex">
          <Icon name="fwd10" />
        </CtlButton>
        <CtlButton label="Previous hand" onClick={p.onPrevHand} className="hidden sm:inline-flex">
          <Icon name="prev" size={18} />
        </CtlButton>
        <CtlButton label="Next hand" onClick={p.onNextHand} className="hidden sm:inline-flex">
          <Icon name="next" size={18} />
        </CtlButton>

        <div className="group hidden items-center gap-1 md:flex">
          <CtlButton label={p.muted ? 'Unmute' : 'Mute'} onClick={p.onMute}>
            <Icon name={p.muted || p.volume === 0 ? 'mute' : 'volume'} />
          </CtlButton>
          <input
            type="range"
            min={0}
            max={100}
            value={p.muted ? 0 : p.volume}
            onChange={(e) => p.onVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-20 accent-[var(--color-gold)]"
          />
        </div>

        <span className="ml-1 hidden text-xs whitespace-nowrap text-white/80 tnum min-[400px]:inline sm:text-[13px]">
          {isLive ? (
            atEdge ? (
              <span className="font-bold">{p.status === 'delayed' ? 'Live (delayed)' : 'Live'}</span>
            ) : (
              <>−{duration(p.end - p.position)} behind</>
            )
          ) : (
            <>
              {duration(p.position)} / {duration(p.end)}
            </>
          )}
        </span>

        {isLive && !atEdge && (
          <button onClick={p.onJumpLive} className="label ml-1 rounded-[4px] bg-live px-2 py-1 text-[10px] text-white hover:brightness-110">
            Jump to Live
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          {isVod && (
            <div className="relative">
              <CtlButton label={`Playback speed ${p.speed}x`} onClick={() => setMenu(menu === 'speed' ? null : 'speed')} pressed={menu === 'speed'}>
                <span className="text-[12px] font-bold tnum">{p.speed}x</span>
              </CtlButton>
              {menu === 'speed' && (
                <Menu title="Speed" onClose={() => setMenu(null)}>
                  {SPEEDS.map((s) => (
                    <MenuItem key={s} on={p.speed === s} onClick={() => (p.onSpeed!(s), setMenu(null))}>
                      {s === 1 ? 'Normal' : `${s}x`}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          )}
          {isVod && p.onSubtitle ? (
            <div className="relative">
              <CtlButton label="Subtitles" onClick={() => setMenu(menu === 'subs' ? null : 'subs')} pressed={menu === 'subs'}>
                <span className={cx('rounded-[3px] border px-1 text-[11px] font-black', p.cc ? 'border-white bg-white text-ink' : 'border-white/70')}>CC</span>
              </CtlButton>
              {menu === 'subs' && (
                <Menu title="Subtitles" onClose={() => setMenu(null)}>
                  {SUBTITLES.map((s) => (
                    <MenuItem key={s} on={p.subtitle === s} onClick={() => (p.onSubtitle!(s), setMenu(null))}>
                      {s}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          ) : (
            <CtlButton label={p.cc ? 'Turn captions off' : 'Turn captions on'} onClick={p.onCc} pressed={p.cc}>
              <span className={cx('rounded-[3px] border px-1 text-[11px] font-black', p.cc ? 'border-white bg-white text-ink' : 'border-white/70')}>CC</span>
            </CtlButton>
          )}
          <div className="relative">
            <CtlButton label="Audio track" onClick={() => setMenu(menu === 'audio' ? null : 'audio')} pressed={menu === 'audio'}>
              <Icon name="audio" />
            </CtlButton>
            {menu === 'audio' && (
              <Menu title="Audio" onClose={() => setMenu(null)}>
                {(Object.keys(AUDIO_LABEL) as AudioTrack[]).map((a) => (
                  <MenuItem key={a} on={p.audio === a} disabled={!p.audioTracksSupported && a !== 'en'} onClick={() => (p.onAudio(a), setMenu(null))}>
                    {AUDIO_LABEL[a]}
                  </MenuItem>
                ))}
                {!p.audioTracksSupported && <p className="px-3 pt-1 text-[11px] text-subtle">Alternate audio isn't supported on this platform.</p>}
              </Menu>
            )}
          </div>
          <div className="relative">
            <CtlButton label="Quality" onClick={() => setMenu(menu === 'quality' ? null : 'quality')} pressed={menu === 'quality'}>
              <Icon name="gear" />
            </CtlButton>
            {menu === 'quality' && (
              <Menu title="Quality" onClose={() => setMenu(null)}>
                {QUALITIES.map((q) => (
                  <MenuItem key={q} on={p.quality === q} onClick={() => (p.onQuality(q), setMenu(null))}>
                    {q === 'Auto' ? `Auto (${p.quality === 'Auto' ? '1080p' : p.quality})` : q}
                  </MenuItem>
                ))}
              </Menu>
            )}
          </div>
          <CtlButton label={p.fullscreen ? 'Exit full screen' : 'Full screen'} onClick={p.onFullscreen}>
            <Icon name="full" />
          </CtlButton>
        </div>
      </div>
    </div>
  );
}

function Timeline({ status, position, end, onSeek, markers, pct, resumeAt, previewAt }: ControlsProps & { pct: (t: number) => string }) {
  const track = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const isLive = status === 'live' || status === 'delayed';
  const seekFromEvent = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    onSeek(((clientX - r.left) / r.width) * end);
  };
  return (
    <div className="relative h-5">
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(end)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={isLive ? `${duration(end - position)} behind live` : `${duration(position)} of ${duration(end)}`}
        onClick={(e) => seekFromEvent(e.clientX)}
        onMouseMove={previewAt ? (e) => {
          const r = track.current!.getBoundingClientRect();
          setScrub(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * end);
        } : undefined}
        onMouseLeave={() => setScrub(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') (e.preventDefault(), onSeek(position - 10));
          if (e.key === 'ArrowRight') (e.preventDefault(), onSeek(position + 10));
        }}
        className="group absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 cursor-pointer rounded-full bg-white/20 transition-[height] duration-150 hover:h-2"
      >
        <div className={cx('h-full rounded-full', isLive ? 'bg-live' : 'bg-gold')} style={{ width: pct(position) }} />
        <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: pct(position) }} />
        {/* where this viewer left off last time */}
        {!!resumeAt && resumeAt > 60 && <i title={`Resume point · ${duration(resumeAt)}`} className="absolute -top-1 h-[calc(100%+8px)] w-0.5 -translate-x-1/2 rounded bg-white/70" style={{ left: pct(resumeAt) }} />}
      </div>
      {previewAt && scrub !== null && !hover && (
        <div className="pointer-events-none absolute bottom-6 z-20 w-40 -translate-x-1/2" style={{ left: `clamp(80px, ${pct(scrub)}, calc(100% - 80px))` }}>
          <div className="overflow-hidden rounded-[6px] border border-white/30 bg-black shadow-2xl">
            <img src={previewAt(scrub)} alt="" className="aspect-video w-full object-cover" />
            <p className="px-2 py-1 text-center text-xs font-semibold tnum">{duration(scrub)}</p>
          </div>
        </div>
      )}
      {markers.map((h) => {
        const m = HAND_META[h.type];
        const show = hover === h.id;
        return (
          <div key={h.id} className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(h.t) }}>
            <button
              onClick={(e) => (e.stopPropagation(), onSeek(h.t))}
              onMouseEnter={() => setHover(h.id)}
              onMouseLeave={() => setHover((x) => (x === h.id ? null : x))}
              onFocus={() => setHover(h.id)}
              onBlur={() => setHover((x) => (x === h.id ? null : x))}
              aria-label={`${m.label} hand at ${duration(h.t)}: ${h.title}`}
              className="block rounded-full transition-transform duration-150 hover:scale-125 focus-visible:scale-125"
            >
              <HandGlyph type={h.type} size={16} />
            </button>
            {show && <MarkerTip hand={h} align={h.t / Math.max(1, end) < 0.2 ? 'left' : h.t / Math.max(1, end) > 0.8 ? 'right' : 'center'} />}
          </div>
        );
      })}
    </div>
  );
}

function MarkerTip({ hand, align }: { hand: Hand; align: 'left' | 'center' | 'right' }) {
  const m = HAND_META[hand.type];
  return (
    // Tooltips near either end of the timeline align to that edge so they never get clipped.
    <div role="tooltip" className={cx('absolute bottom-6 w-60', align === 'left' ? '-left-2' : align === 'right' ? '-right-2' : 'left-1/2 -translate-x-1/2')}>
      <div className="rounded-card border border-line-strong bg-surface p-3 text-left shadow-2xl">
      <p className="label flex items-center gap-1.5 text-[10px] text-gold">
        <HandGlyph type={hand.type} size={13} /> {m.label} · {duration(hand.t)}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-snug">{hand.title}</p>
      <p className="mt-1 text-xs text-muted">{hand.playerIds.map((id) => playerById(id).name).join(' vs ')}</p>
      <p className="mt-1 text-xs tnum">
        Pot <b>{chips(hand.pot)}</b>
      </p>
      <div className="mt-1.5 text-xs">
        <Spoiler k={`hand-${hand.id}`} inline label="Hand result hidden">
          <span className="font-semibold text-text">{hand.result}</span>
        </Spoiler>
      </div>
      </div>
    </div>
  );
}

function CtlButton({ label, onClick, children, disabled, pressed, className }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; pressed?: boolean; className?: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={cx('inline-flex size-8 items-center justify-center rounded-chip sm:size-9 text-white/90 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:opacity-35', className)}
    >
      {children}
    </button>
  );
}

function Menu({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);
  return (
    <div ref={ref} role="menu" aria-label={title} className="absolute right-0 bottom-11 z-20 w-56 rounded-card border border-line-strong bg-surface py-1.5 shadow-2xl">
      <p className="label px-3 pb-1 text-[10px] text-subtle">{title}</p>
      {children}
    </div>
  );
}

function MenuItem({ on, children, onClick, disabled }: { on: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button role="menuitemradio" aria-checked={on} disabled={disabled} onClick={onClick} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-40">
      {children}
      {on && <Icon name="check" size={16} className="text-gold" />}
    </button>
  );
}
