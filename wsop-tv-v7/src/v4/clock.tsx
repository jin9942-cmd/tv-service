// Tournament Clock: the clock of the tournament running now, on Home above the 24/7 channels while a series is on.
// It is not tied to any broadcast: it shows where the event stands (field, level, blinds) so viewers feel the room.
// Live service: WSOP's clock API (already supplied to outside vendors) feeds it; TTN only lays it out. Demo: one
// sample reading of the 2026 Main Event final table (entries and prize pool as reported; level and blinds a sample),
// with the level's time counting down in the page.
import { useEffect, useState } from 'react';
import { money } from '../lib/format';

type Clock = {
  event: string;
  totalPrize: number;
  entries: number;
  left: number;
  level: number;
  /** Seconds left in the level when the page opened. */
  levelLeft: number;
  /** Seconds per level (the countdown starts again from here). */
  levelLength: number;
  blinds: string;
  ante?: string;
};

const CLOCKS: Clock[] = [
  { event: 'Event #82 · $10,000 Main Event', totalPrize: 85_634_400, entries: 9_208, left: 9, level: 40, levelLeft: 41 * 60 + 18, levelLength: 120 * 60, blinds: '800K / 1.6M', ante: '1.6M BB ante' },
];

const mmss = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

export function TournamentClock() {
  const [opened] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const c = CLOCKS[0];
  if (!c) return null;
  const gone = Math.floor((now - opened) / 1000);
  const left = (((c.levelLeft - gone) % c.levelLength) + c.levelLength) % c.levelLength;
  const stats: [string, string, string?][] = [
    ['Total Prize', money(c.totalPrize)],
    ['Total Entries', c.entries.toLocaleString('en-US')],
    ['Players Left', `${c.left.toLocaleString('en-US')} / ${c.entries.toLocaleString('en-US')}`],
    ['Level', String(c.level)],
    ['Level ends in', mmss(left)],
    ['Blinds', c.blinds, c.ante],
  ];
  return (
    <section aria-label="Tournament Clock" className="rounded-panel border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl sm:text-2xl">Tournament Clock</h2>
        <p className="text-sm font-semibold text-text/85">{c.event}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v, sub]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{k}</dt>
            <dd className={k === 'Level ends in' ? 'mt-1 font-display text-2xl text-gold-strong tnum' : 'mt-1 truncate font-display text-2xl tnum'}>{v}</dd>
            {sub && <dd className="text-xs text-muted tnum">{sub}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}
