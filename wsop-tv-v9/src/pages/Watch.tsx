import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { broadcastById, clipFor, CLIPS, fmtBlinds, fmtChips, ordinal, PLAYERS, type Broadcast, type PlayerId } from '../data/demo';
import { useAgo, useSession, useTable, type Table } from '../lib/state';
import { Avatar, ClipCard, Page, PlayerLink, SampleNote, Section, StatusChip, VideoPlayer } from '../components/ui';

/** [T] Tournament live — the centre of everything. Live, VOD and past-final replays share this frame. */
export function Watch() {
  const { id } = useParams();
  const { ticker } = useSession();
  const b0 = broadcastById(id);
  if (!b0) return <Navigate to="/" replace />;
  // The on-air switch may have turned a live broadcast into an upcoming one.
  const b = ticker.find((x) => x.id === b0.id) ?? b0;
  if (b.status === 'upcoming') return <Navigate to={`/event/${b.id}`} replace />;
  return <WatchView key={b.id} b={b} />;
}

/** Which tier a broadcast needs right now: the first live table is Standard, choosing another live table is Platinum. */
export function useNeeds(b: Broadcast) {
  const { ticker } = useSession();
  const firstLive = ticker.find((x) => x.status === 'live');
  if (b.status === 'live') return firstLive?.id === b.id ? 'standard' : 'platinum';
  return b.access;
}

type Tab = 'summary' | 'chips' | 'hands' | 'charts';

