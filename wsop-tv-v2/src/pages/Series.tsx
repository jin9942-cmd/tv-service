import { Link, useParams } from 'react-router-dom';
import type { Day, TourEvent } from '../data/types';
import { eventById, events, hands, playerById, series, seriesById } from '../data/mock';
import { count, money } from '../lib/format';
import { fmtDate, fmtDateTime } from '../lib/time';
import { canWatch, useApp } from '../state/app';
import { Art, HandCard, useDayStatus } from '../components/cards';
import { AccessBadge, BraceletIcon, Icon, Page, SectionHeader, Spoiler, StatusBadge, cx } from '../components/ui';
import { NotFound } from './NotFound';

export function SeriesList() {
  const { state } = useApp();
  return (
    <Page className="space-y-10">
      <header>
        <p className="label text-gold">Series → Event → Day</p>
        <h1 className="mt-1 text-title font-black">Series &amp; Events</h1>
      </header>
      {series.map((s) => {
        const evs = events.filter((e) => e.seriesId === s.id);
        return (
          <section key={s.id}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
              <div>
                <h2 className="text-xl font-bold">{s.name}</h2>
                <p className="text-sm text-muted">
                  {s.venue} · {s.city} · {fmtDate(s.start, state.tz)} – {fmtDate(s.end, state.tz)}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <BraceletIcon size={16} /> {evs.length} bracelet events
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {evs.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </ul>
          </section>
        );
      })}
    </Page>
  );
}

function eventStatus(e: TourEvent, override: (d: Day) => string) {
  const s = e.days.map(override);
  if (s.includes('live')) return 'live';
  if (s.includes('delayed')) return 'delayed';
  if (s.includes('interrupted')) return 'interrupted';
  if (s.includes('late')) return 'late';
  if (s.every((x) => x === 'upcoming')) return 'upcoming';
  return 'vod';
}

function EventRow({ e }: { e: TourEvent }) {
  const { state } = useApp();
  const st = eventStatus(e, (d) => (d.id === 'lv-main-finaltable' ? state.streamMode : d.status)) as Day['status'];
  return (
    <li>
      <Link to={`/events/${e.id}`} className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong">
        <div className="flex items-center justify-between">
          <span className="label flex items-center gap-1.5 text-subtle">
            <BraceletIcon size={14} /> Event #{e.number}
          </span>
          <StatusBadge status={st} size="sm" />
        </div>
        <p className="text-[15px] leading-snug font-semibold group-hover:text-gold-strong">{e.name}</p>
        <div className="mt-auto flex flex-wrap gap-1">
          {e.days.map((d) => (
            <DayPill key={d.id} d={d} />
          ))}
        </div>
      </Link>
    </li>
  );
}

function DayPill({ d }: { d: Day }) {
  const st = useDayStatus(d);
  return (
    <span className={cx('rounded-[4px] border px-1.5 py-0.5 text-[11px] font-semibold', st === 'live' || st === 'interrupted' ? 'border-live text-live' : st === 'delayed' || st === 'late' ? 'border-delayed text-delayed' : st === 'upcoming' ? 'border-line text-subtle' : 'border-line-strong text-muted')}>
      {d.label}
    </span>
  );
}

export function EventDetail() {
  const { eventId = '' } = useParams();
  const e = eventById(eventId);
  if (!e) return <NotFound />;
  const se = seriesById(e.seriesId);
  const evHands = hands.filter((h) => h.eventId === e.id).slice(0, 6);
  const finished = !!e.winnerId;
  const started = e.entrants > 0;

  return (
    <Page className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/series" className="hover:text-text">
          Series &amp; Events
        </Link>{' '}
        / <span>{se.name}</span> / <span className="text-text">Event #{e.number}</span>
      </nav>

      {/* scoreboard */}
      <section className="overflow-hidden rounded-panel border border-line bg-surface" aria-label="Scoreboard">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-14 items-center justify-center rounded-card border border-gold/40 bg-gold-dim">
              <BraceletIcon size={34} title="Bracelet event" />
            </span>
            <div>
              <p className="label text-gold">
                {se.name} · Event #{e.number}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-title">{e.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {se.venue}, {se.city} · Buy-in {e.buyIn ? money(e.buyIn) : 'Invitational'}
              </p>
            </div>
          </div>
          {finished && (
            <div className="rounded-card border border-line-strong px-4 py-3 text-right">
              <p className="label text-subtle">Champion</p>
              <Spoiler k={`winner-${e.id}`} inline label="Champion hidden">
                <span className="text-lg font-bold">{playerById(e.winnerId!).name}</span>
              </Spoiler>
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
          <Cell k="Entrants" v={started ? count(e.entrants) : '—'} />
          <Cell k="Prize pool" v={started ? money(e.prizePool) : 'TBD'} />
          <Cell k="First prize" v={started ? money(e.firstPrize) : 'TBD'} />
          <Cell k="Level" v={started ? String(e.level) : '—'} />
          <Cell k="Players left" v={started ? count(e.remaining) : '—'} />
          <div className="border-t border-line p-4 lg:border-t-0">
            <dt className="label text-subtle">{finished ? 'Final chip leader' : 'Chip leader'}</dt>
            <dd className="mt-1 text-base font-bold">
              {e.leaderId ? (
                <Spoiler k={`leader-${e.id}`} inline label="Chip leader hidden">
                  <span>{playerById(e.leaderId).name}</span>
                </Spoiler>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <SectionHeader title="Days" />
        <ol className="space-y-2">
          {e.days.map((d) => (
            <DayRow key={d.id} e={e} d={d} />
          ))}
        </ol>
      </section>

      {evHands.length > 0 && (
        <section>
          <SectionHeader title="Key hands" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {evHands.map((h) => (
              <HandCard key={h.id} hand={h} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-t border-line p-4 lg:border-t-0">
      <dt className="label text-subtle">{k}</dt>
      <dd className="mt-1 text-xl font-black tnum">{v}</dd>
    </div>
  );
}

function DayRow({ e, d }: { e: TourEvent; d: Day }) {
  const { state } = useApp();
  const st = useDayStatus(d);
  return (
    <li>
      <Link to={`/watch/${d.id}`} className="group flex items-center gap-4 rounded-card border border-line bg-surface p-3 transition-colors duration-150 hover:border-line-strong">
        <Art hue={200 + e.number * 3} className="w-32 shrink-0 sm:w-40">
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <Icon name="play" size={22} className="text-white/70" />
          </span>
        </Art>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold group-hover:text-gold-strong">{d.label}</p>
          <p className="text-xs text-muted">
            {fmtDateTime(d.start, state.tz)} · {Math.round(d.durationMin / 60)}h · {d.tables.length} {d.tables.length > 1 ? 'tables' : 'table'}
          </p>
        </div>
        <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
          <AccessBadge access={d.access ?? 'subscriber'} locked={!canWatch(d.access ?? 'subscriber', state.scenario)} />
          <StatusBadge status={st} size="sm" />
        </span>
      </Link>
    </li>
  );
}
