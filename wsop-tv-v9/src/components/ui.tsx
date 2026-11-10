import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { nas, PLANS, PLAYERS, TIER_RANK, type Broadcast, type Clip, type PlayerId, type Tier } from '../data/demo';
import { useSession } from '../lib/state';

/* ───────────── small pieces ───────────── */

export function StatusChip({ b, small }: { b: Pick<Broadcast, 'status' | 'startsAt'>; small?: boolean }) {
  const cls = small ? 'chip !h-4 !text-[9px]' : 'chip';
  if (b.status === 'live') return <span className={`${cls} bg-red text-white`}><span className="live-dot" />Live</span>;
  if (b.status === 'vod') return <span className={`${cls} border border-white/60 text-white`}>VOD</span>;
  if (b.status === 'final') return <span className={`${cls} bg-white/15 text-white`}>Final</span>;
  if (b.status === 'replay') return <span className={`${cls} bg-gold text-black`}>Replay</span>;
  return <span className={`${cls} border border-white/30 text-muted`}>{b.startsAt?.replace(' PT', '')}</span>;
}

export function Avatar({ pid, size = 44, dim }: { pid: PlayerId; size?: number; dim?: boolean }) {
  const p = PLAYERS[pid];
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center border-2 bg-surface-2 font-black ${dim ? 'border-line text-subtle' : 'border-white/80 text-white'}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {p.initials}
    </span>
  );
}

export function PlayerLink({ pid, full, className = '' }: { pid: PlayerId; full?: boolean; className?: string }) {
  const p = PLAYERS[pid];
  return (
    <Link to={`/players/${pid}`} className={`font-semibold hover:underline ${className}`}>
      {full ? p.name : p.short}
    </Link>
  );
}

