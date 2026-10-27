// Channels — the linear side of Live. 24/7 programmed channels on a fixed schedule: a channel strip, the channel player
// (whatever is on now, no rewind), what's next on the channel, and a programme guide (EPG) across all channels.
// Access is checked per programme, at the moment it airs: free programmes play for anyone, live and replay programmes
// need the membership of the broadcast they carry. Live coverage that starts late or drops out never leaves the channel
// dark — it holds on highlights (standby). Programmes without rights in the viewer's region are blacked out.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KIND_LABEL,
  airing,
  channelById,
  channels,
  effectiveKind,
  programAt,
  programsFor,
  reminderKey,
  upNext,
  type Airing,
  type LinearChannel,
  type Program,
} from '../../data/channels';
import { HERO_DAY_ID, HERO_EXPECTED_START, bbFor, dayById, seatsFor } from '../../data/mock';
import { TRAVEL_UNAVAILABLE_EVENTS, requiredTier } from '../../data/policy';
import { PLATFORMS, overlayAllowed } from '../../data/platforms';
import type { OverlayLevel } from '../../data/types';
import { FOOTAGE, tableVideo, thumbFor } from '../../lib/media';
import { fmtDate, fmtTime, relative, tzAbbr } from '../../lib/time';
import { canWatch, gateForAccess, useApp, useTick, type AppState } from '../../state/app';
import { useLiveStacks } from '../../state/stacks';
import { AccessBadge, Button, Icon, Page, SectionHeader, Segmented, Skeleton, StatusBadge, cx } from '../../components/ui';
import { Stage } from '../player/Stage';
import { handFor } from '../player/hand';
import { PlaybackGate, VpnBlocked } from '../auth/Gates';

const M = 60_000;
const SLOT = 30 * M;

const shortName = (name: string) => name.replace(' World Championship', '');
const minutes = (p: Program) => Math.round((p.end - p.start) / M);
const lengthLabel = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}` : `${min}m`);

/** Stills and footage for a programme (CC poker footage, not WSOP). */
function mediaFor(p: Program): { poster: string; video: string; start: number } {
  if (p.dayId) {
    const v = tableVideo(0);
    return { poster: thumbFor(`prog:${p.id}`), video: v.url, start: v.start };
  }
  if (p.kind === 'classic') return { poster: thumbFor(`prog:${p.id}`), video: FOOTAGE.ft.url, start: 40 };
  if (p.kind === 'studio') return { poster: thumbFor(`prog:${p.id}`, 'people'), video: FOOTAGE.int.url, start: 20 };
  const f = p.seed % 2 ? FOOTAGE.int : FOOTAGE.deal;
  return { poster: thumbFor(`prog:${p.id}`, p.seed % 2 ? 'people' : 'hands'), video: f.url, start: 30 };
}
const STANDBY_POSTER = FOOTAGE.deal.frames[0].src;

/** Rights: programmes carrying event coverage are blacked out where the event has no rights. */
const blackedOut = (p: Program, s: AppState) => {
  if (!p.dayId) return false;
  const ref = dayById(p.dayId)!;
  return s.regionBlocked || (s.abroad && TRAVEL_UNAVAILABLE_EVENTS.includes(ref.event.id));
};

/** Can this viewer play what's on the channel right now? (Standby highlights are free for everyone.) */
function watchableNow(ch: LinearChannel, at: number, s: AppState) {
  const p = programAt(ch.id, at);
  if (!p) return false;
  const a = airing(p, s.streamMode);
  if (a.mode === 'standby') return !s.vpnDetected;
  return !blackedOut(p, s) && !s.vpnDetected && canWatch(p.access, s, a.mode === 'onair');
}

// ---- tags ------------------------------------------------------------------------------------------

/** What's airing: LIVE / DELAYED for live coverage, LATE START / INTERRUPTED while a channel stands by, else the kind. */
export function ProgramTag({ p, a, size = 'sm' }: { p: Program; a: Airing; size?: 'sm' | 'md' }) {
  if (a.mode === 'onair') return <StatusBadge status={a.status} delayMin={a.delayMin || 30} size={size} />;
  if (a.mode === 'standby') return <StatusBadge status={a.reason} size={size} />;
  const k = effectiveKind(p, a);
  return <KindLabel label={p.kind === 'live' ? 'Encore' : KIND_LABEL[k]} gold={k === 'classic' || k === 'studio'} size={size} />;
}

/** For programmes that haven't aired yet. */
function FutureTag({ p }: { p: Program }) {
  if (p.kind === 'live') return <span className="label inline-flex shrink-0 items-center rounded-[4px] border border-live/70 px-1.5 py-0.5 text-[10px] text-live">Live</span>;
  return <KindLabel label={KIND_LABEL[p.kind]} gold={p.kind === 'classic' || p.kind === 'studio'} />;
}

function KindLabel({ label, gold, size = 'sm' }: { label: string; gold?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('label inline-flex shrink-0 items-center rounded-[4px] border bg-black/70 whitespace-nowrap', size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1', gold ? 'border-gold/50 text-gold-strong' : 'border-line-strong text-muted')}>
      {label}
    </span>
  );
}

function ChannelNumber({ ch, className }: { ch: LinearChannel; className?: string }) {
  return (
    <span className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-line-strong bg-black/60 text-xs font-black text-text tnum', className)} aria-label={`Channel ${ch.number}`}>
      {ch.number}
    </span>
  );
}

function useProgramReminder() {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  return (p: Program, ch: LinearChannel) => {
    if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder before a programme starts.' });
    const k = reminderKey(p);
    const on = state.reminders.includes(k);
    set((s) => ({ reminders: on ? s.reminders.filter((r) => r !== k) : [...s.reminders, k] }));
    toast(on ? 'Reminder removed' : `We'll remind you 15 minutes before · ${p.title} on ${ch.name}`);
  };
}

