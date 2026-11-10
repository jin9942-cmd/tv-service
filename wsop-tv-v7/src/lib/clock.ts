/**
 * Demo clock. The demo is set during the 2025 World Series of Poker in Las Vegas (May 27 – Jul 16, 2025), on the
 * day of the Main Event final table: every `Date.now()` / `new Date()` reads that moment, plus the real time that has
 * passed since the page loaded (so countdowns and live clocks keep moving). Imported first in main.tsx, before any
 * data module computes its dates.
 */
export const DEMO_NOW = Date.parse('2025-07-15T23:30:00Z'); // Tue Jul 15, 2025, 4:30 PM in Las Vegas: the Main Event final table, seven left

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
