// Live — the v1 watch layout around the full v2 player: tournament strip on top, the player with overlays /
// hand markers / multiview, event info + overview below, and on the right the event's streams (status, delay,
// access, "Now watching"), chip counts and hand replays.
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Access, Day, StreamStatus, TableFeed, TourEvent } from '../data/types';
import { HERO_DAY_ID, events, finalTableSeats } from '../data/mock';
import { isBroadcasting, isOnAir, tableDelay, tableStatus } from '../lib/broadcast';
import { VENUE_TZ, fmtDate, fmtTime, tzAbbr } from '../lib/time';
import { gateForAccess, useApp } from '../state/app';
import { AccessBadge, StatusBadge, cx } from '../components/ui';
import { WatchInner } from './Watch';

type Entry = { e: TourEvent; d: Day; status: StreamStatus };

export function Live() {
  const { state } = useApp();
  const [params, setParams] = useSearchParams();

  // One entry per event: its on-air day, else its next upcoming day, else its last day.
  const entries: Entry[] = useMemo(() => {
    const st = (d: Day) => (d.id === HERO_DAY_ID ? state.streamMode : d.status);
    const list = events.map((e) => {
      const d = e.days.find((x) => isBroadcasting(st(x))) ?? e.days.find((x) => st(x) === 'upcoming') ?? e.days[e.days.length - 1];
      return { e, d, status: st(d) };
    });
    const rank = (s: StreamStatus) => (isBroadcasting(s) ? 0 : s === 'upcoming' ? 1 : 2);
    return list.sort((a, b) => rank(a.status) - rank(b.status) || (rank(a.status) === 2 ? b.d.start.localeCompare(a.d.start) : a.d.start.localeCompare(b.d.start)));
  }, [state.streamMode]);

  const selected = entries.find((x) => x.e.id === params.get('event')) ?? entries[0];
  const tableId = params.get('table');
  const tableIdx = Math.max(0, selected.d.tables.findIndex((t) => t.id === tableId));
  const select = (eventId: string, table?: string) => setParams(table ? { event: eventId, table } : { event: eventId }, { replace: true });

  return (
    <div>
      {/* tournament strip */}
      <section className="border-b border-line bg-surface/60" aria-label="Tournaments">
        <div className="mx-auto max-w-[96rem] px-gutter py-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="label text-text/80">Tournaments</p>
            <Link to="/schedule" className="text-sm font-semibold text-muted hover:text-text">
              Schedule →
            </Link>
          </div>
          <div className="hscroll" role="tablist" aria-label="Tournaments">
            {entries.map((x) => (
              <TournamentChip key={x.e.id} x={x} on={x.e.id === selected.e.id} onClick={() => select(x.e.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* The full v2 player (overlays, hand markers, multiview, chip counts) inside the v1 layout. */}
      <WatchInner
        key={selected.d.id}
        dayId={selected.d.id}
        startAt={null}
        clipId={null}
        variant="live"
        tableId={selected.d.tables[tableIdx].id}
        onTable={(id) => select(selected.e.id, id)}
        asideTop={
          <section aria-label="Streams">
            <p className="label mb-3 text-text/80">
              Streams · <span className="tnum">{selected.d.tables.length}</span>
            </p>
            <ul className="space-y-2.5">
              {selected.d.tables.map((t, i) => (
                <li key={t.id}>
                  <StreamCard x={selected} t={t} i={i} on={i === tableIdx} onClick={() => select(selected.e.id, t.id)} />
                </li>
              ))}
            </ul>
          </section>
        }
      />
    </div>
  );
}

function TournamentChip({ x, on, onClick }: { x: Entry; on: boolean; onClick: () => void }) {
  const { d, e, status } = x;
  const delay = Math.max(0, ...d.tables.map((t) => tableDelay(t, status)));
  const sub = isBroadcasting(status)
    ? `${d.tables.length} stream${d.tables.length > 1 ? 's' : ''}${delay ? ` · ${delay}m delay` : ''}`
    : status === 'upcoming'
      ? `${fmtDate(d.start, VENUE_TZ)} · ${fmtTime(d.start, VENUE_TZ)} ${tzAbbr(VENUE_TZ, d.start)}`
      : 'Coverage ended';
  return (
    <button
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cx(
        'w-56 rounded-card border px-3.5 py-3 text-left transition-colors duration-150',
        on ? (isOnAir(status) ? 'border-live/80 bg-gradient-to-b from-live/15 to-surface' : 'border-gold bg-gold-dim') : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <span className="flex items-center gap-2 text-xs text-muted">
        {status === 'vod' ? <span className="label rounded-[4px] bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">Ended</span> : <StatusBadge status={status} size="sm" delayMin={delay || 30} />}
        <span className="truncate tnum">
          #{e.number} · {d.label}
        </span>
      </span>
      <span className="mt-1.5 block truncate text-[15px] font-bold">{e.name.replace(' World Championship', '')}</span>
      <span className="block truncate text-xs text-muted">{sub}</span>
    </button>
  );
}

const tableAccess = (d: Day, i: number): Access => (i === 0 ? (d.access ?? 'subscriber') : 'subscriber');

function StreamCard({ x, t, i, on, onClick }: { x: Entry; t: TableFeed; i: number; on: boolean; onClick: () => void }) {
  const { state } = useApp();
  const st = tableStatus(t, x.status);
  const delay = st === 'delayed' ? tableDelay(t, x.status) : 0;
  const access = tableAccess(x.d, i);
  const locked = gateForAccess(access, state.scenario) !== 'ok';
  const seats = i === 0 ? finalTableSeats.length : Math.max(2, 4 - i);
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx('w-full rounded-card border p-3.5 text-left transition-colors duration-150', on ? 'border-live/80 bg-live/5' : 'border-line bg-surface hover:border-line-strong')}
    >
      <span className="flex items-center justify-between gap-2">
        <StatusBadge status={st} size="sm" delayMin={delay || 30} />
        <AccessBadge access={access} locked={locked} />
      </span>
      <span className="mt-2 block text-[15px] font-bold">{t.name}</span>
      <span className="block text-xs text-muted">
        {i === 0 ? `Main stream · commentary · ${seats} featured players` : st === 'late' || st === 'interrupted' ? `Additional · ${t.name.replace('Outer ', '')} · natural sound` : `Additional · ${seats} featured players · natural sound`}
      </span>
      {on && <span className="label mt-1.5 block text-[10px] text-live">Now watching</span>}
    </button>
  );
}
