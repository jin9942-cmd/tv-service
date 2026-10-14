// Schedule in the v1 layout: a venue-calendar date strip, Las Vegas (PT) start times with "your time" alongside,
// one row per broadcast day with status, event number, buy-in and a clear next action.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Day, TourEvent } from '../data/types';
import { HERO_DAY_ID, events, seriesById } from '../data/mock';
import { isBroadcasting, isOnAir, tableDelay } from '../lib/broadcast';
import { money } from '../lib/format';
import { TZ_OPTIONS, VENUE_TZ, browserTz, dayKey, fmtDate, fmtTime, relative, tzAbbr } from '../lib/time';
import { useApp, useTick } from '../state/app';
import { useDayStatus } from '../components/cards';
import { Button, EmptyState, Icon, Page, StatusBadge, cx } from '../components/ui';

const DAYS_BEFORE = 1;
const DAYS_AFTER = 5;
const DAY_MS = 86_400_000;

/** Venue-calendar key shifted by n days. */
const shiftKey = (key: string, n: number) => dayKey(Date.parse(`${key}T12:00:00Z`) + n * DAY_MS, 'UTC');
const keyLabel = (key: string) => {
  const d = new Date(`${key}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(d),
    day: d.getUTCDate(),
    month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(d),
  };
};

export function Schedule() {
  const { state, set } = useApp();
  const all = useMemo(() => events.flatMap((e) => e.days.map((d) => ({ e, d }))).sort((a, b) => a.d.start.localeCompare(b.d.start)), []);
  const today = dayKey(Date.now(), VENUE_TZ);
  const [date, setDate] = useState(today);
  const strip = Array.from({ length: DAYS_BEFORE + DAYS_AFTER + 1 }, (_, i) => shiftKey(today, i - DAYS_BEFORE));
  const datesWithEvents = useMemo(() => [...new Set(all.map((x) => dayKey(x.d.start, VENUE_TZ)))].sort(), [all]);
  // Today also lists anything still on air that started on an earlier venue day.
  const list = all.filter(
    (x) => dayKey(x.d.start, VENUE_TZ) === date || (date === today && dayKey(x.d.start, VENUE_TZ) < today && isBroadcasting(x.d.id === HERO_DAY_ID ? state.streamMode : x.d.status)),
  );
  const nextWithEvents = datesWithEvents.find((d) => d > date);
  const bz = browserTz();
  const tzOptions = TZ_OPTIONS.some((o) => o.tz === bz) ? TZ_OPTIONS : [{ tz: bz, label: `Browser (${bz})` }, ...TZ_OPTIONS];
  const sel = keyLabel(date);

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-title font-black">Schedule</h1>
          <p className="mt-2 text-sm text-muted">
            Times in <b className="text-text">Las Vegas (PT)</b> with your local time ({tzAbbr(state.tz)}). Dates follow the venue's calendar. Times are stream start times; streams air on a broadcast delay, so
            they show play from a little earlier.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Your time zone
          <select value={state.tz} onChange={(e) => set({ tz: e.target.value })} className="h-10 rounded-chip border border-line-strong bg-surface px-3 text-sm text-text">
            {tzOptions.map((o) => (
              <option key={o.tz} value={o.tz}>
                {o.label} · {tzAbbr(o.tz)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="hscroll mt-6 pb-1" role="tablist" aria-label="Choose a date">
        {strip.map((k) => {
          const l = keyLabel(k);
          const has = datesWithEvents.includes(k);
          return (
            <button
              key={k}
              role="tab"
              aria-selected={k === date}
              onClick={() => setDate(k)}
              className={cx('flex w-[4.5rem] flex-col items-center rounded-card border px-2 py-2.5 transition-colors duration-150', k === date ? 'border-gold bg-gold-dim text-text' : 'border-line bg-surface text-muted hover:text-text')}
            >
              <span className="label text-[10px]">{k === today ? 'Today' : l.weekday}</span>
              <span className="text-xl font-black tnum">{l.day}</span>
              <span className="text-[11px]">{l.month}</span>
              <span className={cx('mt-1 size-1.5 rounded-full', has ? 'bg-gold' : 'bg-transparent')} aria-label={has ? 'Has broadcasts' : 'No broadcasts'} />
            </button>
          );
        })}
      </div>

      <p className="mt-6 mb-3 text-sm font-semibold text-muted">
        {date === today ? 'Today' : `${sel.weekday}, ${sel.month} ${sel.day}`} · {list.length} {list.length === 1 ? 'broadcast' : 'broadcasts'}
      </p>

      {list.length === 0 ? (
        <EmptyState
          title="No broadcasts scheduled for this day"
          body="Rest day at the venue. Catch up on past final tables in the archive."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {nextWithEvents && (
                <Button variant="primary" size="sm" onClick={() => setDate(nextWithEvents)}>
                  Next day with broadcasts
                </Button>
              )}
              <Link to="/archive" className="inline-flex h-8 items-center rounded-chip bg-surface-3 px-3 text-[13px] font-semibold hover:bg-line-strong">
                Watch replays
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
          {list.map(({ e, d }) => (
            <Row key={d.id} e={e} d={d} />
          ))}
        </ul>
      )}
    </Page>
  );
}

function Row({ e, d }: { e: TourEvent; d: Day }) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const now = useTick(60_000);
  const status = useDayStatus(d);
  const onAir = isOnAir(status);
  const broadcasting = isBroadcasting(status);
  const delay = Math.max(...d.tables.map((t) => tableDelay(t, status)), 0);
  const on = state.reminders.includes(d.id);
  const note =
    status === 'late'
      ? 'Coverage is starting late'
      : status === 'interrupted'
        ? 'Temporarily off air — resumes automatically'
        : onAir
          ? `On air · ${d.tables.length} stream${d.tables.length > 1 ? 's' : ''}${delay ? ` · ${delay}-min broadcast delay` : ''}`
          : status === 'upcoming'
            ? `Stream starts ${relative(d.start, now)}${d.label === 'Final Table' ? ' · airs on a 30-min delay' : ''}`
            : 'Coverage ended · full replay available';

  return (
    <li className={cx('flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6', status === 'vod' && 'opacity-80')}>
      <div className="w-44 shrink-0">
        <p className="text-xl font-black tnum">
          {fmtTime(d.start, VENUE_TZ)} <span className="text-xs font-bold text-muted">{tzAbbr(VENUE_TZ, d.start)}</span>
        </p>
        <p className="text-xs text-muted tnum">
          {fmtTime(d.start, state.tz)} {tzAbbr(state.tz, d.start)} your time
        </p>
        {dayKey(d.start, VENUE_TZ) < dayKey(Date.now(), VENUE_TZ) && <p className="text-[11px] text-subtle">Started {fmtDate(d.start, VENUE_TZ)}</p>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <StatusBadge status={status} size="sm" delayMin={delay || 30} />
          <span className="tnum">
            #{e.number} · {d.label} · {e.buyIn ? money(e.buyIn) : 'Invitational'}
          </span>
        </p>
        <Link to={`/watch/${d.id}`} className="mt-1 block truncate text-[17px] font-bold hover:text-gold-strong">
          {e.name}
        </Link>
        <p className={cx('text-sm', status === 'late' ? 'text-delayed' : status === 'interrupted' ? 'text-live' : 'text-muted')}>
          {note} <span className="text-subtle">· {seriesById(e.seriesId).name}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status === 'upcoming' && (
          <>
            <Button
              size="sm"
              variant={on ? 'secondary' : 'outline'}
              aria-pressed={on}
              onClick={() => {
                if (!signedIn) return requireLogin({ reason: 'Sign in to set reminders.' });
                set((s) => ({ reminders: on ? s.reminders.filter((r) => r !== d.id) : [...s.reminders, d.id] }));
                toast(on ? 'Reminder removed' : `Reminder set · ${fmtTime(d.start, state.tz)} ${tzAbbr(state.tz, d.start)}`);
              }}
            >
              <Icon name="bell" size={14} /> {on ? 'Reminder set' : 'Remind me'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toast('Calendar file (.ics) would download here (demo)')} aria-label={`Add ${e.name} ${d.label} to calendar`}>
              <Icon name="calendar" size={14} />
            </Button>
          </>
        )}
        <Link
          to={`/watch/${d.id}`}
          className={cx('inline-flex h-8 items-center rounded-chip px-4 text-[13px] font-bold transition-colors duration-150', broadcasting ? 'bg-gold text-ink hover:bg-gold-strong' : 'bg-surface-3 hover:bg-line-strong')}
        >
          {broadcasting ? 'Watch' : status === 'upcoming' ? 'Details' : 'View'}
        </Link>
      </div>
    </li>
  );
}