// ---- the Channels screen ---------------------------------------------------------------------------

export function ChannelsView({ channelId }: { channelId?: string }) {
  const nav = useNavigate();
  const now = useTick(15_000);
  const ch = channelById(channelId ?? '') ?? channels[0];
  const current = programAt(ch.id, now);
  const select = (id: string) => nav(`/live/channels/${id}`, { replace: true });
  if (!current) return null;
  return (
    <div>
      <ChannelStrip now={now} active={ch.id} onSelect={select} />
      <Page className="max-w-[96rem] py-4 sm:py-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-4">
            {/* Remounts when the channel changes or the next programme starts (access is checked per programme). */}
            <ChannelPlayer key={`${ch.id}:${current.id}`} ch={ch} p={current} onSwitch={select} />
            <NowInfo ch={ch} p={current} now={now} />
          </div>
          <aside className="space-y-6">
            <UpNextList ch={ch} now={now} />
            <AboutChannels />
          </aside>
        </div>
        <ChannelGuide now={now} active={ch.id} onSelect={select} />
      </Page>
    </div>
  );
}

function ChannelStrip({ now, active, onSelect }: { now: number; active: string; onSelect: (id: string) => void }) {
  return (
    <section className="border-b border-line bg-surface/60" aria-label="Channels">
      <div className="mx-auto max-w-[96rem] px-gutter py-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="label text-text/80">Channels · 24/7</p>
          <button onClick={() => document.getElementById('channel-guide')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-semibold text-muted hover:text-text">
            Channel guide ↓
          </button>
        </div>
        <div className="hscroll" role="tablist" aria-label="Channels">
          {channels.map((ch) => (
            <ChannelChip key={ch.id} ch={ch} now={now} on={ch.id === active} onClick={() => onSelect(ch.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChannelChip({ ch, now, on, onClick }: { ch: LinearChannel; now: number; on: boolean; onClick: () => void }) {
  const { state } = useApp();
  const p = programAt(ch.id, now);
  if (!p) return null;
  const a = airing(p, state.streamMode);
  const pct = Math.min(1, Math.max(0, (now - p.start) / (p.end - p.start)));
  const locked = !watchableNow(ch, now, state);
  return (
    <button
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cx(
        'w-64 rounded-card border px-3.5 py-3 text-left transition-colors duration-150',
        on ? (a.mode === 'onair' ? 'border-live/80 bg-gradient-to-b from-live/15 to-surface' : 'border-gold bg-gold-dim') : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <span className="flex items-center gap-2">
        <ChannelNumber ch={ch} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{ch.name}</span>
        <AccessBadge access={p.access} live={a.mode === 'onair'} locked={locked} />
      </span>
      <span className="mt-2 flex items-center gap-2">
        <ProgramTag p={p} a={a} />
        <span className="truncate text-xs text-muted">{p.title}</span>
      </span>
      <span className="mt-2 block h-1 rounded-full bg-white/10">
        <i className={cx('block h-full rounded-full', a.mode === 'onair' ? 'bg-live' : 'bg-gold')} style={{ width: `${pct * 100}%` }} />
      </span>
    </button>
  );
}

// ---- player ------------------------------------------------------------------------------------------

const CAPTION_LINES: Record<LinearChannel['lang'], string[]> = {
  EN: ['Welcome back to WSOP TV — here is where we stand.', 'Seven-time champion, never rushed.', 'The crowd in Las Vegas is completely silent.'],
  ES: ['Bienvenidos de nuevo a WSOP TV en español.', 'Siete brazaletes y ni un gesto de nervios.', 'Silencio absoluto en Las Vegas.'],
};

function ChannelPlayer({ ch, p, onSwitch }: { ch: LinearChannel; p: Program; onSwitch: (id: string) => void }) {
  const { state } = useApp();
  const nav = useNavigate();
  const now = useTick(1000);
  const caps = PLATFORMS[state.platform];
  const a = airing(p, state.streamMode);
  const onAir = a.mode === 'onair';
  const ref = p.dayId ? dayById(p.dayId) : undefined;
  const hasData = !!ref && a.mode !== 'standby';
  const seatBase = useMemo(() => (p.dayId ? seatsFor(p.dayId) : []), [p.dayId]);
  const stacks = useLiveStacks(seatBase, onAir);
  const hand = useMemo(() => (p.dayId ? handFor(p.dayId) : undefined), [p.dayId]);
  const bb = p.dayId ? bbFor(p.dayId) : undefined;

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cc, setCc] = useState(state.ccDefault);
  const [overlay, setOverlay] = useState<OverlayLevel>(overlayAllowed(state.platform, state.overlayDefault) ? state.overlayDefault : caps.overlayMax);
  const [fullscreen, setFullscreen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!overlayAllowed(state.platform, overlay)) setOverlay(caps.overlayMax);
  }, [state.platform, caps, overlay]);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFullscreen = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => setFullscreen((f) => !f));
  };

  // Order of checks: rights (blackout) → VPN → standby (free highlights) → membership for this programme.
  const live = onAir;
  const gate = gateForAccess(p.access, state, live);
  const required = requiredTier(p.access, state.includedFrom, live);
  const blocked = blackedOut(p, state) ? 'blackout' : state.vpnDetected ? 'vpn' : a.mode === 'standby' ? null : gate !== 'ok' ? gate : null;
  const next = upNext(ch.id, now, 1)[0];
  const alt = blocked && blocked !== 'vpn' ? channels.find((c) => c.id !== ch.id && watchableNow(c, now, state)) : undefined;
  const altProg = alt ? programAt(alt.id, now) : undefined;

  const m = mediaFor(p);
  const pct = Math.min(1, Math.max(0, (now - p.start) / (p.end - p.start)));
  const caption = cc ? CAPTION_LINES[ch.lang][Math.floor(now / 5000) % 3] : null;
  const info = ref
    ? {
        event: shortName(ref.event.name),
        day: ref.day.label,
        level: onAir && ref.day.label === 'Final Table' ? ref.event.level : undefined,
        blinds: bb ? { sb: bb / 2, bb, ante: bb } : undefined,
        left: onAir && ref.day.label === 'Final Table' ? ref.event.remaining : undefined,
      }
    : undefined;
  const switchBy = (step: number) => onSwitch(channels[(channels.indexOf(ch) + step + channels.length) % channels.length].id);

  return (
    <div className="space-y-3">
      <div
        ref={box}
        tabIndex={-1}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest('input, [role="radiogroup"]')) return;
          if (e.key === 'ArrowUp' || e.key === 'PageUp') (e.preventDefault(), switchBy(-1));
          if (e.key === 'ArrowDown' || e.key === 'PageDown') (e.preventDefault(), switchBy(1));
          if (e.key.toLowerCase() === 'm') setMuted((x) => !x);
          if (e.key.toLowerCase() === 'f') toggleFullscreen();
        }}
        className={cx('group/player relative overflow-hidden rounded-panel border border-line bg-black', fullscreen && 'fixed inset-0 z-[70] rounded-none border-0')}
        aria-label={`${ch.name} player`}
      >
        <div className={cx('relative', fullscreen ? 'h-full' : 'aspect-video')}>
          {loading ? (
            <Skeleton className="absolute inset-0 rounded-none" />
          ) : blocked === 'blackout' ? (
            <Blackout ch={ch} p={p} nextTitle={next?.title} nextAt={next?.start} alt={alt} onSwitch={onSwitch} />
          ) : blocked === 'vpn' ? (
            <VpnBlocked />
          ) : blocked ? (
            <PlaybackGate gate={blocked} required={required} returnTo={`/live/channels/${ch.id}`} />
          ) : a.mode === 'standby' ? (
            <Standby ch={ch} p={p} reason={a.reason} />
          ) : (
            <>
              <Stage
                overlay={hasData ? overlay : 'off'}
                tableName={ref?.day.tables[0].name ?? ch.name}
                seats={stacks}
                playing={playing}
                phase={Math.floor(now / 6000) % 3}
                caption={caption}
                muted={muted}
                media={m}
                info={info}
                hand={hand}
              />
              {!playing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-6 text-center">
                  <p className="label text-gold">Paused</p>
                  <p className="max-w-md text-lg font-bold sm:text-xl">Channels don't rewind — resuming rejoins {ch.name} where it is now</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="primary" onClick={() => setPlaying(true)}>
                      <Icon name="play" size={16} /> Resume
                    </Button>
                    {p.dayId && (
                      <Button variant="secondary" onClick={() => nav(`/watch/${p.dayId}?t=0`)}>
                        <Icon name="history" size={16} /> Watch from the start
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {!loading && !blocked && (
            <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2">
              <span className="label rounded-[4px] bg-black/75 px-2 py-1 text-[10px] text-white/90 tnum">
                CH {ch.number} · {ch.short}
              </span>
              <ProgramTag p={p} a={a} />
            </div>
          )}
        </div>

        {!loading && !blocked && (
          <div className={cx(fullscreen ? 'absolute inset-x-0 bottom-0' : 'relative bg-black sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent')}>
            <div className="px-3 pt-3 pb-2 sm:bg-gradient-to-t sm:from-black/90 sm:via-black/70 sm:to-transparent sm:px-4 sm:pt-6">
              {/* Programme progress: where the channel is in this slot (not seekable). */}
              <div className="flex items-center gap-2 text-[11px] text-white/75 tnum">
                <span>{fmtTime(p.start, state.tz)}</span>
                <span
                  className="relative h-1 flex-1 rounded-full bg-white/20"
                  role="progressbar"
                  aria-label={`${p.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct * 100)}
                >
                  <i className={cx('absolute inset-y-0 left-0 rounded-full', onAir ? 'bg-live' : 'bg-gold')} style={{ width: `${pct * 100}%` }} />
                </span>
                <span>{fmtTime(p.end, state.tz)}</span>
              </div>
              <div className="mt-2 flex items-center gap-0.5 sm:gap-2">
                <CtlButton label={playing ? 'Pause' : 'Resume'} onClick={() => setPlaying((x) => !x)} disabled={a.mode === 'standby'}>
                  <Icon name={playing ? 'pause' : 'play'} size={22} />
                </CtlButton>
                <CtlButton label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((x) => !x)}>
                  <Icon name={muted ? 'mute' : 'volume'} />
                </CtlButton>
                <CtlButton label="Previous channel" onClick={() => switchBy(-1)}>
                  <span className="text-[11px] font-black">CH−</span>
                </CtlButton>
                <CtlButton label="Next channel" onClick={() => switchBy(1)}>
                  <span className="text-[11px] font-black">CH+</span>
                </CtlButton>
                <span className="ml-1 hidden truncate text-xs text-white/80 min-[420px]:inline sm:text-[13px]">
                  {onAir ? <b>{a.status === 'delayed' ? `Live · ${a.delayMin} min delay` : 'Live'}</b> : a.mode === 'standby' ? 'Standing by' : 'On now'} · ends {relative(p.end, now)}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  {hasData && (
                    <span className="hidden sm:inline-flex">
                      <Segmented
                        size="sm"
                        label="Overlay level"
                        value={overlay}
                        onChange={setOverlay}
                        options={(['off', 'basic', 'pro'] as OverlayLevel[]).map((o) => ({
                          value: o,
                          label: o === 'off' ? 'Off' : o === 'basic' ? 'Basic' : 'Pro',
                          disabled: !overlayAllowed(state.platform, o),
                          title: overlayAllowed(state.platform, o) ? undefined : `Not available on ${caps.label}`,
                        }))}
                      />
                    </span>
                  )}
                  <CtlButton label={cc ? 'Turn captions off' : 'Turn captions on'} onClick={() => setCc((x) => !x)} pressed={cc}>
                    <span className={cx('rounded-[3px] border px-1 text-[11px] font-black', cc ? 'border-white bg-white text-ink' : 'border-white/70')}>CC</span>
                  </CtlButton>
                  <CtlButton label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                    <Icon name="full" />
                  </CtlButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Locked or blacked out: point to a channel this viewer can watch right now. */}
      {blocked && blocked !== 'vpn' && alt && altProg && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-ok/40 bg-surface px-4 py-3">
          <AccessBadge access={altProg.access} size="md" />
          <p className="min-w-0 flex-1 text-sm">
            <b>On {alt.name} now:</b> {altProg.title} <span className="text-muted">— you can watch this one</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => onSwitch(alt.id)}>
            Switch to CH {alt.number}
          </Button>
        </div>
      )}
    </div>
  );
}

function CtlButton({ label, onClick, children, disabled, pressed }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; pressed?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-chip text-white/90 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:opacity-35 sm:size-9"
    >
      {children}
    </button>
  );
}

/** Live coverage that started late or dropped out: the channel holds on highlights instead of going dark. */
function Standby({ ch, p, reason }: { ch: LinearChannel; p: Program; reason: 'late' | 'interrupted' | 'upcoming' }) {
  const { state, toast } = useApp();
  const nav = useNavigate();
  const ref = dayById(p.dayId!)!;
  const title = `${shortName(ref.event.name)} coverage`;
  return (
    <div className="relative size-full">
      <img src={STANDBY_POSTER} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 p-6 text-center" role="status">
        <p className="label text-delayed">Stand by</p>
        <h2 className="max-w-lg text-xl font-bold tracking-tight sm:text-2xl">
          {reason === 'late' ? `${title} is starting late` : reason === 'interrupted' ? `${title} is temporarily off air` : `${title} starts shortly`}
        </h2>
        <p className="max-w-md text-sm text-muted">
          {reason === 'late' && p.dayId === HERO_DAY_ID ? `Now expected around ${fmtTime(HERO_EXPECTED_START, state.tz)} your time. ` : reason === 'interrupted' ? 'It resumes automatically. ' : ''}
          {ch.name} is showing highlights in the meantime — stay on the channel and it picks the coverage back up.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => toast("We'll notify you when coverage is back")}>
            <Icon name="bell" size={16} /> Notify me
          </Button>
          <Button variant="secondary" onClick={() => nav(`/events/${ref.event.id}`)}>
            Catch up on key hands
          </Button>
        </div>
      </div>
    </div>
  );
}

/** No rights for this programme where the viewer is: the slot is blacked out, the channel carries on afterwards. */
function Blackout({ ch, p, nextTitle, nextAt, alt, onSwitch }: { ch: LinearChannel; p: Program; nextTitle?: string; nextAt?: number; alt?: LinearChannel; onSwitch: (id: string) => void }) {
  const { state, toast } = useApp();
  return (
    <div className="stage flex size-full flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
      <span className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-black/50 text-gold">
        <Icon name="globe" />
      </span>
      <p className="label text-gold">Not available in your region</p>
      <h2 className="max-w-lg text-xl font-bold tracking-tight sm:text-2xl">{p.title} is blacked out where you are</h2>
      <p className="max-w-md text-sm text-muted">
        Broadcast rights for this event don't cover your location.
        {nextTitle && nextAt ? ` ${ch.name} returns with ${nextTitle} at ${fmtTime(nextAt, state.tz)}.` : ''}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {alt && (
          <Button variant="primary" onClick={() => onSwitch(alt.id)}>
            Watch {alt.name}
          </Button>
        )}
        <Button variant="secondary" onClick={() => toast("We'll notify you if this event becomes available")}>
          <Icon name="bell" size={16} /> Notify me
        </Button>
      </div>
    </div>
  );
}

// ---- now / next ------------------------------------------------------------------------------------

function NowInfo({ ch, p, now }: { ch: LinearChannel; p: Program; now: number }) {
  const { state } = useApp();
  const a = airing(p, state.streamMode);
  const ref = p.dayId ? dayById(p.dayId) : undefined;
  const live = a.mode === 'onair';
  const encore = p.kind === 'live' && a.mode === 'program';
  return (
    <section className="rounded-panel border border-line bg-surface p-4 sm:p-5" aria-label="On now">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="label text-text/80">
          CH {ch.number} · {ch.name}
        </span>
        <ProgramTag p={p} a={a} />
        <AccessBadge access={p.access} live={live} locked={!watchableNow(ch, now, state)} />
        <span className="tnum">
          Now · {fmtTime(p.start, state.tz)} – {fmtTime(p.end, state.tz)} {tzAbbr(state.tz, new Date(p.start))}
        </span>
        <span>· ends {relative(p.end, now)}</span>
      </div>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
        {p.title}
        {encore && <span className="text-muted"> · Encore</span>}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {p.subtitle}
        {live && a.delayMin ? ` · airs ${a.delayMin} min behind the tournament floor` : ''}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ref && live && (
          <Link to={`/watch/${ref.day.id}`}>
            <Button variant="primary" size="sm" tabIndex={-1}>
              <Icon name="layers" size={14} /> All tables & multiview
            </Button>
          </Link>
        )}
        {ref && (
          <Link to={`/watch/${ref.day.id}?t=0`}>
            <Button variant="secondary" size="sm" tabIndex={-1}>
              <Icon name="history" size={14} /> Watch from the start
            </Button>
          </Link>
        )}
        {p.archiveId && (
          <Link to="/archive">
            <Button variant="secondary" size="sm" tabIndex={-1}>
              Full version in Archive
            </Button>
          </Link>
        )}
        {ref && (
          <Link to={`/events/${ref.event.id}`} className="ml-1 text-sm font-semibold text-muted hover:text-text">
            Event #{ref.event.number} details →
          </Link>
        )}
      </div>
    </section>
  );
}

function UpNextList({ ch, now }: { ch: LinearChannel; now: number }) {
  const { state } = useApp();
  const toggle = useProgramReminder();
  const list = upNext(ch.id, now, 6);
  return (
    <section aria-label={`Next on ${ch.name}`}>
      <p className="label mb-3 text-text/80">Next on {ch.short}</p>
      <ol className="space-y-2">
        {list.map((p) => {
          const on = state.reminders.includes(reminderKey(p));
          return (
            <li key={p.id} className="flex items-start gap-3 rounded-card border border-line bg-surface p-3">
              <span className="w-[4.25rem] shrink-0 pt-0.5 text-sm font-bold tnum">{fmtTime(p.start, state.tz)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <FutureTag p={p} />
                  <AccessBadge access={p.access} live={p.kind === 'live'} locked={!canWatch(p.access, state, p.kind === 'live')} />
                  <span className="text-xs text-muted tnum">{lengthLabel(minutes(p))}</span>
                </span>
              </span>
              <button
                onClick={() => toggle(p, ch)}
                aria-pressed={on}
                aria-label={on ? `Reminder set for ${p.title}` : `Remind me about ${p.title}`}
                title={on ? 'Reminder set' : 'Remind me'}
                className={cx('inline-flex size-8 shrink-0 items-center justify-center rounded-chip border transition-colors duration-150', on ? 'border-gold bg-gold-dim text-gold-strong' : 'border-line-strong text-muted hover:text-text')}
              >
                <Icon name="bell" size={15} />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function AboutChannels() {
  return (
    <section className="rounded-card border border-line bg-surface p-4 text-sm" aria-label="About channels">
      <p className="label mb-2 text-gold">How channels work</p>
      <ul className="space-y-1.5 text-muted">
        <li>· Each channel runs 24/7 on a fixed schedule — no rewind. To start over, open the broadcast.</li>
        <li>· Studio, highlight and classic programmes are free to watch.</li>
        <li>· Live and replay programmes need the same membership as the broadcast they carry.</li>
        <li>· Live coverage airs on the feature-table delay. If it starts late or drops out, the channel stays on with highlights.</li>
        <li>· Programmes without rights in your region are blacked out; the channel continues after them.</li>
      </ul>
    </section>
  );
}

// ---- programme guide (EPG) -------------------------------------------------------------------------

const PPM = 4; // pixels per minute
const GUIDE_HOURS = 8;

function ChannelGuide({ now, active, onSelect }: { now: number; active: string; onSelect: (id: string) => void }) {
  const { state } = useApp();
  const start = Math.floor((now - 30 * M) / SLOT) * SLOT;
  const end = start + GUIDE_HOURS * 60 * M;
  const width = ((end - start) / M) * PPM;
  const x = (t: number) => ((Math.max(start, Math.min(end, t)) - start) / M) * PPM;
  const ticks = Array.from({ length: GUIDE_HOURS * 2 }, (_, i) => start + i * SLOT);
  const select = (id: string) => {
    onSelect(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <section id="channel-guide" className="mt-10 scroll-mt-24" aria-label="Channel guide">
      <SectionHeader
        title="Channel guide"
        kicker="All channels · next 8 hours"
        action={<span className="hidden text-xs text-muted md:inline">Your time ({tzAbbr(state.tz)}) · select a programme on now to switch, a later one for a reminder</span>}
      />
      <div className="overflow-x-auto rounded-panel border border-line bg-surface">
        <div style={{ width: width + 176 }}>
          <div className="flex h-9 border-b border-line">
            <div className="sticky left-0 z-20 flex w-32 shrink-0 items-center border-r border-line bg-surface px-3 text-xs font-semibold text-muted sm:w-44">{fmtDate(now, state.tz)}</div>
            <div className="relative flex-1">
              {ticks.map((t) => (
                <span key={t} className="absolute top-0 h-full border-l border-line/70 pt-2.5 pl-1.5 text-[11px] text-muted tnum" style={{ left: x(t) }}>
                  {fmtTime(t, state.tz)}
                </span>
              ))}
              <NowLine left={x(now)} label />
            </div>
          </div>
          {channels.map((ch) => (
            <div key={ch.id} className="flex h-[4.75rem] border-b border-line last:border-0">
              <button
                onClick={() => select(ch.id)}
                aria-current={ch.id === active || undefined}
                className={cx('sticky left-0 z-20 flex w-32 shrink-0 items-center gap-2.5 border-r border-line px-3 text-left transition-colors duration-150 sm:w-44', ch.id === active ? 'bg-surface-3' : 'bg-surface hover:bg-surface-2')}
              >
                <ChannelNumber ch={ch} className={ch.id === active ? 'border-gold text-gold-strong' : undefined} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{ch.name}</span>
                  <span className="block truncate text-[11px] text-muted">{ch.free ? 'Free · 24/7' : ch.lang === 'ES' ? 'Español' : 'English'}</span>
                </span>
              </button>
              <div className="relative flex-1">
                {programsFor(ch.id)
                  .filter((p) => p.end > start && p.start < end)
                  .map((p) => (
                    <GuideBlock key={p.id} ch={ch} p={p} now={now} left={x(p.start)} width={x(p.end) - x(p.start)} onSelect={select} />
                  ))}
                <NowLine left={x(now)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NowLine({ left, label }: { left: number; label?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-live" style={{ left }} aria-hidden>
      {label && <span className="label absolute top-1 left-1 rounded-[3px] bg-live px-1 text-[9px] text-white">Now</span>}
    </span>
  );
}

function GuideBlock({ ch, p, now, left, width, onSelect }: { ch: LinearChannel; p: Program; now: number; left: number; width: number; onSelect: (id: string) => void }) {
  const { state, toast } = useApp();
  const nav = useNavigate();
  const toggle = useProgramReminder();
  const isNow = p.start <= now && now < p.end;
  const past = p.end <= now;
  const a = airing(p, state.streamMode);
  const reminded = state.reminders.includes(reminderKey(p));
  const locked = isNow ? !watchableNow(ch, now, state) : !canWatch(p.access, state, p.kind === 'live' && !past);
  const onClick = () => {
    if (isNow) return onSelect(ch.id);
    if (!past) return toggle(p, ch);
    if (p.dayId) return nav(`/watch/${p.dayId}`);
    if (p.archiveId) return nav('/archive');
    toast(`${p.title} has finished — see what's on next in the guide`);
  };
  const hint = isNow ? `On now — switch to ${ch.name}` : past ? (p.dayId ? 'Finished — open the replay' : 'Finished') : reminded ? 'Reminder set — select to remove it' : 'Select to get a reminder';
  return (
    <button
      onClick={onClick}
      title={`${p.title} · ${fmtTime(p.start, state.tz)}–${fmtTime(p.end, state.tz)} · ${hint}`}
      className={cx(
        'absolute inset-y-1.5 overflow-hidden rounded-[8px] border px-2.5 py-1.5 text-left transition-colors duration-150',
        isNow ? 'border-gold bg-gold-dim' : 'border-line bg-surface-2 hover:border-line-strong',
        past && 'opacity-55',
        p.kind === 'live' && 'border-l-[3px] border-l-live',
      )}
      style={{ left: left + 2, width: Math.max(0, width - 4) }}
    >
      <span className="block truncate text-[13px] font-semibold">{p.title}</span>
      <span className="mt-1 flex items-center gap-1.5 overflow-hidden text-[11px] whitespace-nowrap text-muted tnum">
        {fmtTime(p.start, state.tz)}
        {width > 150 && (isNow ? <ProgramTag p={p} a={a} /> : <FutureTag p={p} />)}
        {width > 230 && <AccessBadge access={p.access} live={p.kind === 'live' && !past} locked={locked} />}
        {reminded && <Icon name="bell" size={12} className="text-gold" />}
      </span>
    </button>
  );
}

// ---- Home row --------------------------------------------------------------------------------------

/** Home: what's on each channel right now. */
export function ChannelsRow() {
  const now = useTick(30_000);
  return (
    <section>
      <SectionHeader
        title="On the channels now"
        kicker="24/7 channels"
        action={
          <Link to="/live/channels" className="text-sm font-semibold text-muted hover:text-text">
            Channel guide →
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {channels.map((ch) => (
          <HomeChannelCard key={ch.id} ch={ch} now={now} />
        ))}
      </div>
    </section>
  );
}

function HomeChannelCard({ ch, now }: { ch: LinearChannel; now: number }) {
  const { state } = useApp();
  const p = programAt(ch.id, now);
  if (!p) return null;
  const a = airing(p, state.streamMode);
  const next = upNext(ch.id, now, 1)[0];
  const pct = Math.min(1, Math.max(0, (now - p.start) / (p.end - p.start)));
  const onAir = a.mode === 'onair';
  return (
    <Link to={`/live/channels/${ch.id}`} className="group block min-w-0">
      <div className={cx('relative aspect-video overflow-hidden rounded-card border border-line transition-[border-color,transform] duration-200 group-hover:scale-[1.02]', onAir ? 'group-hover:border-live/70' : 'group-hover:border-gold/70')}>
        <img src={a.mode === 'standby' ? STANDBY_POSTER : mediaFor(p).poster} alt="" loading="lazy" className={cx('size-full object-cover', a.mode === 'standby' && 'opacity-50 grayscale')} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" aria-hidden />
        <span className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="label rounded-[4px] bg-black/75 px-1.5 py-0.5 text-[10px] tnum">CH {ch.number}</span>
        </span>
        <span className="absolute right-2 bottom-3">

        </span>
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <i className={cx('block h-full', onAir ? 'bg-live' : 'bg-gold')} style={{ width: `${pct * 100}%` }} />
        </span>
      </div>
      <p className="mt-2 truncate text-[15px] font-semibold group-hover:text-gold-strong">{p.title}</p>
      <p className="truncate text-xs text-muted">
        {ch.name} · until {fmtTime(p.end, state.tz)}
      </p>
      {next && (
        <p className="truncate text-xs text-subtle">
          Next {fmtTime(next.start, state.tz)} · {next.title}
        </p>
      )}
    </Link>
  );
}