export function Section({ title, icon, right, children, className = '' }: { title: string; icon?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-t border-line px-4 py-5 md:px-6 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="display flex items-center gap-2 text-[15px]">
          {icon && <span aria-hidden>{icon}</span>}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function SampleNote({ children = 'Sample data · EBS feed placeholder' }: { children?: ReactNode }) {
  return <span className="text-[11px] text-subtle">{children}</span>;
}

export function ClipCard({ c, active }: { c: Clip; active?: boolean }) {
  return (
    <Link to={`/hands/${c.id}`} className={`group block overflow-hidden rounded border bg-surface ${active ? 'border-white' : 'border-line hover:border-line-strong'}`}>
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <img src={nas(c.still)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">{c.duration}</span>
        {active && <span className="chip absolute top-1.5 left-1.5 bg-white text-black">Now playing</span>}
      </div>
      <div className="p-2.5">
        <div className="line-clamp-2 text-[13px] leading-snug font-bold">{c.title}</div>
        <div className="mt-1 text-[11px] text-subtle">
          {c.views} views · {c.when}
        </div>
      </div>
    </Link>
  );
}

/* ───────────── Tournament Ticker: the remote control, and the only navigation ───────────── */

export function Ticker({ activeId }: { activeId?: string }) {
  const { ticker, tier, reminders, toggleReminder } = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  const plan = PLANS.find((p) => p.tier === tier)!;
  const link = (to: string, label: string) => (
    <Link to={to} className={`px-2 py-1 text-[12px] font-semibold whitespace-nowrap hover:text-white ${loc.pathname.startsWith(to) ? 'text-white underline underline-offset-4' : 'text-muted'}`}>
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#0b0b0b]/95 backdrop-blur">
      <div className="flex items-stretch gap-2 px-2 py-2 md:px-3">
        <Link to="/" className="hidden shrink-0 flex-col justify-center px-2 sm:flex" aria-label="WSOP TV home">
          <span className="display text-[17px] leading-none">WSOP<span className="text-red">TV</span></span>
          <span className="mt-1 text-[9px] font-bold tracking-[.2em] text-subtle">DEMO</span>
        </Link>
        <nav aria-label="Today's broadcasts" className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {ticker.map((b) => {
            const active = b.id === activeId;
            const reminded = reminders.includes(b.id);
            const to = b.status === 'upcoming' ? `/event/${b.id}` : `/watch/${b.id}`;
            return (
              <div
                key={b.id}
                role="link"
                tabIndex={0}
                aria-current={active ? 'true' : undefined}
                onClick={() => nav(to)}
                onKeyDown={(e) => e.key === 'Enter' && nav(to)}
                className={`flex w-[148px] shrink-0 cursor-pointer flex-col rounded border px-2.5 py-1.5 text-left transition ${active ? 'border-white bg-white/10' : 'border-line bg-surface hover:border-line-strong'}`}
              >
                <StatusChip b={b} small />
                <div className="mt-1 truncate text-[12px] font-bold">{b.short}</div>
                <div className="truncate text-[11px] text-muted">{b.sub}</div>
                <div className="mt-1 border-t border-line pt-1 text-[10px] text-subtle">
                  {active ? (
                    <span className="text-white">▸ Watching</span>
                  ) : b.status === 'upcoming' ? (
                    <button
                      className={`hover:text-white ${reminded ? 'text-gold' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReminder(b.id);
                      }}
                    >
                      {reminded ? '🔔 Reminder set' : 'Set Reminder'}
                    </button>
                  ) : b.status === 'final' ? (
                    '▸ Replay'
                  ) : (
                    '▸ Watch'
                  )}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          {link('/hands', 'Highlights')}
          {link('/schedule', 'Schedule')}
          {link('/players', 'Players')}
          {tier === 'free' ? (
            <Link to="/subscribe" className="btn btn-gold ml-1 !h-8 !px-3 !text-[12px]">Subscribe</Link>
          ) : (
            <span className="ml-1 rounded border border-gold/60 px-2 py-1 text-[11px] font-bold text-gold">{plan.name.replace('GGPass ', '')}</span>
          )}
        </div>
      </div>
      {/* Phones: the same three links under the ticker. */}
      <div className="flex items-center justify-between border-t border-line px-3 py-1 lg:hidden">
        <div className="flex">
          {link('/hands', 'Highlights')}
          {link('/schedule', 'Schedule')}
          {link('/players', 'Players')}
        </div>
        {tier === 'free' ? (
          <Link to="/subscribe" className="text-[12px] font-bold text-gold">Subscribe</Link>
        ) : (
          <span className="text-[11px] font-bold text-gold">{plan.name.replace('GGPass ', '')}</span>
        )}
      </div>
    </header>
  );
}

/* ───────────── Video player ───────────── */

export type PlayerProps = {
  src: string;
  poster: string;
  offset: number;
  mode: 'live' | 'vod' | 'clip' | 'replay';
  /** Tier this needs; the player shows the GGPass prompt instead of the picture when the viewer's tier is lower. */
  needs?: Tier;
  /** Resume point for VOD (seconds into the programme). */
  resumeAt?: number;
  onProgress?: (t: number) => void;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  center?: ReactNode;
  bottom?: ReactNode;
  className?: string;
};

const mmss = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + ':' + String(s).padStart(2, '0');
};

export function VideoPlayer({ src, poster, offset, mode, needs = 'free', resumeAt, onProgress, topLeft, topRight, center, bottom, className = '' }: PlayerProps) {
  const { tier } = useSession();
  const loc = useLocation();
  const locked = TIER_RANK[tier] < TIER_RANK[needs];
  const ref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [cc, setCc] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [behind, setBehind] = useState(0);
  const [failed, setFailed] = useState(false);
  const [askResume, setAskResume] = useState(mode === 'vod' && !!resumeAt);
  // A clip is a few minutes cut from the source; VOD and replays run the length of the file.
  const clipLen = mode === 'clip' ? 272 : 0;

  useEffect(() => {
    setAskResume(mode === 'vod' && !!resumeAt);
    setBehind(0);
    const v = ref.current;
    if (!v || locked) return;
    const start = () => {
      v.currentTime = offset;
      setDur(v.duration);
      if (!(mode === 'vod' && resumeAt)) v.play().catch(() => setPlaying(false));
    };
    if (v.readyState >= 1) start();
    else v.addEventListener('loadedmetadata', start, { once: true });
    return () => v.removeEventListener('loadedmetadata', start);
  }, [src, offset, mode, locked, resumeAt]);

  if (locked) {
    const plan = PLANS.find((p) => p.tier === needs)!;
    return (
      <div className={`relative aspect-video w-full overflow-hidden bg-black ${className}`}>
        <img src={nas(poster)} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-[3px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
        {topLeft && <div className="absolute top-3 left-3 flex gap-2">{topLeft}</div>}
        {topRight && <div className="absolute top-3 right-3">{topRight}</div>}
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <div className="max-w-md">
            <div className="eyebrow !text-gold">{needs === 'platinum' ? 'Multi feature table' : mode === 'live' ? 'Live streaming' : 'Full replays'}</div>
            <div className="display mt-2 text-xl sm:text-2xl">Included with {plan.name}</div>
            <p className="mt-2 hidden text-[13px] text-muted sm:block">
              {needs === 'platinum'
                ? 'Platinum lets you pick any feature table while several are live. Chip counts and hand history stay open below.'
                : 'Chip counts, hand history and key hands stay free below. Subscribe to watch the table itself.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to={`/subscribe?plan=${needs}&next=${encodeURIComponent(loc.pathname)}`} className="btn btn-gold">Subscribe via GGPass · {plan.price}</Link>
              <Link to="/hands" className="btn">Free highlights</Link>
            </div>
          </div>
        </div>
        {bottom}
      </div>
    );
  }

  const toggle = () => {
    const v = ref.current!;
    if (v.paused) v.play();
    else v.pause();
  };
  const seek = (d: number) => {
    const v = ref.current!;
    v.currentTime = Math.max(offset, Math.min(v.duration - 1, v.currentTime + d));
    if (mode === 'live') setBehind((b) => Math.max(0, b - d));
  };
  const elapsed = Math.max(0, t - offset);
  const total = clipLen || Math.max(1, dur - offset);

  return (
    <div ref={wrap} className={`group relative aspect-video w-full overflow-hidden bg-black ${className}`}>
      <video
        ref={ref}
        src={nas(src)}
        poster={nas(poster)}
        muted={muted}
        playsInline
        loop={mode === 'live'}
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setFailed(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={toggle}
        onTimeUpdate={(e) => {
          const ct = e.currentTarget.currentTime;
          setT(ct);
          if (clipLen && ct > offset + clipLen) e.currentTarget.currentTime = offset;
          onProgress?.(ct - offset);
        }}
      />
      {/* If this browser can't play the footage, the still stands in so the frame never goes black. */}
      {failed && <img src={nas(poster)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      {topLeft && <div className="absolute top-3 left-3 flex flex-wrap gap-2">{topLeft}</div>}
      {topRight && <div className="absolute top-3 right-3">{topRight}</div>}
      {center && !askResume && <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">{center}</div>}

      {askResume && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <button
              className="btn btn-gold min-w-44 justify-center"
              onClick={() => {
                const v = ref.current!;
                v.currentTime = offset + (resumeAt ?? 0);
                v.play();
                setAskResume(false);
              }}
            >
              ▶ Resume ({mmss(resumeAt ?? 0)})
            </button>
            <button
              className="text-[13px] font-semibold text-white/90 hover:underline"
              onClick={() => {
                const v = ref.current!;
                v.currentTime = offset;
                v.play();
                setAskResume(false);
              }}
            >
              Start from Beginning
            </button>
          </div>
        </div>
      )}
      {!playing && !askResume && (
        <button aria-label="Play" onClick={toggle} className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-black/40 text-2xl">
          ▶
        </button>
      )}

      {cc && <div className="absolute inset-x-0 bottom-16 text-center"><span className="bg-black/80 px-2 py-1 text-[14px]">[Commentary] Negreanu thinking it over… this could be for his tournament life.</span></div>}

      <div className="absolute inset-x-0 bottom-0 px-3 pb-2">
        {bottom}
        {mode !== 'live' && (
          <div
            className="relative mb-1.5 h-1 cursor-pointer rounded bg-white/25"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              ref.current!.currentTime = offset + ((e.clientX - r.left) / r.width) * total;
            }}
          >
            <div className="h-full rounded bg-red" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} />
          </div>
        )}
        <div className="flex items-center gap-3 text-[13px]">
          <button aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className="w-5 text-center">{playing ? '❚❚' : '▶'}</button>
          {mode === 'live' ? (
            <>
              <button onClick={() => { const v = ref.current!; v.currentTime = offset + (dur - offset) * 0.6; setBehind(0); }} className={`chip ${behind ? 'bg-white/20 text-white' : 'bg-white text-black'}`}>
                <span className="live-dot" style={{ color: behind ? '#aaa' : '#ed1c23' }} /> {behind ? 'Go live' : 'Live'}
              </button>
              <button onClick={() => seek(-30)} className="font-semibold hover:text-white/80">⏮ -30s</button>
              {behind > 0 && <span className="text-[11px] text-muted">{behind}s behind live</span>}
            </>
          ) : (
            <span className="text-[12px] tabular-nums text-white/80">{mmss(elapsed)} / {mmss(total)}</span>
          )}
          <span className="flex-1" />
          <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((m) => !m)}>{muted ? '🔇' : '🔊'}</button>
          <button aria-pressed={cc} onClick={() => setCc((c) => !c)} className={`text-[12px] font-bold ${cc ? 'underline' : ''}`}>CC</button>
          <button aria-label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen())}>⛶</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Demo control (not part of the product) ───────────── */

export function DemoBar() {
  const s = useSession();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed right-3 bottom-3 z-50 text-[12px]">
      {open && (
        <div className="mb-2 w-64 rounded border border-line-strong bg-[#111] p-3 shadow-2xl">
          <div className="eyebrow mb-2">Demo controls</div>
          <div className="mb-1 text-muted">GGPass tier (mock)</div>
          <div className="mb-3 grid grid-cols-3 gap-1">
            {PLANS.map((p) => (
              <button key={p.tier} onClick={() => s.set({ tier: p.tier })} className={`rounded border px-1 py-1 ${s.tier === p.tier ? 'border-white bg-white text-black' : 'border-line'}`}>
                {p.name.replace('GGPass ', '')}
              </button>
            ))}
          </div>
          <div className="mb-1 text-muted">Broadcast state</div>
          <div className="mb-3 grid grid-cols-2 gap-1">
            {[true, false].map((on) => (
              <button key={String(on)} onClick={() => s.set({ onAir: on })} className={`rounded border px-1 py-1 ${s.onAir === on ? 'border-white bg-white text-black' : 'border-line'}`}>
                {on ? 'On air' : 'Off air'}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-subtle">Not connected to AWS, GGPass, WSOP+ or EBS. Players, chip counts, hands and results are sample data.</p>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="rounded-full border border-line-strong bg-[#111] px-3 py-1.5 font-bold tracking-wider shadow-xl">
        DEMO {open ? '×' : '⚙'}
      </button>
    </div>
  );
}

export function Page({ activeId, children }: { activeId?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-dvh pb-16">
      <Ticker activeId={activeId} />
      <main className="mx-auto max-w-[1280px]">{children}</main>
      <footer className="px-4 py-6 text-center text-[11px] text-subtle">
        WSOP TV v9 · Demo · Footage: World Series of Poker archive (2025) · Players, chip counts and results are sample data
      </footer>
      <DemoBar />
    </div>
  );
}
