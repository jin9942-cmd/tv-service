// Demo data: a reconstruction of the real 2025 World Series of Poker in Las Vegas (May 27 – Jul 16, 2025), set on
// Tuesday Jul 15, the first day of the Main Event final table, at the moment the broadcast still on the hero shows
// (seven left, Mizrachi the chip leader). Every name, field, prize pool, first prize, winner, date and chip count below
// is from the published results (PokerNews live reporting, cross-checked with CardPlayer; sources beside each block).
// What isn't published (broadcast lengths, the pots of most clips, earlier days' feature tables) stays generic and
// names nobody: no real player is put in a hand or at a table they weren't at.
// Times are relative to the demo clock (lib/clock.ts), so the demo always opens on that moment.
import type { Access, ArchiveItem, Day, DayLabel, Hand, Player, Series, StreamStatus, TableFeed, TourEvent } from './types';
import { PRESENTATION } from './policy';

export const T0 = Date.now();
const H = 3_600_000;
const iso = (hoursFromNow: number) => new Date(T0 + hoursFromNow * H).toISOString();
/** Hours from now to a fixed moment (ISO, UTC). */
const at = (whenIso: string) => (Date.parse(whenIso) - T0) / H;
/** Noon in Las Vegas (PDT) on a July/June 2025 date, the usual start of a WSOP day: '2025-07-02' → hours from now. */
const noon = (date: string) => at(`${date}T19:00:00Z`);

// ---- players ------------------------------------------------------------------------------------
// Real players only: the 2025 Main Event final table, the 2025 winners of the broadcast events, and the champions of
// the classics. Bracelet counts only where a source states them (as of the demo moment, before the Main Event ends).

const P = (id: string, name: string, country: string, cc: string, hue: number, bracelets?: number): Player => ({ id, name, country, cc, bracelets, recent: [], hue });

export const players: Player[] = [
  // 2025 Main Event final table (https://www.pokernews.com/tours/wsop/2025-wsop/event-81-10000-wsop-main-event/?highlights=1)
  P('mizrachi', 'Michael Mizrachi', 'United States', 'US', 20, 8), // the 2025 $50K PPC (7th) and Main Event (8th)
  P('wasnock', 'John Wasnock', 'United States', 'US', 210),
  P('dunaway', 'Braxton Dunaway', 'United States', 'US', 140, 1), // 2023 #39 Monster Stack
  P('hallaert', 'Kenny Hallaert', 'Belgium', 'BE', 270),
  P('bojovic', 'Luka Bojovic', 'Serbia', 'RS', 330),
  P('hendrix', 'Adam Hendrix', 'United States', 'US', 170),
  P('margets', 'Leo Margets', 'Spain', 'ES', 0, 1), // 2021 #83 The Closer
  P('minghini', 'Jarod Minghini', 'United States', 'US', 50),
  P('dhlee', 'Daehyung Lee', 'South Korea', 'KR', 300),
  // 2025 winners of the broadcast events
  P('wilklow', 'Michael Wilklow', 'United States', 'US', 190),
  P('martirosian', 'Artur Martirosian', 'Russia', 'RU', 230),
  P('roiter', 'Klemens Roiter', 'Austria', 'AT', 120),
  P('vieira', 'Joao Vieira', 'Portugal', 'PT', 260),
  P('davies', 'Seth Davies', 'United States', 'US', 215),
  P('lim', 'Brett Lim', 'United States', 'US', 350),
  P('okamoto', 'Shiina Okamoto', 'Japan', 'JP', 320),
  P('wang', 'Michael Wang', 'United States', 'US', 200),
  P('soverel', 'Sam Soverel', 'United States', 'US', 40, 3), // #94 (decided Jul 15, 2025) was his 3rd
  P('kenney', 'Bryn Kenney', 'United States', 'US', 290),
  P('foxen', 'Alex Foxen', 'United States', 'US', 30),
  // Champions of the classics
  P('ensan', 'Hossein Ensan', 'Germany', 'DE', 240),
  P('cates', 'Dan Cates', 'United States', 'US', 160),
  P('weinman', 'Daniel Weinman', 'United States', 'US', 280),
  // 2024 WSOP Paradise Super Main Event champion
  P('zhou', 'Yinan Zhou', 'China', 'CN', 100),
  // 2025 WSOP Europe and 2025 WSOP Paradise Main Event champions
  P('pidun', 'Daniel Pidun', 'Germany', 'DE', 60),
  P('binder', 'Bernhard Binder', 'Austria', 'AT', 15),
  // A bracelet legend (Browse > Players links to him); no 2025 results are claimed for him here.
  { ...P('p04', 'Daniel Negreanu', 'Canada', 'CA', 270), photo: `${import.meta.env.BASE_URL}promo/negreanu-avatar.webp` },
];

