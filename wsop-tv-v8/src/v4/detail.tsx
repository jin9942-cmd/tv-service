// v4 — the shared video card and row, the tag list and the "About" facts.
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { Icon, LiveTag, cx } from '../components/ui';
import { duration } from '../lib/format';
import { artStyle } from '../lib/brand';
import type { ListKind } from '../state/app';
import { badgeFor, type Badge, type Video } from './catalog';
import { useMyList } from '../features/library/listActions';

/** My List kind for a video (broadcasts and classics are saved as broadcast days, clips as hands). */
export const listKind = (v: Video): ListKind => (v.kind === 'clip' ? 'hand' : 'day');

/** Meta tags: each opens the page of videos with that tag. */
export function TagList({ v, className }: { v: Video; className?: string }) {
  return (
    <ul className={cx('flex flex-wrap content-start gap-2', className)} aria-label="Tags">
      {v.tags.map((t) => (
        <li key={t.slug}>
          <Link to={`/tag/${t.slug}`} className="inline-flex h-8 items-center rounded-full border border-line-strong px-3 text-[13px] font-medium text-text/85 hover:border-text hover:text-text">
            #{t.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The "About this broadcast" facts grid (kept from v3). */
export function About({ v }: { v: Video }) {
  return (
    <section aria-label="About">
      <h3 className="mb-2 text-base font-bold">{v.kind === 'clip' ? 'About this hand' : 'About this broadcast'}</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {v.about.map(([k, val]) => (
          <div key={k} className="rounded-card border border-line bg-surface-2 px-3 py-2.5">
            <dt className="text-[11px] font-semibold tracking-wide text-subtle uppercase">{k}</dt>
            <dd className="mt-1 text-sm font-bold tnum">{val}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The one card used everywhere: thumbnail (only LIVE on it) and title → play.
 */
/** A thumbnail badge, drawn by the UI over the picture: Live (red), New (white) or Recently added (dark, outlined). */
export function CardBadge({ b, className }: { b: Badge; className?: string }) {
  if (b === 'Live') return <LiveTag className={className} />;
  return (
    <span className={cx('label rounded-[4px] px-1.5 py-0.5 text-[10px]', b === 'New' ? 'bg-white text-black' : 'bg-black/75 text-white ring-1 ring-white/50', className)}>
      {b === 'New' ? 'New' : 'Recently added'}
    </span>
  );
}

/** The one "newness" badge a row may show (New or Recently Added); undefined outside a row. */
const RowBadge = createContext<Badge | null | undefined>(undefined);
/**
 * A row (or grid) of cards shows one kind of newness badge only, never New and Recently added side by side:
 * the first of the two that its videos carry. Live always shows.
 */
export function BadgeScope({ videos, children }: { videos: Video[]; children: ReactNode }) {
  const { state } = useApp();
  const first = videos.map((v) => badgeFor(v, state.streamMode)).find((b) => b === 'New' || b === 'Recently Added') ?? null;
  return <RowBadge.Provider value={first}>{children}</RowBadge.Provider>;
}

/** Card sizes by content type: lg = replays (3 a row), md = the standard card (4), sm = highlights (5). */
export type CardSize = 'lg' | 'md' | 'sm';

/**
 * The video card. Over the picture: the badge (Live / New / Recently added), the runtime, and on hover a short muted
 * preview with two controls only, Play and Add to My List.
 */
export function VideoCard({ v, progress, onRemove, className, reason, size = 'md', href, onOpen }: { v: Video; progress?: number; /** Continue Watching: show a remove (×) button. */ onRemove?: () => void; className?: string; /** Why it's here, under the title (e.g. "Because you follow …"). */ reason?: string; size?: CardSize; /** Where the card goes (default: the video's page). */ href?: string; /** Runs on click before the link opens (e.g. enter full screen). */ onOpen?: () => void }) {
  const { state } = useApp();
  const list = useMyList();
  const own = badgeFor(v, state.streamMode);
  const rowBadge = useContext(RowBadge);
  // Inside a row, only that row's newness badge shows (Live always does).
  const badge = own === 'Live' || rowBadge === undefined || own === rowBadge ? own : null;
  const live = own === 'Live';
  const kind = listKind(v);
  const saved = list.has(kind, v.id);
  // Preview: after a short hover (mouse only), the clip plays muted inside the thumbnail.
  const [preview, setPreview] = useState(false);
  const timer = useRef(0);
  const enter = () => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    timer.current = window.setTimeout(() => setPreview(true), 700);
  };
  const leave = () => {
    window.clearTimeout(timer.current);
    setPreview(false);
  };
  const round = 'grid size-9 place-items-center rounded-full shadow-lg transition-transform hover:scale-105';
  const to = href ?? `/watch/${v.id}`;
  return (
    <div className={cx('group relative min-w-0', className)} onMouseEnter={enter} onMouseLeave={leave}>
      <div className="relative aspect-video overflow-hidden rounded-card bg-surface-2">
        <Link to={to} onClick={onOpen} className="absolute inset-0 block" aria-label={`Watch ${v.title}`}>
          <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
          {preview && v.media && <video src={`${v.media.url}#t=${v.media.start}`} muted autoPlay playsInline loop className="absolute inset-0 size-full object-cover" aria-hidden />}
        </Link>
        {badge && <CardBadge b={badge} className="pointer-events-none absolute top-2 left-2" />}
        {/* Runtime on the artwork (not for live or 24/7 channels, which have no fixed length). */}
        {!live && v.kind !== 'channel' && <span className="pointer-events-none absolute right-2 bottom-2 rounded-[4px] bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white tnum">{duration(v.durationSec)}</span>}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${v.title} from Continue Watching`}
            title="Remove from Continue Watching"
            className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-black focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Icon name="close" size={16} />
          </button>
        )}
        {/* Hover controls: Play and Add to My List only. */}
        <div className="absolute bottom-2 left-2 z-10 flex gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <Link to={to} onClick={onOpen} aria-label={`Play ${v.title}`} title="Play" className={cx(round, 'bg-white text-black')}>
            <Icon name="play" size={16} />
          </Link>
          {v.kind !== 'channel' && (
            <button onClick={() => list.toggle(kind, v.id)} aria-pressed={saved} aria-label={saved ? 'Remove from My List' : 'Add to My List'} title={saved ? 'In My List' : 'Add to My List'} className={cx(round, 'border border-white/70 bg-black/60 text-white')}>
              <Icon name={saved ? 'check' : 'plus'} size={16} />
            </button>
          )}
        </div>
        {progress !== undefined && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <i className="block h-full bg-gold" style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} />
          </span>
        )}
      </div>
      <Link to={to} onClick={onOpen} className="mt-2 block min-w-0">
        <span className={cx('line-clamp-2 leading-snug font-semibold group-hover:text-gold-strong', size === 'lg' ? 'text-base' : size === 'sm' ? 'text-sm' : 'text-[15px]')}>{v.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{v.subtitle}</span>
        {reason && <span className="mt-1 block truncate text-xs font-semibold text-gold-strong">{reason}</span>}
      </Link>
    </div>
  );
}

export const rowGrid = 'grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4';
/** Grid and count per card size. */
export const SIZE_GRID: Record<CardSize, { grid: string; count: number }> = {
  lg: { grid: 'grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3', count: 3 },
  md: { grid: rowGrid, count: 4 },
  sm: { grid: 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5', count: 5 },
};

export function VideoRow({ title, videos, action, progressOf, onRemove, size = 'md' }: { title: string; videos: Video[]; action?: ReactNode; progressOf?: (v: Video) => number | undefined; onRemove?: (v: Video) => void; size?: CardSize }) {
  if (!videos.length) return null;
  const g = SIZE_GRID[size];
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {action}
      </div>
      <BadgeScope videos={videos.slice(0, g.count)}>
        <div className={g.grid}>
          {videos.slice(0, g.count).map((v) => (
            <VideoCard key={v.id} v={v} size={size} progress={progressOf?.(v)} onRemove={onRemove && (() => onRemove(v))} />
          ))}
        </div>
      </BadgeScope>
    </section>
  );
}
