// Tournament Clock: the clocks of the tournaments running now, on Home above the 24/7 channels while a series is on.
// They are not tied to any broadcast: each shows where its event stands (field, level, blinds) so viewers feel the room.
// Up to six clocks, four in view, the arrows step through the rest. Live service: WSOP's clock API (already supplied
// to outside vendors) feeds them; TTN only lays them out. Each clock carries its series name under it, centered. Demo: sample
// readings of five WSOP Circuit stops, with each level's time counting down in the page.
import { useEffect, useState } from 'react';
import { Carousel } from './carousel';

type Clock = {
  /** The series it belongs to, shown above the clock. */
  series: string;
  event: string;
  totalPrize: number;
  entries: number;
  left: number;
  level: number;
  /** Seconds left in the level when the page opened. */
  levelLeft: number;
  /** Seconds per level (the countdown starts again from here). */
  levelLength: number;
  /** Small blind / big blind (big blind ante). */
  blinds: string;
};

const CLOCKS: Clock[] = [
  { series: 'WSOP Circuit - Playground', event: 'Event #12: $1,700 Main Event', totalPrize: 1_418_000, entries: 911, left: 214, level: 18, levelLeft: 41 * 60 + 18, levelLength: 60 * 60, blinds: '6,000 / 12,000 (12,000)' },
  { series: 'WSOP Circuit - City Center Rosario', event: 'Event #8: $1,100 Main Event', totalPrize: 652_300, entries: 641, left: 96, level: 21, levelLeft: 22 * 60 + 40, levelLength: 45 * 60, blinds: '10,000 / 20,000 (20,000)' },
  { series: 'WSOP Circuit - Panama City', event: 'Event #5: $400 Monster Stack', totalPrize: 287_600, entries: 806, left: 342, level: 9, levelLeft: 4 * 60 + 59, levelLength: 30 * 60, blinds: '1,000 / 2,000 (2,000)' },
  { series: 'WSOP Circuit Casino Middelkerke', event: 'Event #10: €1,100 Main Event', totalPrize: 1_000_000, entries: 1_118, left: 582, level: 14, levelLeft: 31 * 60 + 5, levelLength: 40 * 60, blinds: '2,500 / 5,000 (5,000)' },
  { series: 'WSOP Circuit - Caesars New Orleans', event: 'Event #3: $600 Deepstack', totalPrize: 412_200, entries: 763, left: 501, level: 7, levelLeft: 48 * 60 + 12, levelLength: 30 * 60, blinds: '500 / 1,000 (1,000)' },
].slice(0, 6);

const clockTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/** The WSOP clock backgrounds (blue, gold, palms, green), taking turns across the cards. */
const BACKGROUNDS = [1, 2, 3, 4].map((n) => `${import.meta.env.BASE_URL}clock/bg-${n}.jpg`);

export function TournamentClock() {
  const [opened] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!CLOCKS.length) return null;
  const gone = Math.floor((now - opened) / 1000);
  return (
    <section aria-label="Tournament Clock">
      <Carousel label="Tournament clocks" className="gap-3 [&>*]:w-[85%] sm:[&>*]:w-[calc((100%-0.75rem)/2)] lg:[&>*]:w-[calc((100%-3*0.75rem)/4)]">
        {CLOCKS.map((c, i) => {
          const left = (((c.levelLeft - gone) % c.levelLength) + c.levelLength) % c.levelLength;
          return (
            <li key={c.series + c.event} className="flex min-w-0 flex-col">
              {/* The WSOP clock look: its backgrounds in turn, the time large and white, prize in gold, field in green. */}
              <article className="relative flex-1 overflow-hidden rounded-panel border border-white/10 bg-cover bg-center p-3.5 text-white" style={{ backgroundImage: `url(${BACKGROUNDS[i % BACKGROUNDS.length]})` }}>
                <div className="relative text-center">
                  <p className="truncate text-sm font-bold" title={c.event}>{c.event}</p>
                  <p className="mt-2 text-xs font-semibold text-white/80">Level {c.level}</p>
                  <p className="font-display text-4xl leading-none tnum">{clockTime(left)}</p>
                  <p className="mt-2 text-[11px] text-white/70">Blinds</p>
                  <p className="text-sm font-semibold tnum">{c.blinds}</p>
                </div>
                <dl className="relative mt-3 grid grid-cols-3 border-t border-white/15 pt-2.5 text-center">
                  {[
                    ['Total Prize', usd(c.totalPrize), 'text-[#f5c542]'],
                    ['Total Entries', c.entries.toLocaleString('en-US'), 'text-[#8ee05a]'],
                    ['Players', `${c.left.toLocaleString('en-US')} / ${c.entries.toLocaleString('en-US')}`, 'text-[#8ee05a]'],
                  ].map(([k, v, tone]) => (
                    <div key={k} className="min-w-0 px-1">
                      <dt className="truncate text-[10px] text-white/75">{k}</dt>
                      <dd className={`mt-0.5 truncate text-[13px] font-bold tnum ${tone}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
              {/* The series under its clock, centered, toned down (the same series can repeat side by side). */}
              <h3 className="mt-2 truncate text-center text-sm font-normal text-muted" title={c.series}>{c.series}</h3>
            </li>
          );
        })}
      </Carousel>
    </section>
  );
}
