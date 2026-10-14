// Home billboard brought over from the v1 demo: full-width featured stream (real CC footage), the live channel band
// across its lower edge, and the "Coming up" cards with a large date/time.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Day, TourEvent } from '../data/types';
import { HERO_DAY_ID, HERO_EXPECTED_START, dayById, events, seriesById } from '../data/mock';
import { isBroadcasting, isOnAir, tableDelay, tableStatus } from '../lib/broadcast';
import { count } from '../lib/format';
import { FOOTAGE, HERO_POSTER, frameFrom, tableFrame } from '../lib/media';
import { VENUE_TZ, countdown, fmtCardDate, fmtTime, relative, tzAbbr } from '../lib/time';
import { gateFor, useApp, useTick } from '../state/app';
import { useDayStatus } from './cards';
import { AccessBadge, BraceletIcon, Icon, StatusBadge, cx } from './ui';

export function Billboard() {
  const { state } = useApp();
  const now = useTick(1000);
  const hero = dayById(HERO_DAY_ID)!;
  const status = useDayStatus(hero.day);
  const live = isBroadcasting(status);
  const next = events
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .filter((x) => x.d.status === 'upcoming')
    .sort((a, b) => a.d.start.localeCompare(b.d.start))[0];
  const ev = live ? hero.event : next.e;
  const day = live ? hero.day : next.d;
  const se = seriesById(ev.seriesId);
  const [reduceMotion] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  return (
    <>
      <section className="relative isolate overflow-hidden" aria-label="Featured">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <img src={HERO_POSTER} alt="" className="size-full object-cover object-[center_35%]" />
          {!reduceMotion && <video key={FOOTAGE.ft.id} className="absolute inset-0 size-full object-cover object-[center_35%]" src={`${FOOTAGE.ft.url}#t=110`} poster={HERO_POSTER} muted autoPlay loop playsInline preload="metadata" />}
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
        </div>

        <div className="mx-auto flex min-h-[30rem] max-w-content flex-col justify-end px-gutter pt-16 pb-12 sm:min-h-[34rem] sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="flex flex-wrap items-center gap-2">
              {live ? <StatusBadge status={status} /> : <StatusBadge status="upcoming" />}
              <span className="label text-text/90">{live ? 'Featured now' : 'No live tournaments right now · up next'}</span>
            </p>
            <h1 className="mt-4 text-[2.5rem] leading-[1.02] font-black tracking-[-0.02em] drop-shadow-lg sm:text-display">{ev.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-text/85">
              <span>{se.name}</span>
              <span className="text-subtle">·</span>
              <span className="flex items-center gap-1.5">
                <BraceletIcon size={14} /> Event #{ev.number}
              </span>
              <span className="text-subtle">·</span>
              <span>{day.label}</span>
              {live && ev.remaining > 0 && (
                <>
                  <span className="text-subtle">·</span>
                  <span className="tnum">{count(ev.remaining)} players left</span>
                </>
              )}
            </p>
            {!live && (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-text/80">
                Starts in {countdown(Date.parse(day.start) - now)} — {fmtTime(day.start, state.tz)} your time, {fmtTime(day.start, VENUE_TZ)} in Las Vegas.
              </p>
            )}
            {status === 'late' && <p className="mt-2 text-sm text-delayed">Coverage is starting late — now expected around {fmtTime(HERO_EXPECTED_START, state.tz)} your time.</p>}
            {status === 'interrupted' && <p className="mt-2 text-sm text-live">The broadcast is temporarily off air and resumes automatically.</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={`/watch/${day.id}`} className="inline-flex h-12 items-center gap-2 rounded-chip bg-gold px-6 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-gold-strong">
                <Icon name="play" size={18} /> {live ? (isOnAir(status) ? 'Watch live' : 'Open broadcast') : 'Preview & remind me'}
              </Link>
              <Link to={`/events/${ev.id}`} className="inline-flex h-12 items-center rounded-chip border border-white/25 bg-white/10 px-6 text-[15px] font-bold backdrop-blur transition-colors duration-150 hover:border-gold">
                Key hands
              </Link>
            </div>
          </div>
        </div>
        <p className="absolute right-3 bottom-2 text-[10px] text-white/45">Footage: {FOOTAGE.ft.credit} — real poker footage, not WSOP</p>
      </section>
      <LiveChannels />
    </>
  );
}

/** Every table of every on-air day, main tables first. */
function LiveChannels() {
  const { state } = useApp();
  const days = events.flatMap((e) => e.days.map((d) => ({ e, d }))).filter(({ d }) => isBroadcasting(d.id === HERO_DAY_ID ? state.streamMode : d.status));
  const channels = days.flatMap(({ e, d }) => d.tables.map((t, i) => ({ e, d, t, i })));
  const ordered = [...channels.filter((c) => c.i === 0), ...channels.filter((c) => c.i > 0)];
  return (
    <section className="border-y border-line bg-surface/60" aria-label={ordered.length ? 'Live channels' : 'Schedule'}>
      <div className="mx-auto max-w-content px-gutter py-5 sm:px-6 lg:px-8">
        <p className="label mb-3 text-text/80">{ordered.length ? 'Live channels' : 'Schedule'}</p>
        {ordered.length ? (
          <div className="hscroll">
            {ordered.map(({ e, d, t, i }) => (
              <ChannelCard key={t.id} e={e} d={d} tableIndex={i} />
            ))}
          </div>
        ) : (
          <Link to="/schedule" className="text-sm font-semibold text-gold">
            Nothing on air — open the schedule →
          </Link>
        )}
      </div>
    </section>
  );
}

function ChannelCard({ e, d, tableIndex }: { e: TourEvent; d: Day; tableIndex: number }) {
  const { state } = useApp();
  const dayStatus = useDayStatus(d);
  const t = d.tables[tableIndex];
  const st = tableStatus(t, dayStatus);
  const offline = st === 'late' || st === 'interrupted';
  const access = d.access ?? 'subscriber';
  const locked = gateFor(state.scenario) !== 'ok' && access !== 'free';
  const delay = st === 'delayed' ? tableDelay(t, dayStatus) : 0;
  return (
    <Link to={`/watch/${d.id}`} className="group block w-56 sm:w-60">
      <div className={cx('relative aspect-video overflow-hidden rounded-card border border-line transition-[border-color,transform] duration-200 group-hover:scale-[1.02] group-hover:border-live/70', offline && 'grayscale')}>
        <img src={tableFrame(tableIndex, e.number % 3)} alt="" loading="lazy" className={cx('size-full object-cover', offline && 'opacity-50')} />
        <span className="absolute top-2 left-2">
          <StatusBadge status={st} size="sm" delayMin={delay || 30} />
        </span>
        <span className="absolute top-2 right-2">
          <AccessBadge access={access} locked={locked} />
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold group-hover:text-gold-strong">{e.name.replace(' World Championship', '')}</p>
      <p className="truncate text-xs text-muted">
        {t.name}
        {delay ? ` · ${delay}m delay` : ''}
      </p>
    </Link>
  );
}

/** v1-style upcoming card: still frame with a large date and venue time. */
export function UpcomingCard({ e, d }: { e: TourEvent; d: Day }) {
  const { state } = useApp();
  const now = useTick(60_000);
  return (
    <Link to={`/watch/${d.id}`} className="group block w-64 rounded-card border border-line bg-surface p-2.5 transition-colors duration-150 hover:border-line-strong sm:w-72">
      <div className="relative aspect-video overflow-hidden rounded-[8px]">
        <img src={frameFrom(e.number * 3 + d.label.length)} alt="" loading="lazy" className="size-full object-cover opacity-70 transition-transform duration-200 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <span className="absolute top-2 left-2">
          <StatusBadge status="upcoming" size="sm" />
        </span>
        <span className="absolute bottom-2.5 left-3">
          <span className="label block text-[11px] text-white/85">{fmtCardDate(d.start, VENUE_TZ)}</span>
          <span className="block text-2xl leading-tight font-black tnum">
            {fmtTime(d.start, VENUE_TZ)} {tzAbbr(VENUE_TZ, d.start)}
          </span>
        </span>
      </div>
      <p className="mt-2.5 truncate px-0.5 text-[15px] font-semibold group-hover:text-gold-strong">
        #{e.number} {e.name}
      </p>
      <p className="px-0.5 text-xs text-muted">
        {d.label} · starts {relative(d.start, now)}
      </p>
      <p className="px-0.5 text-xs text-subtle">
        {fmtTime(d.start, state.tz)} {tzAbbr(state.tz, d.start)} your time
      </p>
    </Link>
  );
}