// ---- series & events ----------------------------------------------------------------------------

// https://www.pokernews.com/news/2025/02/2025-world-series-of-poker-schedule-47958.htm
// The season around the demo moment (Jul 15, 2025), as the schedule shows it: the stop before Las Vegas (past),
// Las Vegas (live), and the next two (announced; nothing about their results is shown). Dates and venues:
// 2024 Paradise https://www.pokernews.com/tours/world-series-of-poker-paradise/2024-wsop-paradise/event-9-25-000-wsop-super-main-event/
// 2025 WSOPC schedule (Canada, WSOP Europe) https://www.pokernews.com/news/2025/06/2025-world-series-of-poker-wsop-circuit-schedule-48804.htm
export const series: Series[] = [
  { id: 'pa24', name: '2024 WSOP Paradise', venue: 'Atlantis Paradise Island', city: 'Paradise Island, Bahamas', tz: 'America/Nassau', start: '2024-12-06T15:00:00Z', end: '2024-12-20T04:59:00Z' },
  { id: 'lv25', name: '2025 World Series of Poker', venue: 'Horseshoe / Paris Las Vegas', city: 'Las Vegas, NV', tz: 'America/Los_Angeles', start: '2025-05-27T19:00:00Z', end: '2025-07-17T06:59:00Z' },

  { id: 'eu25', name: '2025 WSOP Europe', venue: 'King’s Resort', city: 'Rozvadov, CZ', tz: 'Europe/Prague', start: '2025-09-17T10:00:00Z', end: '2025-10-09T21:59:00Z' },
  // 2025 WSOP Paradise, Dec 4 – 18 (the Super Main Event ended Dec 18): https://www.pokernews.com/tours/world-series-of-poker-paradise/2025-wsop-paradise/event-11-25000-super-main-event/
  { id: 'pa25', name: '2025 WSOP Paradise', venue: 'Atlantis Paradise Island', city: 'Paradise Island, Bahamas', tz: 'America/Nassau', start: '2025-12-04T15:00:00Z', end: '2025-12-19T04:59:00Z' },
  // 2026 World Series of Poker, May 26 – Jul 15, 2026 (the next series at the demo moment): https://www.pokernews.com/news/2026/02/2026-world-series-of-poker-schedule-50625.htm
  { id: 'lv26', name: '2026 World Series of Poker', venue: 'Horseshoe / Paris Las Vegas', city: 'Las Vegas, NV', tz: 'America/Los_Angeles', start: '2026-05-26T19:00:00Z', end: '2026-07-16T06:59:00Z' },
  // The Schedule's season (as signed off): 2025 Paradise, 2026 WSOP Europe in Prague (Mar 31 – Apr 12, 2026), the 2026
  // World Series of Poker and the 2026 WSOP Super Circuit Canada (Aug 26 – Sep 12, 2026: https://www.newswire.ca/news-releases/a-historic-first-for-canada-from-august-26-to-september-12-2026-the-wsop-super-circuit-comes-to-canada-with-more-than-14-million-in-guaranteed-prize-pools-811014038.html).
  { id: 'eu26', name: '2026 WSOP Europe', venue: 'King’s Casino Prague', city: 'Prague, CZ', tz: 'Europe/Prague', start: '2026-03-31T10:00:00Z', end: '2026-04-12T21:59:00Z' },
  { id: 'ca26', name: '2026 WSOP Super Circuit Canada', venue: 'Playground Poker Club', city: 'Kahnawake, QC', tz: 'America/Toronto', start: '2026-08-26T16:00:00Z', end: '2026-09-13T03:59:00Z' },
];

