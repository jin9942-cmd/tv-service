// v4 — the detail popup (Netflix-style layer over the current page; no navigation) and the shared video card.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../state/app';
import { Button, Icon, LiveTag, cx } from '../components/ui';
import { duration } from '../lib/format';
import { MyListButton } from '../features/library/listActions';
import type { ListKind } from '../state/app';
import { episodesOf, isLive, relatedTo, videoById, type Video } from './catalog';

const DetailCtx = createContext<{ open: (id: string) => void }>({ open: () => {} });
export const useDetail = () => useContext(DetailCtx);

/** My List kind for a video (broadcasts and classics are saved as broadcast days, clips as hands). */
export const listKind = (v: Video): ListKind => (v.kind === 'clip' ? 'hand' : 'day');

export function DetailProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const loc = useLocation();
  // Following a link inside the popup (Watch, a tag) closes it.
  useEffect(() => setId(null), [loc.pathname]);
  const open = useCallback((x: string) => setId(x), []);
  return (
    <DetailCtx.Provider value={{ open }}>
      {children}
      {id && <DetailModal id={id} onClose={() => setId(null)} onOpen={setId} />}
    </DetailCtx.Provider>
  );
}

function DetailModal({ id, onClose, onOpen }: { id: string; onClose: () => void; onOpen: (id: string) => void }) {
  const { state } = useApp();
  const v = videoById(id);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  // Braces matter: scrollTo now returns a promise in Chromium, and an effect may only return a cleanup function.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [id]);
  if (!v) return null;
  const live = isLive(v, state.streamMode);
  const episodes = episodesOf(v);
  const more = relatedTo(v, 6);
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-hidden bg-black/75 sm:py-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={v.title} className="relative h-full w-full max-w-[56rem] overflow-y-auto bg-surface shadow-2xl outline-none sm:h-auto sm:max-h-full sm:rounded-panel">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black">
          <Icon name="close" size={18} />
        </button>
        <div className="relative aspect-video w-full overflow-hidden">
          <img src={v.thumb} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            {live && <LiveTag className="mb-2" />}
            <h2 className="max-w-2xl text-[1.9rem] leading-[1.05] sm:text-[2.6rem]">{v.title}</h2>
            <div className="mt-4 flex gap-2">
              <Link to={`/watch/${v.id}`}>
                <Button variant="primary" size="lg" tabIndex={-1}>
                  <Icon name="play" size={18} /> Watch
                </Button>
              </Link>
              {v.kind !== 'channel' && <MyListButton kind={listKind(v)} id={v.id} size="lg" />}
            </div>
          </div>
        </div>
        <div className="space-y-8 p-5 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <p className="text-sm text-muted">
                {v.subtitle} · {duration(v.durationSec)}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-text/85">{v.description}</p>
            </div>
            <TagList v={v} />
          </div>

          <About v={v} />

          {episodes.length > 1 && (
            <section aria-label="Episodes">
              <h3 className="mb-3 text-lg font-bold">Episodes</h3>
              <ol className="divide-y divide-line rounded-card border border-line">
                {episodes.map((x, i) => (
                  <li key={x.id}>
                    <Link to={`/watch/${x.id}`} className={cx('flex items-center gap-4 p-3 hover:bg-surface-2', x.id === v.id && 'bg-surface-2')}>
                      <span className="w-5 text-center text-lg font-bold text-subtle tnum">{i + 1}</span>
                      <img src={x.thumb} alt="" className="aspect-video w-28 shrink-0 rounded-chip object-cover sm:w-36" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{x.title.split(' · ').pop()}</span>
                          {isLive(x, state.streamMode) && <LiveTag />}
                        </span>
                        <span className="block text-xs text-muted tnum">{duration(x.durationSec)}</span>
                      </span>
                      <Icon name="play" size={18} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {more.length > 0 && (
            <section aria-label="More like this">
              <h3 className="mb-3 text-lg font-bold">More like this</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {more.map((x) => (
                  <button key={x.id} onClick={() => onOpen(x.id)} className="group overflow-hidden rounded-card bg-surface-2 text-left">
                    <span className="relative block aspect-video">
                      <img src={x.thumb} alt="" className="absolute inset-0 size-full object-cover" />
                      {isLive(x, state.streamMode) && <LiveTag className="absolute top-2 left-2" />}
                    </span>
                    <span className="block p-2.5">
                      <span className="line-clamp-2 text-sm font-semibold group-hover:text-gold-strong">{x.title}</span>
                      <span className="block truncate text-xs text-muted">{x.subtitle}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

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
 * The one card used everywhere: thumbnail (only LIVE on it) and title → play. The detail popup opens only from the home banner.
 */
export function VideoCard({ v, progress, className }: { v: Video; progress?: number; className?: string }) {
  const { state } = useApp();
  const live = isLive(v, state.streamMode);
  return (
    <div className={cx('group relative min-w-0', className)}>
      <Link to={`/watch/${v.id}`} className="block" aria-label={`Watch ${v.title}`}>
        <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-2">
          <img src={v.thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
          {live && <LiveTag className="absolute top-2 left-2" />}
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
      </Link>
    </div>
  );
}

export const rowGrid = 'grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4';

export function VideoRow({ title, videos, action, progressOf }: { title: string; videos: Video[]; action?: ReactNode; progressOf?: (v: Video) => number | undefined }) {
  if (!videos.length) return null;
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {action}
      </div>
      <div className={rowGrid}>
        {videos.slice(0, 4).map((v) => (
          <VideoCard key={v.id} v={v} progress={progressOf?.(v)} />
        ))}
      </div>
    </section>
  );
}
