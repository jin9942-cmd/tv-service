// Reusable UI primitives. All colours come from the design tokens in styles/theme.css.
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Access, StreamStatus } from '../data/types';
import { initials } from '../lib/format';
import { useApp } from '../state/app';
import { TIER_BADGE, requiredTier, type Tier } from '../data/policy';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

// ---- button ---------------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-chip font-semibold whitespace-nowrap transition-[background,color,border-color,transform] duration-150 active:scale-[0.98] disabled:opacity-45',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        variant === 'primary' && 'bg-gold text-ink hover:bg-gold-strong',
        variant === 'secondary' && 'bg-surface-3 text-text hover:bg-line-strong',
        variant === 'outline' && 'border border-line-strong text-text hover:border-gold hover:text-gold-strong',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-text',
        className,
      )}
    />
  );
}

// ---- status badges -----------------------------------------------------------------------

export function StatusBadge({ status, delayMin = 30, size = 'md' }: { status: StreamStatus; delayMin?: number; size?: 'sm' | 'md' }) {
  const base = cx('label inline-flex shrink-0 items-center gap-1.5 rounded-[4px] whitespace-nowrap tnum', size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1');
  if (status === 'live')
    return (
      <span className={cx(base, 'bg-live text-white')}>
        <i className="live-dot size-1.5 rounded-full bg-white" aria-hidden /> Live
      </span>
    );
  if (status === 'delayed')
    return (
      <span className={cx(base, 'bg-delayed text-ink')} title={`Broadcast delayed by ${delayMin} minutes for competition integrity`}>
        <i className="size-1.5 rounded-full bg-ink" aria-hidden /> Delayed {delayMin} min
      </span>
    );
  if (status === 'upcoming') return <span className={cx(base, 'border border-line-strong text-muted')}>Upcoming</span>;
  if (status === 'late')
    return (
      <span className={cx(base, 'border border-delayed bg-black/50 text-delayed')} title="The broadcast hasn't started at its scheduled time">
        Late start
      </span>
    );
  if (status === 'interrupted')
    return (
      <span className={cx(base, 'border border-live bg-black/50 text-live')} title="The broadcast is temporarily off air">
        Interrupted
      </span>
    );
  return <span className={cx(base, 'bg-surface-3 text-muted')}>VOD</span>;
}

// ---- access badges (who can play this) -------------------------------------------------------

const TIER_TITLE: Record<Tier, string> = {
  free: 'Free to watch — no account needed',
  wsopFree: 'Included with WSOP+ Free — every GGPass account',
  basic: 'Included with WSOP+ Basic and above',
  premium: 'Included with WSOP+ Premium',
};

/**
 * Content-level access badge: the WSOP+ tier this content needs (depends on the "WSOP TV included from" setting;
 * `live` matters for the Split setting). `locked` adds a lock when the current viewer can't play it yet.
 */
export function AccessBadge({ access, locked, size = 'sm', live, onArt }: { access: Access; locked?: boolean; size?: 'sm' | 'md'; live?: boolean; onArt?: boolean }) {
  const { state } = useApp();
  const tier = requiredTier(access, state.includedFrom, live);
  // On thumbnails, only say something useful: "Free", or what the viewer still needs (with a lock).
  if (onArt && !locked && tier !== 'free') return null;
  return (
    <span
      title={TIER_TITLE[tier]}
      className={cx(
        'label inline-flex items-center gap-1 rounded-[4px] border bg-black/70 whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1',
        tier === 'free' && 'border-ok/60 text-ok',
        tier === 'wsopFree' && 'border-line-strong text-text',
        tier === 'basic' && 'border-gold/60 text-gold-strong',
        tier === 'premium' && 'border-gold bg-gold/20 text-gold-strong',
      )}
    >
      {locked && tier !== 'free' && <Icon name="lock" size={size === 'sm' ? 10 : 12} />}
      {TIER_BADGE[tier]}
    </span>
  );
}

// ---- bracelet (hand-drawn SVG, not an emoji) ---------------------------------------------------

export function BraceletIcon({ size = 18, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cx('shrink-0 text-gold', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <ellipse cx="12" cy="13" rx="9" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="12" cy="13" rx="5.6" ry="3.2" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <rect x="8.6" y="4.4" width="6.8" height="4.6" rx="1.3" fill="currentColor" />
      <rect x="10.4" y="5.6" width="3.2" height="2.2" rx="0.6" fill="var(--color-bg)" />
    </svg>
  );
}

export function BraceletCount({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 tnum" aria-label={`${n} bracelets`}>
      <BraceletIcon size={size} />
      <b className="font-bold">{n}</b>
    </span>
  );
}

// ---- icons ------------------------------------------------------------------------------

const PATHS: Record<string, string> = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  back10: 'M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
  fwd10: 'M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z',
  volume: 'M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z',
  mute: 'M4 9v6h4l5 4V5L8 9zm12 0 5 6m0-6-5 6',
  cc: 'M3 5h18v14H3zM9.5 10.2A2 2 0 1 0 9.5 13.8M16 10.2a2 2 0 1 0 0 3.6',
  audio: 'M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8.4 3-.1-1 2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1L16 3h-4l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L7.7 11l-.1 1 .1 1-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1L12 21h4l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  prev: 'M6 5h2v14H6zm3 7 9 7V5z',
  next: 'M16 5h2v14h-2zM6 5v14l9-7z',
  search: 'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  bell: 'M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0z',
  check: 'M5 12l5 5L20 7',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5 8 12l7 7',
  tv: 'M3 5h18v12H3zM8 21h8M12 17v4',
  grid1: 'M4 4h16v16H4z',
  grid2: 'M3 6h8.5v12H3zM12.5 6H21v12h-8.5z',
  grid4: 'M3 3h8.5v8.5H3zM12.5 3H21v8.5h-8.5zM3 12.5h8.5V21H3zM12.5 12.5H21V21h-8.5z',
  calendar: 'M7 3v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2v2H9V3zM5 10h14v9H5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0z',
  eye: 'M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5',
  plus: 'M12 5v14M5 12h14',
  more: 'M4 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  card: 'M3 6h18v12H3zM3 10h18',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
};
const STROKE = new Set(['plus', 'history', 'card', 'shield', 'check', 'close', 'chevron', 'back', 'full', 'tv', 'audio', 'mute', 'cc', 'globe', 'calendar', 'menu', 'layers', 'grid1', 'grid2', 'grid4']);

export function Icon({ name, size = 20, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  const stroke = STROKE.has(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cx('shrink-0', className)}>
      <path d={PATHS[name]} fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'} strokeWidth={stroke ? 2 : 0} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- avatar (initials, no photos) ------------------------------------------------------------

/** Initials avatar. `vivid` = solid player colour with a thin outer ring (v1 "Featured players" look). */
export function Avatar({ name, hue, size = 48, ring, vivid }: { name: string; hue: number; size?: number; ring?: boolean; vivid?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none',
        vivid ? 'text-white shadow-[0_0_0_3px_var(--color-bg),0_0_0_4px_var(--color-line-strong)]' : 'text-white/90',
        ring && 'ring-2 ring-gold ring-offset-2 ring-offset-bg',
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * (vivid ? 0.38 : 0.36),
        background: vivid ? `hsl(${hue} 48% 52%)` : `linear-gradient(140deg, hsl(${hue} 22% 34%), hsl(${hue} 18% 16%))`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function CountryCode({ cc }: { cc: string }) {
  return <span className="label rounded-[3px] border border-line-strong px-1 text-[10px] text-muted">{cc}</span>;
}

// ---- section header ------------------------------------------------------------------------

export function SectionHeader({ title, kicker, action }: { title: ReactNode; kicker?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {kicker && <p className="label mb-1 text-gold">{kicker}</p>}
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ---- segmented control / chips / switch ---------------------------------------------------------

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: { value: T; label: ReactNode; disabled?: boolean; title?: string }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-chip bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-[5px] font-semibold transition-colors duration-150',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
            o.value === value ? 'bg-surface-3 text-text' : 'text-muted hover:text-text',
            o.disabled && 'opacity-40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FilterChip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={cx('h-8 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150', on ? 'border-gold bg-gold-dim text-gold-strong' : 'border-line-strong text-muted hover:text-text')}
    >
      {children}
    </button>
  );
}

export function Switch({ on, onChange, label, description }: { on: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span>
        <span id={id} className="block text-sm font-semibold">
          {label}
        </span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <button role="switch" aria-checked={on} aria-labelledby={id} onClick={() => onChange(!on)} className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-gold' : 'bg-surface-3')}>
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white transition-transform duration-200', on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

// ---- spoiler guard ------------------------------------------------------------------------

/** Blurs content in spoiler-free mode with a "Reveal" button. `k` identifies the item so a reveal sticks. */
export function Spoiler({ k, children, label = 'Result hidden', inline }: { k: string; children: ReactNode; label?: string; inline?: boolean }) {
  const { isRevealed, reveal } = useApp();
  if (isRevealed(k)) return <>{children}</>;
  return (
    <span className={cx('relative', inline ? 'inline-flex items-center gap-2' : 'block')}>
      <span className="spoiler" aria-hidden>
        {children}
      </span>
      <span className={cx(inline ? '' : 'absolute inset-0 flex items-center justify-center')}>
        <button type="button" onClick={(e) => (e.preventDefault(), e.stopPropagation(), reveal(k))} className="label inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/90 px-2.5 py-1 text-[10px] text-text hover:border-gold" aria-label={`${label}. Reveal`}>
          <Icon name="eye" size={12} /> Reveal
        </button>
      </span>
    </span>
  );
}

// ---- states -------------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong px-6 py-12 text-center" role="status">
      <Icon name="search" size={28} className="text-subtle" />
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface-2 px-5 py-8 text-center" role="alert">
      <p className="font-semibold">{title}</p>
      {body && <p className="text-sm text-muted">{body}</p>}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
          Retry
        </Button>
      )}
    </div>
  );
}

// ---- modal / bottom sheet -------------------------------------------------------------------

export function Modal({ title, onClose, children, labelledBy, wide }: { title?: string; onClose: () => void; children: ReactNode; labelledBy?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const autoId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, a, input, select, [tabindex]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, [tabindex]:not([tabindex="-1"])')];
        if (!items.length) return;
        const [a, b] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) (e.preventDefault(), b.focus());
        else if (!e.shiftKey && document.activeElement === b) (e.preventDefault(), a.focus());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? autoId : undefined)}
        className={cx('max-h-[92dvh] w-full overflow-y-auto rounded-t-panel border border-line bg-surface p-6 shadow-2xl sm:rounded-panel', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={autoId} className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            <button aria-label="Close" onClick={onClose} className="-m-2 rounded-chip p-2 text-muted hover:text-text">
              <Icon name="close" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---- tabs -----------------------------------------------------------------------------------

export function Tabs<T extends string>({ value, tabs, onChange, label }: { value: T; tabs: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cx('-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150', t.value === value ? 'border-gold text-text' : 'border-transparent text-muted hover:text-text')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Marks a value that isn't decided yet (price, retention, thresholds…). */
export function Placeholder({ className }: { className?: string }) {
  return (
    <span title="Placeholder value — not final" className={cx('label inline-flex items-center rounded-[3px] border border-dashed border-line-strong px-1 py-px align-middle text-[9px] text-subtle', className)}>
      Placeholder
    </span>
  );
}

/** Page wrapper with consistent gutters. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-content px-gutter py-6 sm:px-6 lg:px-8', className)}>{children}</div>;
}