export function WatchView({ b }: { b: Broadcast }) {
  const live = b.status === 'live';
  const replay = b.status === 'replay' || b.status === 'final';
  const table = useTable(live ? b.id : undefined);
  const { progress, saveProgress } = useSession();
  const needs = useNeeds(b);
  const [tab, setTab] = useState<Tab>(live ? 'chips' : 'summary');
  const tabsRef = useRef<HTMLDivElement>(null);
  const go = (t: Tab) => {
    setTab(t);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const ago = useAgo(table?.updatedAt);

  const standings = useMemo(() => standingsOf(b, table), [b, table]);
  const leader = standings[0];
  const keyHands = CLIPS.filter((c) => c.broadcastId === b.id);

  return (
    <Page activeId={b.id}>
      <VideoPlayer
        src={b.video}
        poster={b.still}
        offset={b.offset}
        mode={live ? 'live' : replay ? 'replay' : 'vod'}
        needs={needs}
        resumeAt={b.status === 'vod' ? progress[b.id] : undefined}
        onProgress={b.status === 'vod' ? (t) => saveProgress(b.id, t) : undefined}
        className="md:max-h-[72vh]"
        topLeft={
          <>
            <StatusChip b={b} />
            {replay && <span className="chip bg-black/70 text-white">{b.series}</span>}
          </>
        }
        topRight={live && b.viewers ? <span className="rounded bg-black/70 px-2 py-1 text-[11px]">👁 {(b.viewers + (table?.hand ?? 0) * 3).toLocaleString()} watching</span> : undefined}
        center={
          live && leader ? (
            // Scoreboard over the picture, like NBA TV's score bug.
            <div className="hidden items-center gap-3 rounded bg-black/70 px-3 py-1.5 text-[12px] sm:flex">
              <span className="font-bold">{b.eventNo}</span>
              <span className="text-muted">Hand #{table?.hand}</span>
              <span className="text-muted">{standings.filter((s) => !s.out).length} left</span>
              <span>
                Leader <b>{PLAYERS[leader.pid].short}</b> {fmtChips(leader.chips)}
              </span>
            </div>
          ) : undefined
        }
      />

      {/* Info bar */}
      <div className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3 md:flex-row md:items-center md:px-6">
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{b.series} · {b.eventNo} · {b.day} · {b.table}</div>
          <h1 className="display mt-0.5 text-[20px] md:text-[22px]">
            {replay && <span className="mr-2 text-gold">Replay ·</span>}
            WSOP {b.title}
          </h1>
          <div className="text-[12px] text-muted">
            {b.venue} · {live ? `Started ${b.started}` : b.started}
            {b.prize && ` · ${b.prize}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => go('chips')}>📊 Stats</button>
          <button className="btn" onClick={() => go('hands')}>🎞 Highlights</button>
          <button className="btn" onClick={() => go('summary')}>🏆 Results</button>
        </div>
      </div>

      {/* Chip counts under the picture: the strip the viewer reads while watching. */}
      {standings.length > 0 && (
        <section className="border-b border-line px-4 py-4 md:px-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="display text-[14px]">{replay ? '🏆 Final standings' : '💰 Chip counts'}</h2>
            {live ? <SampleNote>Updated {ago} · sample EBS chip feed</SampleNote> : <SampleNote>Sample data</SampleNote>}
          </div>
          <div className="no-scrollbar grid auto-cols-[132px] grid-flow-col gap-2 overflow-x-auto md:auto-cols-fr">
            {standings.map((s, i) => (
              <Link
                key={s.pid + (live ? table?.hand : '')}
                to={`/players/${s.pid}`}
                className={`flash flex flex-col items-center rounded border px-2 py-3 text-center ${i === 0 && !s.out ? 'border-white' : 'border-line'} ${s.out ? 'opacity-50' : 'hover:border-line-strong'}`}
              >
                <Avatar pid={s.pid} size={38} dim={!!s.out} />
                <div className="mt-2 truncate text-[12px] font-bold">{PLAYERS[s.pid].short}</div>
                {replay ? (
                  <div className="mt-0.5 text-[15px] font-black">{ordinal(s.place!)}</div>
                ) : s.out ? (
                  <div className="mt-0.5 text-[12px] text-muted">Out · {ordinal(s.out)}</div>
                ) : (
                  <>
                    <div className="mt-0.5 text-[15px] font-black tabular-nums">{fmtChips(s.chips)}</div>
                    <div className="text-[10px] text-subtle">{Math.round(s.chips / bigBlind(b, table))} BB</div>
                  </>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Summary / Chip Counts / Hand History / Charts — NBA TV's Summary / Box Score / Play-By-Play / Game Charts */}
      <div ref={tabsRef} className="sticky top-[86px] z-30 flex scroll-mt-24 gap-1 overflow-x-auto border-b border-line bg-bg px-3 md:px-5 lg:top-[69px]">
        {(
          [
            ['summary', 'Summary'],
            ['chips', live ? 'Chip Counts' : 'Players'],
            ['hands', live ? 'Hand History' : 'Key Hands'],
            ['charts', 'Charts'],
          ] as [Tab, string][]
        )
          .filter(([t]) => live || t !== 'charts')
          .map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-3 py-3 text-[13px] font-semibold whitespace-nowrap ${tab === t ? 'border-white text-white' : 'border-transparent text-muted hover:text-white'}`}>
              {label}
            </button>
          ))}
      </div>

      {tab === 'summary' && <Summary b={b} table={table} standings={standings} />}
      {tab === 'chips' && <BoxScore b={b} table={table} standings={standings} />}
      {tab === 'hands' && (live ? <HandHistory b={b} table={table!} /> : (
        <Section title="Key hands" icon="🔥">
          {keyHands.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{keyHands.map((c) => <ClipCard key={c.id} c={c} />)}</div>
          ) : (
            <p className="text-[13px] text-muted">No clips cut from this broadcast yet.</p>
          )}
        </Section>
      ))}
      {tab === 'charts' && table && <Charts b={b} table={table} />}
    </Page>
  );
}

type Standing = { pid: PlayerId; chips: number; out?: number; place?: number };

function standingsOf(b: Broadcast, table?: Table): Standing[] {
  if (b.result) return b.result.map((r) => ({ pid: r.pid, chips: 0, place: r.place }));
  if (table) {
    const alive = b.seats.filter((s) => (table.chips[s.pid] ?? 0) > 0).map((s) => ({ pid: s.pid, chips: table.chips[s.pid]! }));
    alive.sort((x, y) => y.chips - x.chips);
    const out = [...table.out].sort((x, y) => x.place - y.place).map((o) => ({ pid: o.pid, chips: 0, out: o.place }));
    return [...alive, ...out];
  }
  return [...b.seats].sort((x, y) => y.chips - x.chips);
}

