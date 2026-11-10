// v7 — the content loop: video → event → player → another event → video.
//
// One list template for events everywhere (series pages, other years of an event): one row per bracelet event,
// newest first, and every row has three ways on — play its final table, open the event, open the winner.
import { Link } from 'react-router-dom';
import { Icon, LiveTag, cx } from '../components/ui';
import { events, players, seriesById } from '../data/mock';
import type { TourEvent } from '../data/types';
import { money } from '../lib/format';
import { artStyle } from '../lib/brand';
import { ARCHIVE, LEGENDS, RECURRING, archiveEvent, broadcastsOf, chronicle, fmtBuyIn, type ArchiveEvent, type ArchiveSeries } from './archive';
import { catalog, type Video } from './catalog';

/** One event, whichever data it comes from (the live 2025 series or the archive). */
export interface EventItem {
  id: string;
  /** The event page. */
  to: string;
  name: string;
  year: number;
  number: number | null;
  /** ISO date the winner was decided (known for the live series; the archive has none). */
  date?: string;
  buyLabel: string;
  game: string;
  entrants?: number;
  firstPrize?: number;
  broadcasts: number;
  live?: boolean;
  winner?: { name: string; to?: string };
  /** Its final table (plays straight away). */
  final?: Video;
}

const enterFullScreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
};
const short = (n: number) => (n >= 1e6 ? `$${+(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

/** A player's page, when there is one: a player of the demo data, or a bracelet legend. */
export function playerLink(name: string): string | undefined {
  const p = players.find((x) => x.name === name);
  if (p) return `/videos/players/${p.id}`;
  const l = LEGENDS.find((x) => x.name === name);
  return l ? `/videos/players/${l.playerId ?? l.id}` : undefined;
}

/** An event of the live series as a list item. */
export function liveItem(e: TourEvent): EventItem {
  const days = catalog.filter((v) => v.eventId === e.id && (v.kind === 'broadcast' || v.kind === 'classic'));
  const final = days.find((v) => /Final Table/.test(v.title) || v.kind === 'classic');
  const ft = e.days.find((d) => d.label === 'Final Table');
  const winner = e.winnerId ? players.find((p) => p.id === e.winnerId) : undefined;
  return {
    id: e.id,
    to: `/events/${e.id}`,
    name: e.name.replace(' World Championship', ''),
    year: Number(seriesById(e.seriesId).name.slice(0, 4)),
    number: e.number || null,
    date: ft?.start,
    buyLabel: e.buyIn ? money(e.buyIn) : 'Invitational',
    game: e.game,
    entrants: e.entrants || undefined,
    firstPrize: e.firstPrize || undefined,
    broadcasts: days.length,
    live: e.days.some((d) => d.status === 'live'),
    winner: winner && { name: winner.name, to: `/videos/players/${winner.id}` },
    final,
  };
}

/** An archive event as a list item (the archive knows its Main Event champions only). */
export function archiveItem(year: number, s: ArchiveSeries, e: ArchiveEvent): EventItem {
  const ref = archiveEvent(e.id);
  const all = ref ? broadcastsOf(ref) : [];
  const fi = e.days.findIndex((d) => /final/i.test(d.label));
  const y = ARCHIVE.find((x) => x.year === year);
  const champ = e.kind === 'Main Event' && s.key === 'lv' ? y?.champion : null;
  return {
    id: e.id,
    to: `/videos/event/${e.id}`,
    name: e.name,
    year,
    number: e.number,
    buyLabel: fmtBuyIn(e) || '—',
    game: e.game,
    broadcasts: e.days.length,
    winner: champ ? { name: champ.name, to: playerLink(champ.name) } : undefined,
    final: fi >= 0 ? all[fi] : all[all.length - 1],
  };
}

/** Newest first: live ones on top, then by the day the winner was decided, else by event number. */
export const newestFirst = (a: EventItem, b: EventItem) =>
  Number(!!b.live) - Number(!!a.live) || b.year - a.year || (b.date && a.date ? Date.parse(b.date) - Date.parse(a.date) : (b.number ?? -1) - (a.number ?? -1));

/** The event list: one row per event, three ways on (play · event · winner). */
export function EventRows({ items, showYear }: { items: EventItem[]; showYear?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
      {items.map((x) => (
        <li key={x.id} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-4 p-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:p-4">
          {/* 1. play the final table */}
          {x.final ? (
            <Link to={x.live ? `/watch/${x.final.id}` : `/watch/${x.final.id}?play=1`} onClick={x.live ? undefined : enterFullScreen} className="group relative block aspect-video overflow-hidden rounded-card bg-surface-2" aria-label={`Play ${x.name} final table`}>
              <img src={x.final.thumb} style={artStyle({ pos: x.final.thumbPos, fit: x.final.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
              <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                <span className="grid size-9 place-items-center rounded-full bg-white/90 text-black">
                  <Icon name="play" size={16} />
                </span>
              </span>
              {x.live && <LiveTag className="absolute top-1.5 left-1.5" />}
            </Link>
          ) : (
            <span className="block aspect-video rounded-card bg-surface-2" aria-hidden />
          )}
          {/* 2. the event */}
          <div className="min-w-0">
            <p className="text-xs text-muted tnum">
              {[showYear ? String(x.year) : '', x.date ? dateLabel(x.date) : '', x.number ? `#${x.number}` : ''].filter(Boolean).join(' · ')}
            </p>
            <Link to={x.to} className="mt-0.5 block truncate text-[15px] font-bold hover:underline hover:decoration-2 hover:underline-offset-4">
              {x.name}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted tnum">
              {[x.buyLabel, x.game, x.entrants ? `${x.entrants.toLocaleString('en-US')} entries` : '', x.firstPrize ? `${short(x.firstPrize)} to the winner` : ''].filter(Boolean).join(' · ')}
            </p>
            {/* 3. the winner (small screens: under the event) */}
            <p className="mt-1 text-sm sm:hidden">
              <WinnerText x={x} />
            </p>
          </div>
          <div className="hidden min-w-48 flex-col items-end gap-1 text-right sm:flex">
            <span className="text-sm">
              <WinnerText x={x} />
            </span>
            <Link to={x.to} className="text-xs font-semibold text-muted hover:text-text">
              {x.broadcasts} broadcast{x.broadcasts === 1 ? '' : 's'} →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function WinnerText({ x }: { x: EventItem }) {
  if (x.live) return <span className="font-semibold">On air now</span>;
  if (!x.winner) return <span className="text-muted">Winner —</span>;
  return (
    <>
      <span className="text-muted">Winner · </span>
      {x.winner.to ? (
        <Link to={x.winner.to} className={cx('font-semibold text-gold-strong hover:underline')}>
          {x.winner.name}
        </Link>
      ) : (
        <span className="font-semibold">{x.winner.name}</span>
      )}
    </>
  );
}

/**
 * The same event in other years (a recurring event: the Main Event, the PPC, …): the live year first, then the
 * archive, newest first. `name`/`kind`/`seriesKey` identify the event; `skip` is the event shown on the page.
 */
export function otherYears(name: string, kind: ArchiveEvent['kind'], seriesKey: string, skip: string): EventItem[] {
  const probe = { name, kind } as ArchiveEvent;
  const r = RECURRING.find((x) => x.match(probe, { key: seriesKey } as ArchiveSeries));
  if (!r) return [];
  const live = events.filter((e) => r.match({ name: e.name, kind: /main event/i.test(e.name) ? 'Main Event' : 'Open' } as ArchiveEvent, { key: 'lv' } as ArchiveSeries)).map(liveItem);
  const past = chronicle(r.slug)
    .filter((x) => x.year.year < (live[0]?.year ?? 9999))
    .map((x) => archiveItem(x.year.year, x.series, x.event));
  return [...live, ...past].filter((x) => x.id !== skip).sort(newestFirst);
}

/** The same event in other years, as event rows with the year. */
export function OtherYearsSection({ items }: { items: EventItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-label="From the archive">
      <h2 className="mb-3 text-xl sm:text-2xl">From the archive</h2>
      <EventRows items={items.slice(0, 8)} showYear />
    </section>
  );
}

/** An event as a tile (F1 TV's Grand Prix card): its final table picture, number and date, name, buy-in, winner. */
export function EventTile({ x }: { x: EventItem }) {
  return (
    <Link to={x.to} className="group block h-full overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-white/40">
      <span className="relative block aspect-video overflow-hidden bg-surface-2">
        {x.final && <img src={x.final.thumb} style={artStyle({ pos: x.final.thumbPos, fit: x.final.thumbFit })} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />}
        {x.live && <LiveTag className="absolute top-2 left-2" />}
      </span>
      <span className="block p-3">
        <span className="block text-xs text-muted tnum">{[x.number ? `Event #${x.number}` : '', x.date ? dateLabel(x.date) : ''].filter(Boolean).join(' · ') || ' '}</span>
        <span className="mt-1 line-clamp-2 min-h-[2.5em] text-[15px] leading-tight font-bold group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">{x.name}</span>
        <span className="mt-1 block truncate text-xs text-muted tnum">{[x.buyLabel, x.game].filter(Boolean).join(' · ')}</span>
        <span className="mt-2 block truncate border-t border-line pt-2 text-xs">{x.live ? <span className="font-semibold">On air now</span> : x.winner ? <><span className="text-muted">Winner · </span><span className="font-semibold">{x.winner.name}</span></> : <span className="text-muted">{x.broadcasts} broadcast{x.broadcasts === 1 ? '' : 's'}</span>}</span>
      </span>
    </Link>
  );
}

/** Schedule order (F1 TV lists a season by round): event number, then date. */
export const scheduleOrder = (a: EventItem, b: EventItem) => (a.number ?? 999) - (b.number ?? 999) || (a.date && b.date ? Date.parse(a.date) - Date.parse(b.date) : 0);

/** The broadcast days of an event as a schedule strip (F1 TV's weekend schedule): a chip a day, each plays it. */
export function DaySchedule({ videos, isLiveNow }: { videos: Video[]; isLiveNow: (v: Video) => boolean }) {
  if (videos.length < 2) return null;
  const label = (v: Video) => v.title.split(' · ').pop() ?? v.title;
  const hm = (s: number) => `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, '0')}`;
  return (
    <section aria-label="Schedule">
      <h2 className="mb-3 text-xl sm:text-2xl">Schedule</h2>
      <ol className="hscroll gap-2">
        {videos.map((v) => {
          const live = isLiveNow(v);
          return (
            <li key={v.id} className="shrink-0">
              <Link
                to={live ? `/watch/${v.id}` : `/watch/${v.id}?play=1`}
                onClick={live ? undefined : enterFullScreen}
                className={cx('flex min-w-36 flex-col gap-1 rounded-card border px-3.5 py-2.5 transition-colors', live ? 'border-live bg-live/10' : 'border-line bg-surface hover:border-white/40')}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  {live ? <LiveTag /> : <Icon name="play" size={12} />}
                  {label(v)}
                </span>
                <span className="text-xs text-muted tnum">{live ? 'On air now' : hm(v.durationSec)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
