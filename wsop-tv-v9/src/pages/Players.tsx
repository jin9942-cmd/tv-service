import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { clipsFor, fmtChips, liveBroadcastOf, nas, ordinal, pastFinals, PLAYERS, type PlayerId } from '../data/demo';
import { useSession, useTable } from '../lib/state';
import { Avatar, ClipCard, Page, SampleNote, Section } from '../components/ui';

/** [P] Player profile — the timeline portal. PAST FINALS opens that season's final in the [T] frame, as a replay. */
export function PlayerProfile() {
  const { pid } = useParams();
  const p = PLAYERS[pid as PlayerId];
  const { ticker } = useSession();
  const liveB = p ? liveBroadcastOf(p.id) : undefined;
  const onAir = liveB && ticker.find((x) => x.id === liveB.id)?.status === 'live';
  const table = useTable(onAir ? liveB!.id : undefined);
  if (!p) return <Navigate to="/players" replace />;
  const chips = table?.chips[p.id];
  const clips = clipsFor(p.id);
  const finals = pastFinals(p.id);

  return (
    <Page>
      <div className="flex flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center md:px-6">
        <div className="grid h-28 w-28 shrink-0 place-items-center border-2 border-white bg-surface-2 text-[40px] font-black sm:h-32 sm:w-32">{p.initials}</div>
        <div className="min-w-0">
          <h1 className="display text-[28px] md:text-[34px]">{p.name}</h1>
          <div className="text-[13px] text-muted">
            {p.cc} {p.country}
            {p.tag && ` · ${p.tag}`}
          </div>
          <div className="mt-3 flex flex-wrap gap-6">
            {[
              [String(p.bracelets), 'Bracelets'],
              [p.earnings, 'Earnings'],
              [String(p.poy), 'POY titles'],
              ...(chips ? [[fmtChips(chips), `${liveB!.short} chips`]] : []),
            ].map(([v, l]) => (
              <div key={l}>
                <div className="text-[22px] font-black tabular-nums">{v}</div>
                <div className="eyebrow !text-[10px]">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {onAir && chips ? (
              <Link to={`/watch/${liveB!.id}`} className="btn btn-white"><span className="live-dot text-red" /> Watch live ({liveB!.short})</Link>
            ) : null}
            <a href="#videos" className="btn">All videos</a>
            <a href="#finals" className="btn">Past finals</a>
          </div>
        </div>
      </div>
      <p className="px-4 pb-4 text-[14px] text-white/85 md:px-6">{p.bio}</p>

      <Section title={`${p.name} highlights`} icon="🎞" right={<span className="text-[12px] text-subtle">{clips.length} clips</span>}>
        <div id="videos" className="scroll-mt-28">
          {clips.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{clips.map((c) => <ClipCard key={c.id} c={c} />)}</div>
          ) : (
            <p className="text-[13px] text-muted">No clips with {p.name} yet.</p>
          )}
        </div>
      </Section>

      <Section title="Past finals" icon="⏳" right={<SampleNote>Sample results</SampleNote>}>
        <div id="finals" className="scroll-mt-28">
          {finals.length ? (
            <ol className="relative space-y-2 border-l border-line-strong pl-5">
              {finals.map(({ broadcast: b, place }) => (
                <li key={b.id} className="relative">
                  <span className={`absolute top-4 -left-[26px] h-2.5 w-2.5 rounded-full ${place === 1 ? 'bg-gold' : 'bg-line-strong'}`} />
                  <Link to={`/watch/${b.id}`} className="flex items-center gap-3 rounded border border-line p-2 hover:border-line-strong">
                    <img src={nas(b.still)} alt="" className="h-12 w-20 shrink-0 rounded-sm object-cover sm:h-14 sm:w-24" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-subtle">{b.season} · {b.eventNo}</div>
                      <div className="truncate text-[14px] font-semibold">{b.title}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[16px] font-black ${place === 1 ? 'text-gold' : ''}`}>{place === 1 ? '🏆 1st' : ordinal(place)}</div>
                      <div className="text-[11px] text-muted">▶ Replay</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-muted">No televised finals in the archive yet.</p>
          )}
        </div>
      </Section>

      <Section title="Career statistics" icon="📊" right={<SampleNote>Sample data</SampleNote>}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            [String(p.cashes), 'WSOP cashes'],
            [String(p.finalTables), 'Final tables'],
            [String(p.firstBracelet), 'First bracelet'],
            [p.itm, 'ITM rate'],
          ].map(([v, l]) => (
            <div key={l} className="rounded border border-line bg-surface p-4 text-center">
              <div className="text-[24px] font-black">{v}</div>
              <div className="eyebrow mt-1 !text-[10px]">{l}</div>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

/** Players at the live final tables (the leaderboard as cards). */
export function PlayersList() {
  const { ticker } = useSession();
  const live = ticker.filter((b) => b.status === 'live');
  const [sel, setSel] = useState(0);
  const b = live[sel];
  const table = useTable(b?.id);
  const others = (Object.keys(PLAYERS) as PlayerId[]).filter((id) => !b?.seats.some((s) => s.pid === id));
  return (
    <Page>
      {b ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-6 pb-3 md:px-6">
            <div>
              <h1 className="display text-[22px]">{b.title}</h1>
              <div className="text-[12px] text-muted">{b.sub} · {b.prize}</div>
            </div>
            <div className="flex gap-1.5">
              {live.map((x, i) => (
                <button key={x.id} onClick={() => setSel(i)} className={`rounded-full border px-3 py-1 text-[12px] ${i === sel ? 'border-white bg-white text-black' : 'border-line text-muted'}`}>
                  {x.short}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3 md:grid-cols-4 md:px-6">
            {[...b.seats]
              .sort((x, y) => (table?.chips[y.pid] ?? 0) - (table?.chips[x.pid] ?? 0))
              .map((s, i) => {
                const p = PLAYERS[s.pid];
                const c = table?.chips[s.pid] ?? 0;
                const out = table?.out.find((o) => o.pid === s.pid);
                return (
                  <Link key={s.pid} to={`/players/${s.pid}`} className={`flex flex-col items-center rounded border p-4 text-center ${out ? 'border-line opacity-50' : 'border-line hover:border-line-strong'}`}>
                    <Avatar pid={s.pid} size={56} dim={!!out} />
                    <div className="mt-2 text-[14px] font-bold">{p.short}</div>
                    <div className="text-[11px] text-muted">{p.cc} {p.country}</div>
                    {out ? (
                      <div className="mt-2 text-[12px] text-muted">Eliminated · {ordinal(out.place)}</div>
                    ) : (
                      <div className="mt-2 flex gap-4">
                        <div><div className="text-[16px] font-black tabular-nums">{fmtChips(c)}</div><div className="text-[10px] text-subtle">Chips</div></div>
                        <div><div className="text-[16px] font-black tabular-nums">{Math.round(c / b.blinds[1])}</div><div className="text-[10px] text-subtle">BB</div></div>
                      </div>
                    )}
                    <span className={`mt-2 rounded-sm border px-2 py-0.5 text-[10px] font-bold ${i === 0 && !out ? 'border-white bg-white text-black' : 'border-line-strong text-muted'}`}>
                      {i === 0 && !out ? 'CHIP LEADER' : `${p.bracelets} bracelet${p.bracelets === 1 ? '' : 's'}`}
                    </span>
                  </Link>
                );
              })}
          </div>
        </>
      ) : (
        <div className="px-6 py-10 text-center text-muted">No final table is live right now. Every player is below.</div>
      )}
      <Section title="More players" icon="👤">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {others.map((id) => (
            <Link key={id} to={`/players/${id}`} className="flex items-center gap-3 rounded border border-line p-2.5 hover:border-line-strong">
              <Avatar pid={id} size={36} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold">{PLAYERS[id].name}</div>
                <div className="text-[11px] text-muted">{PLAYERS[id].bracelets} bracelets</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  );
}
