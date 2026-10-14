// Live — the v1 watch layout: tournament strip on top, the selected stream in a real-footage player,
// and the event's streams (one per table) on the right with status, delay, access and "Now watching".
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Access, Day, StreamStatus, TableFeed, TourEvent } from '../data/types';
import { HERO_DAY_ID, HERO_EXPECTED_START, events, finalTableSeats, playerById, seriesById } from '../data/mock';
import { isBroadcasting, isOnAir, tableDelay, tableStatus } from '../lib/broadcast';
import { FOOTAGE, tableFrame } from '../lib/media';
import { VENUE_TZ, countdown, fmtDate, fmtTime, tzAbbr } from '../lib/time';
import { gateForAccess, useApp, useTick, type Gate } from '../state/app';
import { AccessBadge, Button, Icon, StatusBadge, cx } from '../components/ui';

type Entry = { e: TourEvent; d: Day; status: StreamStatus };

const VIDEO_FOR_TABLE = [FOOTAGE.ft, FOOTAGE.mtl, FOOTAGE.int, FOOTAGE.deal];

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

      <div className="mx-auto grid max-w-[96rem] gap-5 px-gutter py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <LivePlayer x={selected} tableIdx={tableIdx} />
        <aside aria-label="Streams">
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
        </aside>
      </div>
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