const bigBlind = (b: Broadcast, t?: Table) => b.blinds[1] * (1 + (t?.level ?? 0) * 0.25) || 1;
const blindsNow = (b: Broadcast, t?: Table): [number, number, number] => {
  const k = 1 + (t?.level ?? 0) * 0.25;
  return [b.blinds[0] * k, b.blinds[1] * k, b.blinds[2] * k];
};

function Summary({ b, table, standings }: { b: Broadcast; table?: Table; standings: Standing[] }) {
  const live = b.status === 'live';
  const alive = standings.filter((s) => !s.out && !s.place);
  const avg = alive.length ? alive.reduce((a, s) => a + s.chips, 0) / alive.length : 0;
  const recent = table?.log.slice(0, 4) ?? [];
  return (
    <div className="grid gap-0 md:grid-cols-[1fr_340px]">
      <div>
        {live && (
          <Section title="Right now" icon="⏱" right={<SampleNote />}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [String(alive.length), 'Players left'],
                [fmtChips(alive[0]?.chips ?? 0), 'Chip leader'],
                [fmtChips(blindsNow(b, table)[1]), 'Big blind'],
                [fmtChips(avg), 'Avg stack'],
              ].map(([v, l]) => (
                <div key={l} className="rounded border border-line bg-surface p-3 text-center">
                  <div className="text-[22px] font-black tabular-nums">{v}</div>
                  <div className="eyebrow mt-0.5 !text-[10px]">{l}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Level {12 + (table?.level ?? 0)} · Blinds {fmtBlinds(blindsNow(b, table))} · Hand #{table?.hand}. {PLAYERS[alive[0].pid].name} leads with {Math.round((alive[0].chips / (avg * alive.length)) * 100)}% of the chips in play.
            </p>
          </Section>
        )}
        {live && (
          <Section title="Latest hands" icon="🃏">
            <ul className="divide-y divide-line">
              {recent.map((h) => (
                <li key={h.no} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="w-12 text-subtle tabular-nums">#{h.no}</span>
                  <span className="flex-1">
                    <PlayerLink pid={h.winner} /> wins {fmtChips(h.pot)}
                    {h.eliminated && <span className="text-red"> · <PlayerLink pid={h.eliminated} /> eliminated</span>}
                  </span>
                  <span className="text-[11px] text-subtle">{h.time}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {!live && (
          <Section title={b.result ? 'Result' : 'About this broadcast'} icon="🏆" right={<SampleNote>Sample data</SampleNote>}>
            {b.result ? (
              <ol className="divide-y divide-line">
                {b.result.map((r) => (
                  <li key={r.pid} className="flex items-center gap-3 py-2">
                    <span className="w-10 text-[15px] font-black">{ordinal(r.place)}</span>
                    <Avatar pid={r.pid} size={30} />
                    <PlayerLink pid={r.pid} full className="text-[14px]" />
                    <span className="ml-auto text-[12px] text-subtle">{PLAYERS[r.pid].country}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-muted">
                The full {b.day} broadcast from the {b.table}, {b.started.toLowerCase()}. Pick up where you left off, or open a key hand below.
              </p>
            )}
          </Section>
        )}
      </div>
      <aside className="md:border-l md:border-line">
        {b.payouts.length > 0 && (
          <Section title="Payouts" icon="💵">
            <ul className="space-y-1 text-[13px]">
              {b.payouts.map((p) => {
                const who = standings.find((s) => s.out === p.place);
                return (
                  <li key={p.place} className={`flex justify-between rounded px-2 py-1.5 ${who ? 'bg-surface text-muted' : ''}`}>
                    <span>{ordinal(p.place)} {who && <>· <PlayerLink pid={who.pid} /></>}</span>
                    <span className="font-semibold tabular-nums">{p.amount}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
        <Section title="Up next" icon="📅" right={<Link to="/schedule" className="text-[12px] text-muted hover:text-white">Schedule →</Link>}>
          <UpNext />
        </Section>
      </aside>
    </div>
  );
}

function UpNext() {
  const { ticker } = useSession();
  const next = ticker.filter((x) => x.status === 'upcoming');
  if (!next.length) return <p className="text-[13px] text-muted">Nothing else scheduled today.</p>;
  return (
    <ul className="space-y-2">
      {next.map((x) => (
        <li key={x.id}>
          <Link to={`/event/${x.id}`} className="flex items-center gap-3 rounded border border-line p-2 hover:border-line-strong">
            <img src={`${__NAS__}${x.still}`} alt="" className="h-10 w-16 rounded-sm object-cover" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{x.title}</div>
              <div className="text-[11px] text-muted">{x.startsAt}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BoxScore({ b, table, standings }: { b: Broadcast; table?: Table; standings: Standing[] }) {
  const live = b.status === 'live';
  const total = standings.reduce((a, s) => a + s.chips, 0) || 1;
  const stats = (pid: PlayerId) => {
    const log = table?.log ?? [];
    const played = log.filter((h) => h.street.some((s) => s.actions.some((a) => a.pid === pid)));
    const won = log.filter((h) => h.winner === pid);
    const biggest = Math.max(0, ...won.map((h) => h.pot));
    return { played: played.length, won: won.length, biggest, vpip: log.length ? Math.round((played.length / log.length) * 100) : 0 };
  };
  if (!live) {
    return (
      <Section title="Players" icon="👤">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {standings.map((s) => (
            <Link key={s.pid} to={`/players/${s.pid}`} className="flex flex-col items-center rounded border border-line p-3 text-center hover:border-line-strong">
              <Avatar pid={s.pid} />
              <div className="mt-2 text-[13px] font-bold">{PLAYERS[s.pid].name}</div>
              <div className="text-[11px] text-muted">{PLAYERS[s.pid].country}</div>
              {s.place && <div className="mt-1 text-[12px] font-bold">{ordinal(s.place)}</div>}
            </Link>
          ))}
        </div>
      </Section>
    );
  }
  return (
    <Section title={`${b.short} · Chip counts`} icon="📊" right={<SampleNote>EBS Chip Management · sample</SampleNote>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wider text-subtle uppercase">
              <th className="py-2 pr-2">#</th>
              <th className="py-2">Player</th>
              <th className="py-2 text-right">Chips</th>
              <th className="py-2 text-right">BB</th>
              <th className="py-2 text-right">% of chips</th>
              <th className="py-2 text-right">Hands played</th>
              <th className="py-2 text-right">Won</th>
              <th className="py-2 text-right">VPIP</th>
              <th className="py-2 text-right">Biggest pot</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const st = stats(s.pid);
              return (
                <tr key={s.pid} className={`border-b border-line ${s.out ? 'text-subtle' : ''}`}>
                  <td className="py-2 pr-2 text-subtle">{s.out ? ordinal(s.out) : i + 1}</td>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <Avatar pid={s.pid} size={26} dim={!!s.out} />
                      <PlayerLink pid={s.pid} full />
                      <span className="text-[11px] text-subtle">{PLAYERS[s.pid].cc}</span>
                    </span>
                  </td>
                  {s.out ? (
                    <td colSpan={7} className="py-2 text-right text-[12px]">Eliminated in {ordinal(s.out)} · {b.payouts.find((p) => p.place === s.out)?.amount}</td>
                  ) : (
                    <>
                      <td className="py-2 text-right font-bold">{s.chips.toLocaleString()}</td>
                      <td className="py-2 text-right">{Math.round(s.chips / bigBlind(b, table))}</td>
                      <td className="py-2 text-right">{((s.chips / total) * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right">{st.played}</td>
                      <td className="py-2 text-right">{st.won}</td>
                      <td className="py-2 text-right">{st.vpip}%</td>
                      <td className="py-2 text-right">{st.biggest ? fmtChips(st.biggest) : '–'}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function HandHistory({ b, table }: { b: Broadcast; table: Table }) {
  const [open, setOpen] = useState<number | null>(table.log[0]?.no ?? null);
  const [who, setWho] = useState<PlayerId | 'all'>('all');
  const hands = table.log.filter((h) => who === 'all' || h.street.some((s) => s.actions.some((a) => a.pid === who)));
  return (
    <Section title="Hand history" icon="🃏" right={<SampleNote>EBS Hand History · sample</SampleNote>}>
      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
        {(['all', ...b.seats.map((s) => s.pid)] as const).map((p) => (
          <button key={p} onClick={() => setWho(p)} className={`rounded-full border px-3 py-1 text-[12px] whitespace-nowrap ${who === p ? 'border-white bg-white text-black' : 'border-line text-muted'}`}>
            {p === 'all' ? 'All hands' : PLAYERS[p].short}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line rounded border border-line">
        {hands.map((h, i) => {
          const clip = clipFor(b.id, h.no);
          const isOpen = open === h.no;
          return (
            <li key={h.no} className={i === 0 && who === 'all' ? 'flash' : ''}>
              <button onClick={() => setOpen(isOpen ? null : h.no)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-surface">
                <span className="w-14 font-bold tabular-nums">#{h.no}</span>
                <span className="min-w-0 flex-1 truncate">
                  {PLAYERS[h.winner].short} wins {fmtChips(h.pot)}
                  {h.eliminated && <span className="text-red"> · {PLAYERS[h.eliminated].short} out</span>}
                  {h.street.some((s) => s.actions.some((a) => a.text.includes('all in'))) && !h.eliminated && <span className="text-gold"> · all in</span>}
                </span>
                {clip && <span className="chip bg-red/20 text-red-strong">▶ Replay</span>}
                <span className="w-16 text-right text-[11px] text-subtle">{h.time}</span>
                <span className="text-subtle">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="bg-surface px-3 pt-1 pb-3 text-[13px]">
                  {h.street.map((s) => (
                    <div key={s.name} className="mt-2">
                      <div className="text-[11px] font-bold tracking-wider text-subtle uppercase">
                        {s.name} {s.board && <span className="ml-1 font-mono text-white normal-case">{s.board}</span>}
                      </div>
                      {s.actions.map((a, k) => (
                        <div key={k} className="pl-2">
                          <PlayerLink pid={a.pid} /> <span className="text-muted">{a.text}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="mt-2 font-semibold">→ <PlayerLink pid={h.winner} /> wins {fmtChips(h.pot)}</div>
                  {clip && (
                    <Link to={`/hands/${clip.id}`} className="btn mt-3">▶ Watch the replay: {clip.title}</Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

const SERIES_COLORS = ['#ffffff', '#ed1c23', '#d4af37', '#4ea1ff', '#3ecf8e', '#c084fc', '#ff8a3d'];

function Charts({ b, table }: { b: Broadcast; table: Table }) {
  const W = 760;
  const H = 280;
  const pad = { l: 44, r: 12, t: 10, b: 24 };
  const hist = table.history;
  const max = Math.max(...hist.flatMap((h) => Object.values(h.chips) as number[]));
  const x = (i: number) => pad.l + (i / Math.max(1, hist.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const [hover, setHover] = useState<number | null>(null);
  const hi = hover ?? hist.length - 1;
  return (
    <Section title="Chip stacks, hand by hand" icon="📈" right={<SampleNote />}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px]"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            setHover(Math.max(0, Math.min(hist.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (hist.length - 1)))));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#262626" />
              <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#8a8a8a">{fmtChips(max * f)}</text>
            </g>
          ))}
          {b.seats.map((s, k) => (
            <polyline
              key={s.pid}
              fill="none"
              stroke={SERIES_COLORS[k % SERIES_COLORS.length]}
              strokeWidth={2}
              strokeLinejoin="round"
              points={hist.map((h, i) => `${x(i)},${y(h.chips[s.pid] ?? 0)}`).join(' ')}
            />
          ))}
          <line x1={x(hi)} x2={x(hi)} y1={pad.t} y2={H - pad.b} stroke="#555" strokeDasharray="3 3" />
          <text x={pad.l} y={H - 6} fontSize="10" fill="#8a8a8a">Hand #{hist[0].hand}</text>
          <text x={W - pad.r} y={H - 6} fontSize="10" fill="#8a8a8a" textAnchor="end">Hand #{hist[hist.length - 1].hand}</text>
        </svg>
      </div>
      <div className="mt-2 text-[12px] text-muted">Hand #{hist[hi].hand}</div>
      <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3 md:grid-cols-4">
        {b.seats.map((s, k) => (
          <li key={s.pid} className="flex items-center gap-2">
            <span className="h-0.5 w-4" style={{ background: SERIES_COLORS[k % SERIES_COLORS.length] }} />
            <PlayerLink pid={s.pid} />
            <span className="ml-auto tabular-nums text-muted">{fmtChips(hist[hi].chips[s.pid] ?? 0)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
