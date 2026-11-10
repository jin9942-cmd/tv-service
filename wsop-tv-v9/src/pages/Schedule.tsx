import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { broadcastById, CLIPS, DEMO_NOW_PT, DEMO_TODAY, fmtBlinds, fmtChips, nas, PLAYERS, SCHEDULE, type Broadcast } from '../data/demo';
import { useSession, useTable } from '../lib/state';
import { ClipCard, Page, SampleNote, Section, StatusChip, VideoPlayer } from '../components/ui';
import { useNeeds } from './Watch';

const toMin = (t: string) => {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/);
  if (!m) return 0;
  return ((+m[1] % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + +m[2];
};
const fromMin = (n: number) => {
  const h = Math.floor(((n % 1440) + 1440) % 1440 / 60);
  const mm = String(((n % 60) + 60) % 60).padStart(2, '0');
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
};
/** PT → the viewer's zone, for the same demo day. */
const localOffsetMin = (() => {
  const d = new Date(`${DEMO_TODAY}T12:00:00Z`);
  const pt = new Date(d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const local = new Date(d.toLocaleString('en-US'));
  return Math.round((local.getTime() - pt.getTime()) / 60000);
})();
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') ?? 'Local';

/** [S] Schedule dashboard — a side hub for finding a date, not the start of the loop. */
export function Schedule() {
  const { ticker, reminders, toggleReminder } = useSession();
  const [day, setDay] = useState(DEMO_TODAY);
  const [tz, setTz] = useState<'pt' | 'local'>('pt');
  const featured = ticker.find((b) => b.status === 'live') ?? ticker.find((b) => b.status === 'upcoming');
  const d = SCHEDULE.find((x) => x.date === day)!;
  const shown = (t: string) => (tz === 'pt' ? `${t} PT` : fromMin(toMin(t) + localOffsetMin));

  return (
    <Page>
      {featured && <FeaturedEvent b={featured} />}

      <Section title="Schedule" icon="📅" right={
        <div className="flex rounded border border-line text-[12px]">
          {(['pt', 'local'] as const).map((z) => (
            <button key={z} onClick={() => setTz(z)} className={`px-2.5 py-1 ${tz === z ? 'bg-white text-black' : 'text-muted'}`}>
              {z === 'pt' ? 'Las Vegas (PT)' : `My time (${localZone})`}
            </button>
          ))}
        </div>
      }>
        <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
          {SCHEDULE.map((x) => (
            <button key={x.date} onClick={() => setDay(x.date)} className={`shrink-0 rounded border px-3 py-2 text-left ${day === x.date ? 'border-white bg-white text-black' : 'border-line hover:border-line-strong'}`}>
              <div className="text-[11px] font-bold opacity-70">{x.date === DEMO_TODAY ? 'TODAY' : x.label.split(',')[0].toUpperCase()}</div>
              <div className="text-[13px] font-semibold">{x.label.split(', ')[1]}</div>
              <div className="text-[10px] opacity-60">{x.items.length ? `${x.items.length} broadcast${x.items.length > 1 ? 's' : ''}` : 'No broadcast'}</div>
            </button>
          ))}
        </div>

        {d.items.length === 0 ? (
          <div className="rounded border border-dashed border-line-strong px-4 py-10 text-center">
            <div className="text-[15px] font-semibold">No broadcasts on {d.label}</div>
            <p className="mt-1 text-[13px] text-muted">It’s a rest day on the schedule. Catch up on the free highlights instead.</p>
            <Link to="/hands" className="btn mt-4">Free highlights</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line rounded border border-line">
            {d.items.map((it) => {
              const b = it.broadcastId ? ticker.find((x) => x.id === it.broadcastId) ?? broadcastById(it.broadcastId) : undefined;
              const past = day < DEMO_TODAY;
              const future = day > DEMO_TODAY;
              const status = past ? 'ended' : future ? 'upcoming' : b?.status === 'live' ? 'live' : b?.status === 'upcoming' ? 'upcoming' : toMin(it.time) < toMin(DEMO_NOW_PT) ? 'ended' : 'upcoming';
              const remindKey = b?.id ?? `${day}-${it.time}`;
              return (
                <li key={it.time + it.title} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
                  <div className="w-28 shrink-0">
                    <div className="text-[14px] font-bold tabular-nums">{shown(it.time)}</div>
                    {tz === 'local' && <div className="text-[10px] text-subtle">{it.time} PT</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {status === 'live' && <span className="chip bg-red text-white"><span className="live-dot" />Live</span>}
                      {status === 'ended' && <span className="chip bg-white/10 text-muted">Ended</span>}
                      {status === 'upcoming' && <span className="chip border border-line-strong text-muted">Upcoming</span>}
                      <span className="text-[11px] text-subtle">{it.eventNo}</span>
                    </div>
                    <div className="mt-0.5 text-[14px] font-semibold">{it.title}</div>
                    {it.note && <div className="text-[11px] text-subtle">{it.note}</div>}
                  </div>
                  <div className="flex gap-2">
                    {status === 'upcoming' ? (
                      <button onClick={() => toggleReminder(remindKey)} className={`btn ${reminders.includes(remindKey) ? '!border-gold text-gold' : ''}`}>
                        {reminders.includes(remindKey) ? '🔔 Reminder set' : 'Set reminder'}
                      </button>
                    ) : b ? (
                      <Link to={`/watch/${b.id}`} className={`btn ${status === 'live' ? 'btn-white' : ''}`}>{status === 'live' ? '▶ Watch' : '▶ Replay'}</Link>
                    ) : (
                      <span className="text-[12px] text-subtle">Not broadcast</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}

function FeaturedEvent({ b }: { b: Broadcast }) {
  const table = useTable(b.status === 'live' ? b.id : undefined);
  const chips = b.seats.map((s) => ({ pid: s.pid, c: table?.chips[s.pid] ?? s.chips })).filter((x) => x.c > 0).sort((x, y) => y.c - x.c);
  const avg = chips.reduce((a, x) => a + x.c, 0) / Math.max(1, chips.length);
  const live = b.status === 'live';
  return (
    <section className="relative overflow-hidden border-b border-line">
      <img src={nas(b.still)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black" />
      <div className="relative px-4 py-8 text-center md:py-12">
        <div className="flex justify-center"><StatusChip b={b} /></div>
        <div className="eyebrow mt-3">{b.series} · {b.eventNo}</div>
        <h1 className="display mt-1 text-[26px] md:text-[34px]">{b.title.replace(' · ', ' – ')}</h1>
        <div className="text-[13px] text-muted">{b.prize}</div>
        {chips.length > 0 && (
          <div className="mt-5 flex justify-center gap-8 md:gap-12">
            {[
              [String(chips.length), 'Players left'],
              [fmtChips(chips[0].c), 'Chip leader'],
              [fmtChips(b.blinds[1]), 'Big blind'],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="text-[26px] font-black tabular-nums md:text-[32px]">{v}</div>
                <div className="eyebrow !text-[10px]">{l}</div>
              </div>
            ))}
          </div>
        )}
        {chips.length > 0 && <div className="mt-2 text-[12px] text-muted">Chip leader: {PLAYERS[chips[0].pid].short} · Avg stack {fmtChips(avg)}</div>}
        <div className="mt-5 flex justify-center gap-2">
          {live ? (
            <>
              <Link to={`/watch/${b.id}`} className="btn btn-white">▶ Watch live</Link>
              <Link to={`/event/${b.id}`} className="btn">Event details</Link>
            </>
          ) : (
            <Link to={`/event/${b.id}`} className="btn btn-white">Starts {b.startsAt}</Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Event detail: the picture with the tournament's numbers beside it, then recaps and key hands. */
export function EventPage() {
  const { id } = useParams();
  const { ticker, reminders, toggleReminder } = useSession();
  const b0 = broadcastById(id);
  const b = b0 && (ticker.find((x) => x.id === b0.id) ?? b0);
  const table = useTable(b?.status === 'live' ? b.id : undefined);
  const needs = useNeeds(b ?? ticker[0]);
  if (!b) return <Navigate to="/schedule" replace />;
  const chips = b.seats.map((s) => ({ pid: s.pid, c: table?.chips[s.pid] ?? s.chips })).filter((x) => x.c > 0).sort((x, y) => y.c - x.c);
  const avg = chips.reduce((a, x) => a + x.c, 0) / Math.max(1, chips.length);
  const clips = CLIPS.filter((c) => c.broadcastId === b.id || (b.eventNo === 'Event #76' && c.broadcastId.startsWith('me-')));
  const upcoming = b.status === 'upcoming';
  const minsTo = upcoming && b.startsAt ? toMin(b.startsAt) - toMin(DEMO_NOW_PT) : 0;
  const reminded = reminders.includes(b.id);

  return (
    <Page activeId={b.id}>
      <div className="grid md:grid-cols-[1fr_300px]">
        {upcoming ? (
          <div className="relative aspect-video overflow-hidden bg-black">
            <img src={nas(b.still)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <StatusChip b={b} />
                <div className="eyebrow mt-3">Starts in</div>
                <div className="display text-[40px] tabular-nums md:text-[56px]">
                  {minsTo > 0 ? `${Math.floor(minsTo / 60)}h ${String(minsTo % 60).padStart(2, '0')}m` : 'Soon'}
                </div>
                <div className="text-[13px] text-muted">{b.startsAt} · {b.table}</div>
                <button onClick={() => toggleReminder(b.id)} className={`btn mt-4 ${reminded ? '!border-gold text-gold' : 'btn-white'}`}>
                  {reminded ? '🔔 Reminder set' : '🔔 Set reminder'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <VideoPlayer src={b.video} poster={b.still} offset={b.offset} mode={b.status === 'live' ? 'live' : 'vod'} needs={needs} topLeft={<StatusChip b={b} />} />
        )}
        <aside className="border-line bg-surface px-4 py-4 md:border-l">
          <div className="eyebrow">{b.series} · {b.eventNo}</div>
          <div className="mt-1 text-[28px] font-black">{b.payouts[0]?.amount ?? (b.prize || '—')}</div>
          <div className="eyebrow !text-[10px]">1st place prize</div>
          <dl className="mt-4 divide-y divide-line text-[13px]">
            {[
              ['Status', upcoming ? `Starts ${b.startsAt}` : `${b.day}${chips.length ? ` · ${chips.length} players` : ''}`],
              ['Blinds', b.blinds[1] ? fmtBlinds(b.blinds) : '—'],
              ['Chip leader', chips[0] ? `${PLAYERS[chips[0].pid].short} (${fmtChips(chips[0].c)})` : '—'],
              ['Avg stack', chips.length ? Math.round(avg).toLocaleString() : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2"><SampleNote /></div>
        </aside>
      </div>
      <div className="border-b border-line px-4 py-4 md:px-6">
        <div className="text-[12px] text-muted">Tuesday, July 14th, 2026</div>
        <h1 className="display text-[20px] md:text-[24px]">WSOP {b.title}</h1>
        <div className="text-[12px] text-muted">{b.venue}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!upcoming && <Link to={`/watch/${b.id}`} className="btn btn-white">{b.status === 'live' ? '▶ Watch live' : '▶ Watch'}</Link>}
          {clips[0] && <Link to={`/hands/${clips[0].id}`} className="btn">Watch recap</Link>}
          {clips[0] && <Link to="/hands" className="btn">Condensed (30 min)</Link>}
          {!upcoming && <Link to={`/watch/${b.id}`} className="btn">Full results</Link>}
        </div>
      </div>
      {clips.length > 0 && (
        <Section title="Key hands" icon="🔥" right={<Link to="/hands" className="text-[12px] text-muted hover:text-white">See all →</Link>}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{clips.slice(0, 4).map((c) => <ClipCard key={c.id} c={c} />)}</div>
        </Section>
      )}
    </Page>
  );
}
