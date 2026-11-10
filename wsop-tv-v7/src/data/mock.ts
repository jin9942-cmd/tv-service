// Demo data: a reconstruction of the real 2025 World Series of Poker in Las Vegas (May 27 – Jul 16, 2025), set on
// Tuesday Jul 15, the first day of the Main Event final table, at the moment the broadcast still on the hero shows
// (seven left, Mizrachi the chip leader). Every name, field, prize pool, first prize, winner, date and chip count below
// is from the published results (PokerNews live reporting, cross-checked with CardPlayer; sources beside each block).
// What isn't published (broadcast lengths, the pots of most clips, earlier days' feature tables) stays generic and
// names nobody: no real player is put in a hand or at a table they weren't at.
// Times are relative to the demo clock (lib/clock.ts), so the demo always opens on that moment.
import type { Access, ArchiveItem, Day, DayLabel, Hand, HandType, Player, Series, StreamStatus, TableFeed, TourEvent } from './types';
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
  P('mizrachi', 'Michael Mizrachi', 'United States', 'US', 20, 7), // the Main Event became his 8th (CardPlayer)
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
  P('soverel', 'Sam Soverel', 'United States', 'US', 40, 2), // #94 (decided Jul 15) became his 3rd
  P('kenney', 'Bryn Kenney', 'United States', 'US', 290),
  P('foxen', 'Alex Foxen', 'United States', 'US', 30),
  // Champions of the classics
  P('ensan', 'Hossein Ensan', 'Germany', 'DE', 240),
  P('cates', 'Dan Cates', 'United States', 'US', 160),
  P('weinman', 'Daniel Weinman', 'United States', 'US', 280),
  // A bracelet legend (Browse > Players links to him); no 2025 results are claimed for him here.
  { ...P('p04', 'Daniel Negreanu', 'Canada', 'CA', 270), photo: `${import.meta.env.BASE_URL}promo/negreanu-avatar.webp` },
];

// ---- series & events ----------------------------------------------------------------------------

// https://www.pokernews.com/news/2025/02/2025-world-series-of-poker-schedule-47958.htm
export const series: Series[] = [
  { id: 'lv25', name: '2025 World Series of Poker', venue: 'Horseshoe / Paris Las Vegas', city: 'Las Vegas, NV', tz: 'America/Los_Angeles', start: '2025-05-27T19:00:00Z', end: '2025-07-17T06:59:00Z' },
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
    buyIn: 10_000, entrants: 9_735, prizePool: 90_535_500, firstPrize: 10_000_000, level: 0, remaining: 7, leaderId: 'mizrachi', featured: true,
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
      day('lv-main', 'Final Table', at('2025-07-15T20:30:00Z'), 540, 'live', 4),
    ],
  },
  {
    // ${PN}/event-94-10000-no-limit-hold-em-championship/ — 546 entries; its winner was decided later on Jul 15, so
    // at the demo moment it is still being played (no winner yet). Its start time on the day is not published.
    id: 'lv-hr', seriesId: LV, number: 94, name: '$10,000 No-Limit Hold’em 6-Handed Championship', game: 'No-Limit Hold’em', startingStack: 300_000,
    buyIn: 10_000, entrants: 546, prizePool: 5_077_800, firstPrize: 986_337, level: 0, remaining: 6,
    days: [day('lv-hr', 'Final Table', noon('2025-07-15'), 480, 'live', 2)],
  },
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

const HAND_TITLES: Record<HandType, string[]> = {
  bluff: ['Triple-barrel with seven-high', 'River bluff on a scare card', 'Float the flop, raise the turn', 'Blocker bluff on a four-flush board', 'Check-raise bluff on a paired board', 'Repping the straight on the river'],
  herocall: ['Hero call with ace-high', 'Picking off the river bluff', 'Calling down with second pair', 'The snap call that caught a bluff'],
  cooler: ['Kings against aces before the flop', 'Set over set', 'Ace-king against queens for the chip lead', 'Flush over flush on the river', 'Full house against quads'],
  badbeat: ['One-outer on the river', 'Runner-runner flush', 'Quads beat on the turn', 'Two-outer for a double-up', 'Set under set, then the case card'],
  bigpot: ['The biggest pot of the day', 'Three streets of value with the nut straight', 'Overpair meets the nut flush draw', 'The pot that decided the chip lead', 'River overbet with the nuts', 'Four-way all-in before the flop'],
  winning: ['The bracelet-winning hand', 'Heads-up for the bracelet', 'The final all-in', 'Champion on the river'],
};
/** Neutral result lines for clips that name nobody. */
const NEUTRAL_RESULT: Record<HandType, string> = {
  bluff: 'The bluff gets through',
  herocall: 'The call is good',
  cooler: 'The bigger hand holds',
  badbeat: 'The river turns it around',
  bigpot: 'A pot to remember',
  winning: 'The bracelet is decided',
};

