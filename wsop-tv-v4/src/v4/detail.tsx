// v4 — the shared video card and row, the tag list and the "About" facts.
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { Icon, LiveTag, cx } from '../components/ui';
import { duration } from '../lib/format';
import { artStyle } from '../lib/brand';
import type { ListKind } from '../state/app';
import { isLive, type Video } from './catalog';

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
export function VideoCard({ v, progress, onRemove, className, reason }: { v: Video; progress?: number; /** Continue Watching: show a remove (×) button. */ onRemove?: () => void; className?: string; /** Why it's here, under the title (e.g. "Because you follow …"). */ reason?: string }) {
  const { state } = useApp();
  const live = isLive(v, state.streamMode);
  return (
    <div className={cx('group relative min-w-0', className)}>
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
      <Link to={`/watch/${v.id}`} className="block" aria-label={`Watch ${v.title}`}>
        <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
          <img src={v.thumb} style={artStyle({ pos: v.thumbPos, fit: v.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
          {live && <LiveTag className="absolute top-2 left-2" />}
          {/* Runtime on the artwork (not for live or 24/7 channels, which have no fixed length). */}
          {!live && v.kind !== 'channel' && <span className="absolute right-2 bottom-2 rounded-[4px] bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white tnum">{duration(v.durationSec)}</span>}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden>
            <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white">
              <Icon name="play" size={22} />
            </span>
          </span>
          {progress !== undefined && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <i className="block h-full bg-gold" style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} />
            </span>
          )}
        </span>
      </Link>
      <Link to={`/watch/${v.id}`} className="mt-2 block min-w-0">
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold group-hover:text-gold-strong">{v.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{v.subtitle}</span>
        {reason && <span className="mt-1 block truncate text-xs font-semibold text-gold-strong">{reason}</span>}
      </Link>
    </div>
  );
}

export const rowGrid = 'grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4';

export function VideoRow({ title, videos, action, progressOf, onRemove }: { title: string; videos: Video[]; action?: ReactNode; progressOf?: (v: Video) => number | undefined; onRemove?: (v: Video) => void }) {
  if (!videos.length) return null;
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {action}
      </div>
      <div className={rowGrid}>
        {videos.slice(0, 4).map((v) => (
          <VideoCard key={v.id} v={v} progress={progressOf?.(v)} onRemove={onRemove && (() => onRemove(v))} />
        ))}
      </div>
    </section>
  );
}
