// Simulated live chip counts: every few seconds stacks drift a little while the total stays constant.
import { useEffect, useState } from 'react';
import { finalTableSeats } from '../data/mock';

export interface SeatStack {
  playerId: string;
  stack: number;
  delta: number;
}

const TOTAL = finalTableSeats.reduce((n, s) => n + s.stack, 0);

function compute(tick: number): SeatStack[] {
  const raw = finalTableSeats.map((s, i) => s.stack * (1 + 0.06 * Math.sin(tick * 0.9 + i * 1.7) + 0.03 * Math.cos(tick * 0.37 + i)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const prev = finalTableSeats.map((s, i) => s.stack * (1 + 0.06 * Math.sin((tick - 1) * 0.9 + i * 1.7) + 0.03 * Math.cos((tick - 1) * 0.37 + i)));
  const prevSum = prev.reduce((a, b) => a + b, 0);
  return finalTableSeats
    .map((s, i) => {
      const stack = Math.round(((raw[i] / sum) * TOTAL) / 25_000) * 25_000;
      const before = Math.round(((prev[i] / prevSum) * TOTAL) / 25_000) * 25_000;
      return { playerId: s.playerId, stack, delta: stack - before };
    })
    .sort((a, b) => b.stack - a.stack);
}

export function useLiveStacks(intervalMs = 3500) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return compute(tick);
}

/** Simple equity split for the Pro overlay (two players in the current hand). */
// A♠K♠ vs Q♥Q♦ on K♦ 9♠ 4♣ → 2♥ → J♠ (queens have two outs after the flop).
export const EQUITY = [
  { phase: 'Flop', a: 91, b: 9 },
  { phase: 'Turn', a: 95, b: 5 },
  { phase: 'River', a: 100, b: 0 },
];