/** Typical pot size by stage — early days play small blinds, final tables play deep in the millions. */
const STAGE_POT: Record<string, number> = { 'Day 1A': 220_000, 'Day 1B': 220_000, 'Day 1C': 220_000, 'Day 1D': 220_000, 'Day 2ABC': 1_600_000, 'Day 2D': 1_600_000, 'Day 3': 6_500_000 };
const FT_POT: Record<string, number> = { 'lv-main': 60_000_000, 'lv-hr': 16_000_000, 'lv-plo': 14_000_000, 'lv-ladies': 3_200_000, 'lv-tc': 40_000_000, 'lv-ppc': 9_000_000 };
const TYPE_POT: Record<HandType, number> = { bigpot: 1.9, cooler: 1.6, winning: 1.5, badbeat: 1.2, herocall: 0.9, bluff: 0.8 };
/** Round to a broadcast-friendly figure (two significant digits). */
const roundPot = (n: number) => {
  const step = 10 ** Math.max(3, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
};

const dayOf = (eventId: string, label: DayLabel) => events.find((e) => e.id === eventId)!.days.find((d) => d.label === label)!;
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

/** Generic clips (no names): where each is from, in turn. */
const CLIP_PLACES: [string, DayLabel][] = [
  ['lv-main', 'Day 8'],
  ['lv-hr', 'Final Table'],
  ['lv-plo', 'Final Table'],
  ['lv-main', 'Day 7'],
  ['lv-tc', 'Final Table'],
  ['lv-ladies', 'Final Table'],
  ['lv-main', 'Day 2ABC'],
  ['lv-ppc', 'Final Table'],
];
/** Each finished final table's last hand: its winner (a fact) and nobody else. */
const WON = events.filter((e) => e.winnerId && e.days.some((d) => d.label === 'Final Table'));

const types: HandType[] = ['bluff', 'herocall', 'cooler', 'badbeat', 'bigpot'];
const counts: Record<HandType, number> = { bluff: 5, herocall: 4, cooler: 4, badbeat: 4, bigpot: 5, winning: 0 };
const seq: HandType[] = [];
const left = { ...counts };
while (seq.length < 22) for (const t of types) if (left[t]-- > 0) seq.push(t);
const nth: Record<HandType, number> = { bluff: 0, herocall: 0, cooler: 0, badbeat: 0, bigpot: 0, winning: 0 };

export const hands: Hand[] = [
  ...REAL_HANDS.map((h, i) => ({ ...h, id: `r${i + 1}`, views: 180_000 + i * 41_000, access: access(i) })),
  ...WON.map((e, i): Hand => {
    const d = dayOf(e.id, 'Final Table');
    return {
      id: `w${i + 1}`,
      title: HAND_TITLES.winning[i % HAND_TITLES.winning.length],
      type: 'winning',
      eventId: e.id,
      dayId: d.id,
      playerIds: [e.winnerId!],
      pot: roundPot((FT_POT[e.id] ?? 10_000_000) * TYPE_POT.winning),
      t: Math.round(d.durationMin * 60 * 0.92),
      result: `${playerById(e.winnerId!).name} wins the bracelet`,
      winnerId: e.winnerId!,
      views: 30_000 + ((i * 7919) % 300_000),
      durationSec: 90 + ((i * 53) % 150),
      access: access(i + 1),
    };
  }),
  ...seq.map((type, i): Hand => {
    const [eventId, label] = CLIP_PLACES[i % CLIP_PLACES.length];
    const d = dayOf(eventId, label);
    const base = label === 'Final Table' ? (FT_POT[eventId] ?? 10_000_000) : (STAGE_POT[label] ?? 12_000_000);
    return {
      id: `h${String(i + 1).padStart(2, '0')}`,
      title: HAND_TITLES[type][nth[type]++ % HAND_TITLES[type].length],
      type,
      eventId,
      dayId: d.id,
      playerIds: [],
      pot: roundPot(base * TYPE_POT[type] * (0.7 + ((i * 37) % 60) / 100)),
      // Live final tables: only hands already played (before the demo moment) are on the timeline.
      t: Math.round(((i * 0.137) % 0.9 + 0.05) * Math.min(d.durationMin * 60, d.status === 'live' ? Math.max(600, (Date.now() - Date.parse(d.start)) / 1000 - 300) : Infinity)),
      result: NEUTRAL_RESULT[type],
      winnerId: '',
      views: 12_000 + ((i * 7919) % 480_000),
      durationSec: 70 + ((i * 53) % 240),
      access: access(i),
    };
  }),
];

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
const CLASSIC_TYPES: HandType[] = ['bigpot', 'bluff', 'herocall', 'badbeat', 'cooler', 'winning'];
/** A classic's key hands: generic (no names), then the final hand, won by its champion. */
export const classicHands: Hand[] = classicEvents.flatMap((e, ci) => {
  const d = e.days[0];
  return CLASSIC_TYPES.map((type, k): Hand => {
    const last = k === CLASSIC_TYPES.length - 1;
    return {
      id: `c${ci + 1}h${k + 1}`,
      title: last ? 'The final hand' : HAND_TITLES[type][(ci + k) % HAND_TITLES[type].length],
      type,
      eventId: e.id,
      dayId: d.id,
      playerIds: last ? [e.winnerId!] : [],
      pot: roundPot(FT_POT['lv-main'] * TYPE_POT[type] * (0.6 + k * 0.12)),
      t: Math.round(((k + 0.6) / (CLASSIC_TYPES.length + 0.2)) * d.durationMin * 60),
      result: last ? `${playerById(e.winnerId!).name} wins the bracelet` : NEUTRAL_RESULT[type],
      winnerId: last ? e.winnerId! : '',
      views: 40_000 + ((ci * 31 + k) * 7919) % 300_000,
      durationSec: 90 + ((ci + k) * 53) % 200,
      access: d.access ?? 'subscriber',
    };
  });
});

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
