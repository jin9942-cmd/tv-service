/**
 * Demo clock. The demo is set in the off-season before the 2026 World Series of Poker (May 26 – Jul 15, 2026), with
 * the 2025 season finished: every `Date.now()` / `new Date()` reads that moment, plus the real time that has
 * passed since the page loaded (so countdowns and live clocks keep moving). Imported first in main.tsx, before any
 * data module computes its dates.
 */
export const DEMO_NOW = Date.parse('2026-05-15T19:00:00Z'); // Fri May 15, 2026: the off-season, eleven days before the 2026 World Series of Poker

const RealDate = Date;
const offset = DEMO_NOW - RealDate.now();

class DemoDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(RealDate.now() + offset);
    else super(...(args as [string | number | Date]));
  }
  static now() {
    return RealDate.now() + offset;
  }
}

globalThis.Date = DemoDate as DateConstructor;