function LivePlayer({ x, tableIdx }: { x: Entry; tableIdx: number }) {
  const { state, set, toast, requireLogin } = useApp();
  const nav = useNavigate();
  const now = useTick(1000);
  const t = x.d.tables[tableIdx];
  const st = tableStatus(t, x.status);
  const access = tableAccess(x.d, tableIdx);
  const gate: Gate = gateForAccess(access, state.scenario);
  const footage = VIDEO_FOR_TABLE[tableIdx % VIDEO_FOR_TABLE.length];
  const poster = tableFrame(tableIdx, x.e.number % 3);
  const se = seriesById(x.e.seriesId);
  const [muted, setMuted] = useState(true);
  useEffect(() => setMuted(true), [t.id]);

  const playable = isOnAir(st) && gate === 'ok' && !state.regionBlocked;
  const reminder = state.reminders.includes(x.d.id);

  let overlay: React.ReactNode = null;
  if (state.regionBlocked && isBroadcasting(x.status))
    overlay = <Overlay icon="globe" title="This event isn't available in your region" body="Broadcast rights don't cover your location." action={<Button variant="primary" onClick={() => toast("We'll notify you if it becomes available")}>Notify me</Button>} />;
  else if (st === 'upcoming')
    overlay = (
      <Overlay
        icon="calendar"
        title={`Starts in ${countdown(Date.parse(x.d.start) - now)}`}
        body={`${fmtTime(x.d.start, VENUE_TZ)} ${tzAbbr(VENUE_TZ, x.d.start)} Las Vegas · ${fmtTime(x.d.start, state.tz)} ${tzAbbr(state.tz, x.d.start)} your time`}
        action={
          <Button
            variant={reminder ? 'secondary' : 'primary'}
            onClick={() => {
              if (state.scenario === 'guest') return requireLogin({ reason: 'Sign in to set reminders.' });
              set((s) => ({ reminders: reminder ? s.reminders.filter((r) => r !== x.d.id) : [...s.reminders, x.d.id] }));
              toast(reminder ? 'Reminder removed' : 'We’ll remind you 15 minutes before');
            }}
          >
            <Icon name="bell" size={16} /> {reminder ? 'Reminder set' : 'Remind me'}
          </Button>
        }
      />
    );
  else if (st === 'vod')
    overlay = <Overlay icon="play" title="Coverage ended" body="The full replay is available on demand." action={<Button variant="primary" onClick={() => nav(`/watch/${x.d.id}`)}>Watch replay</Button>} />;
  else if (st === 'late')
    overlay = <Overlay icon="calendar" title="Starting late" body={`This table is now expected around ${fmtTime(HERO_EXPECTED_START, state.tz)} your time.`} />;
  else if (st === 'interrupted') overlay = <Overlay icon="tv" title="Temporarily off air" body="Production is working on it — the stream resumes automatically." />;
  else if (gate !== 'ok') {
    const g = {
      login: { title: 'Sign in to watch', body: tableIdx === 0 ? 'Live coverage needs a GGPASS account and a subscription.' : 'Additional table · available to subscribers.', cta: 'Continue with GGPASS', go: () => requireLogin({ reason: 'Sign in to start watching.', returnTo: `/live?event=${x.e.id}&table=${t.id}` }) },
      plans: { title: 'Subscribe to watch', body: 'Pick a plan to unlock every live table.', cta: 'See plans', go: () => nav('/plans', { state: { returnTo: `/live?event=${x.e.id}&table=${t.id}` } }) },
      link: { title: 'Link your GGPASS account', body: 'Your subscription isn’t connected to GGPASS yet.', cta: 'Link GGPASS', go: () => (set({ scenario: 'active' }), toast('GGPASS linked (demo)')) },
      restricted: { title: 'Viewing isn’t available', body: 'This GGPASS account is restricted.', cta: 'Contact support', go: () => toast('Opens GGPASS support (demo)') },
      devices: { title: 'Too many devices', body: 'Stop playback on another device to watch here.', cta: 'Manage devices', go: () => nav('/devices', { state: { returnTo: '/live' } }) },
    }[gate];
    overlay = <Overlay icon="lock" title={g.title} body={g.body} action={<Button variant="primary" onClick={g.go}>{g.cta}</Button>} />;
  }

  return (
    <section aria-label="Player" className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-panel border border-line bg-black">
        <img src={poster} alt="" className={cx('absolute inset-0 size-full object-cover', !playable && 'scale-105 blur-[3px] brightness-50', (st === 'late' || st === 'interrupted') && 'grayscale')} />
        {playable && <video key={t.id} className="absolute inset-0 size-full object-cover" src={`${footage.url}#t=${tableIdx === 0 ? 110 : 20}`} poster={poster} autoPlay loop playsInline muted={muted} />}
        {playable && (
          <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
            <StatusBadge status={st} delayMin={tableDelay(t, x.status) || 30} />
            <span className="text-sm font-semibold drop-shadow">{t.name}</span>
            <button onClick={() => setMuted((m) => !m)} className="ml-auto inline-flex items-center gap-1.5 rounded-chip bg-black/60 px-2.5 py-1.5 text-xs font-semibold hover:bg-black/80" aria-label={muted ? 'Unmute' : 'Mute'}>
              <Icon name={muted ? 'mute' : 'volume'} size={16} /> {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        )}
        {overlay}
        <p className="absolute right-2 bottom-1.5 text-[10px] text-white/45">Footage: {footage.credit} — not WSOP</p>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label text-subtle">
            {se.name} · Event #{x.e.number} · {x.d.label}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{x.e.name}</h1>
          {x.e.remaining > 0 && isBroadcasting(x.status) && (
            <p className="mt-1 text-sm text-muted tnum">
              {x.e.remaining} players left · Level {x.e.level}
              {x.e.leaderId && state.spoilerFree === false && <> · Chip leader {playerById(x.e.leaderId).name}</>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/watch/${x.d.id}`} className="inline-flex h-10 items-center gap-2 rounded-chip bg-surface-3 px-4 text-sm font-semibold hover:bg-line-strong">
            <Icon name="layers" size={16} /> Full player · overlays, hand markers, multiview
          </Link>
          <Link to={`/events/${x.e.id}`} className="inline-flex h-10 items-center rounded-chip px-3 text-sm font-semibold text-muted hover:text-text">
            Event details →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Overlay({ icon, title, body, action }: { icon: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center" role="status">
      <p className="flex items-center gap-2 text-lg font-bold sm:text-xl">
        <Icon name={icon} size={18} /> {title}
      </p>
      <p className="max-w-md text-sm text-text/80">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