/** A final table is a single table, so its extra streams are camera feeds of that table; earlier days have outer tables. */
const FT_FEEDS = ['Main Feed', 'Clean Feed', 'Player Cam', 'Overhead Cam'];
const feeds = (prefix: string, n: number, failing?: number, finalTable?: boolean): TableFeed[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-t${i + 1}`,
    name: finalTable ? FT_FEEDS[i] : i === 0 ? 'Feature Table' : `Outer Table ${i + 1}`,
    main: i === 0,
    failing: !PRESENTATION && failing === i,
  }));

const LA = 'America/Los_Angeles';

const day = (eventId: string, label: DayLabel, startH: number, durationMin: number, status: StreamStatus, tables = 1, failing?: number): Day => {
  const id = `${eventId}-${label.replace(/\s+/g, '').toLowerCase()}`;
  return { id, label, start: iso(startH), durationMin, status, tables: feeds(id, tables, failing, label === 'Final Table') };
};
/** A finished event broadcast on its final day only (the day its winner was decided). */
const finalOnly = (id: string, date: string, minutes = 480) => [day(id, 'Final Table', noon(date), minutes, 'vod')];

const LV = 'lv25';
export const events: TourEvent[] = [
  {
    // 2024 WSOP Paradise #9 $25,000 Super Main Event: 1,978 entries, the $50M guarantee paid out, $6,000,000 to Yinan
    // Zhou (China), decided Dec 19, 2024 (PokerNews event page above).
    id: 'pa-main', seriesId: 'pa24', number: 9, name: '$25,000 Super Main Event', game: 'No-Limit Hold’em', startingStack: 250_000,
    buyIn: 25_000, entrants: 1_978, prizePool: 50_000_000, firstPrize: 6_000_000, level: 0, remaining: 1, winnerId: 'zhou',
    days: [day('pa-main', 'Final Table', at('2024-12-19T17:00:00Z'), 540, 'vod')],
  },
  // Every figure from the PokerNews event page named beside it.
  {
    // ${PN}/event-7-25000-heads-up-championship/
    id: 'lv-hu', seriesId: LV, number: 7, name: '$25,000 Heads-Up Championship', game: 'No-Limit Hold’em', startingStack: 100_000,
    buyIn: 25_000, entrants: 64, prizePool: 1_504_000, firstPrize: 500_000, level: 0, remaining: 1, winnerId: 'martirosian',
    days: finalOnly('lv-hu', '2025-06-01'),
  },
  {
    // ${PN}/event-1-1000-mystery-millions/
    id: 'lv-mmm', seriesId: LV, number: 1, name: '$1,000 Mystery Millions', game: 'No-Limit Hold’em', startingStack: 20_000,
    buyIn: 1_000, entrants: 19_654, prizePool: 17_295_520, firstPrize: 1_000_000, level: 0, remaining: 1, winnerId: 'wilklow',
    days: finalOnly('lv-mmm', '2025-06-02'),
  },
  {
    // ${PN}/event-38-100000-high-roller/
    id: 'lv-100k', seriesId: LV, number: 38, name: '$100,000 High Roller', game: 'No-Limit Hold’em', startingStack: 500_000,
    buyIn: 100_000, entrants: 103, prizePool: 9_939_500, firstPrize: 2_649_158, level: 0, remaining: 1, winnerId: 'vieira',
    days: finalOnly('lv-100k', '2025-06-13', 420),
  },
  {
    // ${PN}/event-46-250000-super-high-roller/ (runner-up Alex Foxen)
    id: 'lv-tc', seriesId: LV, number: 46, name: '$250,000 Super High Roller', game: 'No-Limit Hold’em', startingStack: 1_000_000,
    buyIn: 250_000, entrants: 63, prizePool: 15_513_750, firstPrize: 4_752_551, level: 0, remaining: 1, winnerId: 'davies',
    days: finalOnly('lv-tc', '2025-06-17', 420),
  },
  {
    // ${PN}/event-37-1500-monster-stack/ (winner named by CardPlayer)
    id: 'lv-ms', seriesId: LV, number: 37, name: '$1,500 Monster Stack', game: 'No-Limit Hold’em', startingStack: 50_000,
    buyIn: 1_500, entrants: 9_920, prizePool: 13_168_800, firstPrize: 1_204_457, level: 0, remaining: 1, winnerId: 'roiter',
    days: finalOnly('lv-ms', '2025-06-18'),
  },
  {
    // ${PN}/event-48-1000-seniors-championship/
    id: 'lv-seniors', seriesId: LV, number: 48, name: '$1,000 Seniors Championship', game: 'No-Limit Hold’em', startingStack: 40_000,
    buyIn: 1_000, entrants: 7_575, prizePool: 6_666_000, firstPrize: 653_839, level: 0, remaining: 1, winnerId: 'lim',
    days: finalOnly('lv-seniors', '2025-06-21'),
  },
  {
    // ${PN}/event-66-50000-poker-players-championship/ (runner-up Bryn Kenney)
    id: 'lv-ppc', seriesId: LV, number: 66, name: '$50,000 Poker Players Championship', game: 'Mixed Games', startingStack: 300_000,
    buyIn: 50_000, entrants: 107, prizePool: 5_082_500, firstPrize: 1_331_322, level: 0, remaining: 1, winnerId: 'mizrachi',
    days: finalOnly('lv-ppc', '2025-06-28', 540),
  },
  {
    // ${PN}/event-70-1000-ladies-championship/ (the defending champion won again)
    id: 'lv-ladies', seriesId: LV, number: 70, name: '$1,000 Ladies Championship', game: 'No-Limit Hold’em', startingStack: 40_000,
    buyIn: 1_000, entrants: 1_368, prizePool: 1_203_840, firstPrize: 184_094, level: 0, remaining: 1, winnerId: 'okamoto',
    days: finalOnly('lv-ladies', '2025-06-29', 420),
  },
  {
    // ${PN}/event-74-10000-pot-limit-omaha-championship/
    id: 'lv-plo', seriesId: LV, number: 74, name: '$10,000 Pot-Limit Omaha Championship', game: 'Pot-Limit Omaha', startingStack: 60_000,
    buyIn: 10_000, entrants: 874, prizePool: 8_128_200, firstPrize: 1_394_579, level: 0, remaining: 1, winnerId: 'wang',
    days: finalOnly('lv-plo', '2025-07-01'),
  },
  {
    // ${PN}/event-81-10000-wsop-main-event/ — 9,735 entries, 60,000 starting stack, Day 1 = five 120-minute levels.
    // The day dates are the published schedule; the final table started Tue Jul 15 at 1:30 PM. The demo moment is the
    // hero still: seven left, blinds 1M/2M (2M big-blind ante), Mizrachi leading after his ace-king cracked kings.
    id: 'lv-main', seriesId: LV, number: 81, name: 'Main Event World Championship', game: 'No-Limit Hold’em', startingStack: 60_000,
    blinds: { sb: 1_000_000, bb: 2_000_000, ante: 2_000_000 },
    buyIn: 10_000, entrants: 9_735, prizePool: 90_535_500, firstPrize: 10_000_000, level: 0, remaining: 1, winnerId: 'mizrachi', featured: true, // Michael Mizrachi won it on Jul 16, 2025 ($10,000,000 of 9,735 entries)
    days: [
      day('lv-main', 'Day 1A', noon('2025-07-02'), 600, 'vod'),
      day('lv-main', 'Day 1B', noon('2025-07-03'), 600, 'vod'),
      day('lv-main', 'Day 1C', noon('2025-07-04'), 600, 'vod'),
      day('lv-main', 'Day 1D', noon('2025-07-05'), 600, 'vod'),
      day('lv-main', 'Day 2ABC', noon('2025-07-06'), 660, 'vod', 2),
      day('lv-main', 'Day 2D', noon('2025-07-07'), 660, 'vod', 2),
      day('lv-main', 'Day 3', noon('2025-07-08'), 660, 'vod', 2),
      day('lv-main', 'Day 4', noon('2025-07-09'), 660, 'vod', 2),
      day('lv-main', 'Day 5', noon('2025-07-10'), 660, 'vod', 2),
      day('lv-main', 'Day 6', noon('2025-07-11'), 660, 'vod', 2),
      day('lv-main', 'Day 7', noon('2025-07-12'), 660, 'vod', 4),
      day('lv-main', 'Day 8', noon('2025-07-13'), 660, 'vod', 4),
      day('lv-main', 'Final Table', at('2025-07-15T20:30:00Z'), 540, 'vod', 4),
    ],
  },
  {
    // ${PN}/event-94-10000-no-limit-hold-em-championship/ — 546 entries; its winner was decided later on Jul 15, so
    // at the demo moment it is still being played (no winner yet). Its start time on the day is not published.
    id: 'lv-hr', seriesId: LV, number: 94, name: '$10,000 No-Limit Hold’em 6-Handed Championship', game: 'No-Limit Hold’em', startingStack: 300_000,
    buyIn: 10_000, entrants: 546, prizePool: 5_077_800, firstPrize: 986_337, level: 0, remaining: 1, winnerId: 'soverel',
    days: [day('lv-hr', 'Final Table', noon('2025-07-15'), 480, 'vod', 2)],
  },
  {
    // 2025 WSOP Europe #14 €10,350 Main Event: Day 1A Oct 3, final day Oct 9.
    id: 'eu-main', seriesId: 'eu25', number: 14, name: 'Main Event', currency: '€', game: 'No-Limit Hold’em', startingStack: 60_000,
    // Won by Daniel Pidun (Germany), €1,140,000 of 659 entries, final day Oct 9: https://www.pokernews.com/tours/wsope/2025-wsop-europe/event-14-10350-main-event/
    buyIn: 10_350, entrants: 659, prizePool: 6_138_585, firstPrize: 1_140_000, level: 0, remaining: 1, winnerId: 'pidun',
    days: [day('eu-main', 'Day 1A', at('2025-10-03T11:00:00Z'), 600, 'vod'), day('eu-main', 'Final Table', at('2025-10-09T13:00:00Z'), 540, 'vod')],
  },
  {
    // 2025 WSOP Paradise #11 $25,000 Super Main Event: Bernhard Binder (Austria), $10,000,000 of 2,891 entries, Dec 18, 2025.
    id: 'pa25-main', seriesId: 'pa25', number: 11, name: '$25,000 Super Main Event', game: 'No-Limit Hold’em', startingStack: 250_000,
    buyIn: 25_000, entrants: 2_891, prizePool: 72_275_000, firstPrize: 10_000_000, level: 0, remaining: 1, winnerId: 'binder',
    days: [day('pa25-main', 'Final Table', at('2025-12-18T17:00:00Z'), 540, 'vod')],
  },
  {
    // The 2026 Main Event: Day 1A on Thursday, Jul 2, 2026 (the published schedule); not played yet at the demo moment.
    // Its event number isn't on the schedule source, so none is shown (0 = no number).
    id: 'lv26-main', seriesId: 'lv26', number: 82, name: 'Main Event', game: 'No-Limit Hold’em', startingStack: 60_000,
    buyIn: 10_000, entrants: 0, prizePool: 0, firstPrize: 0, level: 0, remaining: 0,
    days: [day('lv26-main', 'Day 1A', noon('2026-07-02'), 600, 'upcoming')],
  },
  // The 2026 series' broadcast final tables, as on the signed-off Schedule (event, buy-in, Las Vegas date, 2:30 PM); none played yet.
  ...(
    [
      ['lv26-1', 1, '$550 Mini Mystery Millions', 550, '2026-06-01'],
      ['lv26-7', 7, '$25,000 Heads Up Championship', 25_000, '2026-06-01'],
      ['lv26-11', 11, 'GGMillion$ High Roller', 10_000, '2026-06-04'],
      ['lv26-36', 36, '$100,000 High Roller', 100_000, '2026-06-12'],
      ['lv26-41', 41, '$250,000 Super High Roller', 250_000, '2026-06-15'],
      ['lv26-50', 50, '$1,500 Millionaire Maker', 1_500, '2026-06-24'],
      ['lv26-68', 68, 'Ladies Championship', 1_000, '2026-06-28'],
      ['lv26-70', 70, 'Pot-Limit Omaha Championship', 10_000, '2026-06-29', 'Pot-Limit Omaha'],
      ['lv26-94', 94, '$10,000 6-Handed Championship', 10_000, '2026-07-14'],
    ] as [string, number, string, number, string, TourEvent['game']?][]
  ).map(([id, number, name, buyIn, date, game]): TourEvent => ({
    id, seriesId: 'lv26', number, name, game: game ?? 'No-Limit Hold’em', startingStack: 0,
    buyIn, entrants: 0, prizePool: 0, firstPrize: 0, level: 0, remaining: 0,
    days: [day(id, 'Final Table', at(`${date}T21:30:00Z`), 480, 'upcoming')],
  })),
];

// Hero Final Table: one table, four camera feeds on the same 30-minute delay (hole cards are shown, so every feed
// is delayed). Two feeds show broadcast states — one starts late, one is temporarily interrupted.
// Day 8 (four tables) keeps per-table delays: feature table 30 min, outer tables 15 min.
{
  const main = events.find((e) => e.id === 'lv-main')!;
  const ft = main.days.find((d) => d.label === 'Final Table')!;
  ft.tables = [
    { id: `${ft.id}-t1`, name: 'Main Feed', main: true, delayMin: 30 },
    { id: `${ft.id}-t2`, name: 'Clean Feed', delayMin: 30 },
    PRESENTATION ? { id: `${ft.id}-t3`, name: 'Player Cam', delayMin: 30 } : { id: `${ft.id}-t3`, name: 'Player Cam', delayMin: 30, state: 'late', expected: iso(0.4) },
    PRESENTATION ? { id: `${ft.id}-t4`, name: 'Overhead Cam', delayMin: 30 } : { id: `${ft.id}-t4`, name: 'Overhead Cam', delayMin: 30, state: 'interrupted' },
  ];
  const d8 = main.days.find((d) => d.label === 'Day 8')!;
  d8.tables = d8.tables.map((t, i) => ({ ...t, delayMin: i === 0 ? 30 : 15 }));
  // One replay is open to any signed-in account (no subscription needed).
  main.days[0].access = 'signin';
}
/** Demo override "Late start" for the whole hero broadcast: expected start shown to viewers. */
export const HERO_EXPECTED_START = iso(0.35);

// 2025 results for player profiles (place, prize), from the event pages above.
const finishes: [string, string, number, number][] = [
  ['wang', 'lv-plo', 1, 1_394_579],
  ['okamoto', 'lv-ladies', 1, 184_094],
  ['mizrachi', 'lv-ppc', 1, 1_331_322],
  ['kenney', 'lv-ppc', 2, 887_542],
  ['lim', 'lv-seniors', 1, 653_839],
  ['roiter', 'lv-ms', 1, 1_204_457],
  ['davies', 'lv-tc', 1, 4_752_551],
  ['vieira', 'lv-100k', 1, 2_649_158],
  ['wilklow', 'lv-mmm', 1, 1_000_000],
  ['martirosian', 'lv-hu', 1, 500_000],
  // Main Event: knocked out before the demo moment (prizes from the results page)
  ['minghini', 'lv-main', 8, 1_250_000],
  ['dhlee', 'lv-main', 9, 1_000_000],
];
for (const [pid, eventId, place, prize] of finishes) players.find((p) => p.id === pid)!.recent.push({ eventId, place, prize });

// The hero broadcast's table at the demo moment, as the broadcast graphic on the hero still reads it. The seven stacks
// add up to the chips in play (9,735 entries × 60,000 = 584,100,000) within the graphic's rounding.
export const finalTableSeats: { playerId: string; stack: number }[] = [
  { playerId: 'mizrachi', stack: 151_400_000 },
  { playerId: 'wasnock', stack: 110_300_000 },
  { playerId: 'hallaert', stack: 100_300_000 },
  { playerId: 'dunaway', stack: 81_100_000 },
  { playerId: 'hendrix', stack: 58_100_000 },
  { playerId: 'margets', stack: 45_700_000 },
  { playerId: 'bojovic', stack: 37_500_000 },
];

// ---- hands ------------------------------------------------------------------------------------------

const playerById = (id: string) => players.find((p) => p.id === id)!;
const access = (i: number) => (i % 4 === 0 ? 'free' : i % 4 === 1 ? 'signin' : 'subscriber') as Access;

/**
 * Real hands from the Main Event final table before the demo moment (PokerNews hand reports, Jul 15:
 * https://www.pokernews.com/tours/wsop/2025-wsop/event-81-10000-wsop-main-event/day9/?highlights=1). Pots follow
 * from the stacks at the start of the final table (the short stack all in, covered, plus blinds and ante).
 */
const MAIN_FT = 'lv-main-finaltable';
const REAL_HANDS: Omit<Hand, 'id' | 'views' | 'access'>[] = [
  { title: 'A set of fives against ace-queen: Daehyung Lee out in 9th', type: 'cooler', eventId: 'lv-main', dayId: MAIN_FT, playerIds: ['wasnock', 'dhlee'], pot: 74_000_000, t: 15 * 60, result: 'Wasnock’s fives hold; Lee finishes 9th', winnerId: 'wasnock', durationSec: 150 },
  { title: 'Fours hold against ace-queen suited: Jarod Minghini out in 8th', type: 'bigpot', eventId: 'lv-main', dayId: MAIN_FT, playerIds: ['hallaert', 'minghini'], pot: 51_000_000, t: 45 * 60, result: 'Hallaert’s fours hold; Minghini finishes 8th', winnerId: 'hallaert', durationSec: 140 },
  { title: 'A river ace cracks kings and hands Mizrachi the chip lead', type: 'badbeat', eventId: 'lv-main', dayId: MAIN_FT, playerIds: ['mizrachi', 'wasnock'], pot: 150_000_000, t: 120 * 60, result: 'Mizrachi’s ace-king catches up on the river and takes the chip lead', winnerId: 'mizrachi', durationSec: 190 },
];

// Only real hands: the three Main Event final-table hands above (PokerNews hand reports). No made-up clips — the demo
// shows only videos that exist (the NAS broadcasts, the WSOP channel's uploads) and hands that were really played.
export const hands: Hand[] = REAL_HANDS.map((h, i) => ({ ...h, id: `r${i + 1}`, views: 180_000 + i * 41_000, access: access(i) }));

// ---- archive classics ---------------------------------------------------------------------------
// Earlier WSOP final tables, with their real champions and figures (PokerNews event pages):
// 2019 Main Event https://www.pokernews.com/tours/wsop/2019-wsop/main-event/
// 2021 #60 $50K PPC https://www.pokernews.com/tours/wsop/2021-wsop/event-60-50000-poker-players-championship/
// 2022 #50 $250K SHR https://www.pokernews.com/tours/wsop/2022-wsop/event-50-250000-super-high-roller/
// 2023 Main Event https://www.pokernews.com/tours/wsop/2023-wsop/main-event/

export const archive: ArchiveItem[] = [
  { id: 'a1', title: 'Main Event Final Table', year: 2019, subtitle: 'Hossein Ensan wins $10,000,000', durationSec: 9 * 3600 + 1200, winnerId: 'ensan', hue: 215, access: 'signin' },
  { id: 'a2', title: "Poker Players Championship", year: 2021, subtitle: 'Dan Cates wins the $50,000 PPC', durationSec: 7 * 3600, winnerId: 'cates', hue: 0, access: 'subscriber' },
  { id: 'a3', title: 'Super High Roller Final Table', year: 2022, subtitle: 'Alex Foxen wins $4,563,700', durationSec: 6 * 3600 + 900, winnerId: 'foxen', hue: 230, access: 'subscriber' },
  { id: 'a4', title: 'Main Event Final Table', year: 2023, subtitle: 'Daniel Weinman wins $12,100,000', durationSec: 10 * 3600, winnerId: 'weinman', hue: 260, access: 'subscriber' },
];
/** Per classic: event number (null where not confirmed), buy-in, game, entries, prize pool, first prize, the day it was decided. */
const CLASSIC_FACTS: Record<string, { number: number; buyIn: number; game: TourEvent['game']; entrants: number; prizePool: number; firstPrize: number; date: string }> = {
  a1: { number: 0, buyIn: 10_000, game: 'No-Limit Hold’em', entrants: 8_569, prizePool: 80_548_600, firstPrize: 10_000_000, date: '2019-07-17' },
  a2: { number: 60, buyIn: 50_000, game: 'Mixed Games', entrants: 63, prizePool: 3_016_125, firstPrize: 954_020, date: '2021-11-06' },
  a3: { number: 50, buyIn: 250_000, game: 'No-Limit Hold’em', entrants: 56, prizePool: 13_944_000, firstPrize: 4_563_700, date: '2022-06-25' },
  a4: { number: 0, buyIn: 10_000, game: 'No-Limit Hold’em', entrants: 10_043, prizePool: 93_399_900, firstPrize: 12_100_000, date: '2023-07-17' },
};

// ---- classics as replays -----------------------------------------------------------------------
// Each classic opens in the same replay player as any broadcast day: one final-table "day" with its own key hands.

const classicsSeries: Series = { id: 'classics', name: 'WSOP Classics', venue: 'Las Vegas', city: 'Las Vegas, NV', tz: LA, start: '2019-07-01T19:00:00Z', end: '2023-07-18T06:59:00Z' };
export const classicDayId = (archiveId: string) => `classic-${archiveId}-finaltable`;
export const isClassicEvent = (e: TourEvent) => e.seriesId === 'classics';
export const classicEvents: TourEvent[] = archive.map((c) => {
  const id = `classic-${c.id}`;
  const dayId = classicDayId(c.id);
  const f = CLASSIC_FACTS[c.id];
  return {
    id,
    seriesId: 'classics',
    number: f.number,
    name: `${c.year} ${c.title}`,
    game: f.game,
    startingStack: 50_000,
    buyIn: f.buyIn,
    entrants: f.entrants,
    prizePool: f.prizePool,
    firstPrize: f.firstPrize,
    level: 0,
    remaining: 1,
    winnerId: c.winnerId,
    days: [{ id: dayId, label: 'Final Table', start: `${f.date}T19:00:00Z`, durationMin: Math.round(c.durationSec / 60), status: 'vod', tables: feeds(dayId, 2, undefined, true), access: c.access }],
  };
});
/** The classics' key hands: none until a hand from their broadcasts is named in a source (no made-up hands). */
export const classicHands: Hand[] = [];

/** Every hand with a place on a replay timeline: the series' hands and the classics' key hands. */
export const allHands: Hand[] = [...hands, ...classicHands];

// ---- lookups -----------------------------------------------------------------------------------

export { playerById };
export const eventById = (id: string) => events.find((e) => e.id === id);
export const seriesById = (id: string) => (id === classicsSeries.id ? classicsSeries : series.find((s) => s.id === id)!);
export const dayById = (id: string) => {
  for (const e of [...events, ...classicEvents]) {
    const d = e.days.find((x) => x.id === id);
    if (d) return { event: e, day: d };
  }
  return undefined;
};
/** The hero broadcast: Main Event Final Table. */
export const HERO_DAY_ID = 'lv-main-finaltable';

// ---- per-broadcast table state (drives overlays, chip counts and the current hand) ----------------

/** Big blind in play on a broadcast day — final tables per event; earlier days scale with the starting stack. */
const FT_BB: Record<string, number> = { 'lv-main': 2_000_000, 'lv-hr': 500_000, 'lv-plo': 250_000, 'lv-ladies': 60_000, 'lv-tc': 80_000 };
const DAY_BB: Record<string, number> = { 'Day 1A': 400, 'Day 1B': 400, 'Day 1C': 400, 'Day 1D': 400, 'Day 2ABC': 3_000, 'Day 2D': 3_000, 'Day 3': 12_000 };
export function bbFor(dayId: string): number {
  const ref = dayById(dayId);
  if (!ref) return 3_000_000;
  const { event, day } = ref;
  if (day.label === 'Final Table') return event.blinds?.bb ?? FT_BB[event.id] ?? 100_000;
  return Math.round(((DAY_BB[day.label] ?? 3_000) * event.startingStack) / 60_000 / 100) * 100 || 100;
}

/**
 * Players at the table on a day, with stacks. Only the hero broadcast has a published table (its broadcast graphic);
 * other days show no seats rather than invented ones (and the launch service has no chip-count feed either).
 */
export function seatsFor(dayId: string): { playerId: string; stack: number }[] {
  return dayId === HERO_DAY_ID ? finalTableSeats : [];
}
