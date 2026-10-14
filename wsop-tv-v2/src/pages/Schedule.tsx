import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { events, seriesById } from '../data/mock';
import { TZ_OPTIONS, VENUE_TZ, browserTz, dayKey, fmtDate, fmtTime, tzAbbr } from '../lib/time';
import { useApp } from '../state/app';
import { useDayStatus } from '../components/cards';
import { Button, Icon, Page, StatusBadge, cx } from '../components/ui';
import type { Day, TourEvent } from '../data/types';

export function Schedule() {
  const { state, set } = useApp();
  const all = useMemo(() => events.flatMap((e) => e.days.map((d) => ({ e, d }))).sort((a, b) => a.d.start.localeCompare(b.d.start)), []);
  const groups = useMemo(() => {
    const m = new Map<string, { e: TourEvent; d: Day }[]>();
    for (const x of all) {
      const k = dayKey(x.d.start, state.tz);
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return [...m.entries()];
  }, [all, state.tz]);
  const todayKey = dayKey(Date.now(), state.tz);
  const keys = groups.map(([k]) => k);
  const [sel, setSel] = useState(() => keys.find((k) => k >= todayKey) ?? keys[0]);
  const current = groups.find(([k]) => k === sel)?.[1] ?? [];
  const bz = browserTz();
  const tzOptions = TZ_OPTIONS.some((o) => o.tz === bz) ? TZ_OPTIONS : [{ tz: bz, label: `Browser (${bz})` }, ...TZ_OPTIONS];

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-gold">Broadcast schedule</p>
          <h1 className="mt-1 text-title font-black">Schedule</h1>
          <p className="mt-1 text-sm text-muted">Times shown in your time zone, with Las Vegas local time (PT) alongside.</p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Time zone
          <select value={state.tz} onChange={(e) => set({ tz: e.target.value })} className="h-10 rounded-chip border border-line-strong bg-surface px-3 text-sm text-text">
            {tzOptions.map((o) => (
              <option key={o.tz} value={o.tz}>
                {o.label} · {tzAbbr(o.tz)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="hscroll mt-6 border-b border-line pb-3" role="tablist" aria-label="Dates">
        {keys.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === sel}
            onClick={() => setSel(k)}
            className={cx('flex min-w-16 flex-col items-center rounded-card border px-3 py-2 transition-colors duration-150', k === sel ? 'border-gold bg-gold-dim text-text' : 'border-line text-muted hover:text-text')}
          >
            <span className="label text-[10px]">{k === todayKey ? 'Today' : fmtDate(`${k}T12:00:00Z`, 'UTC').split(',')[0]}</span>
            <span className="text-lg font-bold tnum">{Number(k.slice(-2))}</span>
            <span className="text-[10px]">{fmtDate(`${k}T12:00:00Z`, 'UTC').split(' ')[1]}</span>
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-line rounded-panel border border-line bg-surface">
        {current.map(({ e, d }) => (
          <Row key={d.id} e={e} d={d} />
        ))}
      </ul>
    </Page>
  );
}

function Row({ e, d }: { e: TourEvent; d: Day }) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const status = useDayStatus(d);
  const on = state.reminders.includes(d.id);
  const local = tzAbbr(state.tz, d.start);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="w-40 shrink-0">
        <p className="text-lg font-bold tnum">
          {fmtTime(d.start, state.tz)} <span className="text-xs font-semibold text-muted">{local}</span>
        </p>
        {state.tz !== VENUE_TZ && (
          <p className="text-xs text-subtle tnum">
            {fmtTime(d.start, VENUE_TZ)} Las Vegas ({tzAbbr(VENUE_TZ, d.start)})
          </p>
        )}
      </div>
      <Link to={`/watch/${d.id}`} className="min-w-0 flex-1 hover:text-gold-strong">
        <p className="truncate font-semibold">
          #{e.number} {e.name} · {d.label}
        </p>
        <p className="truncate text-xs text-muted">
          {seriesById(e.seriesId).name} · {d.tables.length} {d.tables.length > 1 ? 'tables' : 'table'}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} size="sm" />
        {status === 'upcoming' && (
          <>
            <Button
              size="sm"
              variant={on ? 'secondary' : 'outline'}
              aria-pressed={on}
              onClick={() => {
                if (!signedIn) return requireLogin({ reason: 'Sign in to set reminders.' });
                set((s) => ({ reminders: on ? s.reminders.filter((r) => r !== d.id) : [...s.reminders, d.id] }));
                toast(on ? 'Reminder removed' : `Reminder set · ${fmtTime(d.start, state.tz)} ${local}`);
              }}
            >
              <Icon name="bell" size={14} /> {on ? 'Reminder set' : 'Remind me'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toast('Calendar file (.ics) would download here (demo)')} aria-label={`Add ${e.name} ${d.label} to calendar`}>
              <Icon name="calendar" size={14} /> <span className="hidden md:inline">Add to calendar</span>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
