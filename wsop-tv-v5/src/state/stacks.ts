// Chip counts for the featured table of a broadcast. Live: stacks drift a little every few seconds while the total stays
// constant. Replay: the counts at that point of the broadcast (static).
import { useEffect, useMemo, useState } from 'react';

export interface SeatStack {
  playerId: string;
  stack: number;
  delta: number;
}

type Base = { playerId: string; stack: number }[];

function compute(base: Base, tick: number): SeatStack[] {
  const total = base.reduce((n, s) => n + s.stack, 0);
  const unit = Math.max(1_000, Math.round(total / base.length / 2_000 / 1_000) * 1_000);
  const at = (t: number) => base.map((s, i) => s.stack * (1 + 0.06 * Math.sin(t * 0.9 + i * 1.7) + 0.03 * Math.cos(t * 0.37 + i)));
  const raw = at(tick);
  const prev = at(tick - 1);
  const sum = raw.reduce((a, b) => a + b, 0);
  const prevSum = prev.reduce((a, b) => a + b, 0);
  return base
    .map((s, i) => {
      if (tick === 0) return { playerId: s.playerId, stack: s.stack, delta: 0 };
      const stack = Math.round(((raw[i] / sum) * total) / unit) * unit;
      const before = Math.round(((prev[i] / prevSum) * total) / unit) * unit;
      return { playerId: s.playerId, stack, delta: stack - before };
    })
    .sort((a, b) => b.stack - a.stack);
}

export function useLiveStacks(base: Base, live = true, intervalMs = 3500) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(0);
    if (!live) return;
    const t = window.setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs, live, base]);
  return useMemo(() => compute(base, live ? tick : 0), [base, live, tick]);
}

// A♠K♠ vs Q♥Q♦ on K♦ 9♠ 4♣ → 2♥ → J♠ (queens have two outs after the flop).
export const EQUITY = [
  { phase: 'Flop', a: 91, b: 9 },
  { phase: 'Turn', a: 95, b: 5 },
  { phase: 'River', a: 100, b: 0 },
];
