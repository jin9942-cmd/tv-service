// Fictional demo data. Times are relative to page load so the demo always has something live.
import type { ArchiveItem, Day, DayLabel, Hand, HandType, Player, Series, StreamStatus, TableFeed, TourEvent } from './types';

export const T0 = Date.now();
const H = 3_600_000;
const iso = (hoursFromNow: number) => new Date(T0 + hoursFromNow * H).toISOString();

// ---- players (20, fictional) ------------------------------------------------------------

const P = (id: string, name: string, country: string, cc: string, bracelets: number, earnings: number, poyPoints: number, hue: number): Player => ({
  id,
  name,
  country,
  cc,
  bracelets,
  earnings,
  poyPoints,
  recent: [],
  hue,
});

export const players: Player[] = [
  P('p01', 'Mateo Valcourt', 'France', 'FR', 4, 14_820_400, 3_412, 210),
  P('p02', 'Yuna Kagami', 'Japan', 'JP', 2, 6_130_250, 2_986, 330),
  P('p03', 'Diego Albarrán', 'Mexico', 'MX', 1, 3_960_900, 2_104, 140),
  P('p04', 'Seo-yeon Han', 'South Korea', 'KR', 3, 9_270_000, 3_190, 270),
  P('p05', 'Callum Breck', 'United Kingdom', 'GB', 0, 1_482_300, 1_377, 20),
  P('p06', 'Inês Duarte', 'Portugal', 'PT', 1, 2_210_800, 1_650, 170),
  P('p07', 'Noah Whitfield', 'United States', 'US', 7, 27_940_000, 3_655, 0),
  P('p08', 'Arash Teymouri', 'Canada', 'CA', 0, 694_150, 902, 50),
  P('p09', 'Lucía Ferrante', 'Argentina', 'AR', 2, 4_840_600, 2_418, 190),
  P('p10', 'Tomasz Wierzba', 'Poland', 'PL', 1, 2_975_000, 1_812, 300),
  P('p11', 'Amara Okafor', 'Nigeria', 'NG', 0, 912_400, 1_044, 30),
  P('p12', 'Henrik Solberg', 'Norway', 'NO', 2, 5_406_700, 2_233, 200),
  P('p13', 'Priya Raman', 'India', 'IN', 1, 1_768_900, 1_501, 320),
  P('p14', 'Jonah Kessler', 'Germany', 'DE', 5, 18_330_100, 3_021, 230),
  P('p15', 'Rafael Moura', 'Brazil', 'BR', 1, 3_102_500, 1_966, 120),
  P('p16', 'Chloé Marchetti', 'Italy', 'IT', 0, 547_800, 788, 350),
  P('p17', 'Daniel Ashkenazi', 'Israel', 'IL', 3, 11_085_000, 2_760, 260),
  P('p18', 'Mei-Lin Chou', 'Taiwan', 'TW', 1, 2_480_300, 1_590, 290),
  P('p19', 'Oskar Lindgren', 'Sweden', 'SE', 9, 31_206_000, 3_288, 215),
  P('p20', 'Zanele Mokoena', 'South Africa', 'ZA', 0, 381_900, 640, 40),
];

// ---- series & events ----------------------------------------------------------------------

export const series: Series[] = [
  { id: 'lv26', name: '2026 Summer Championship', venue: 'Convention Center Arena', city: 'Las Vegas, NV', tz: 'America/Los_Angeles', start: iso(-24 * 34), end: iso(24 * 12) },
  { id: 'eu26', name: '2026 Autumn Classic', venue: 'Grand Hall', city: 'Prague, CZ', tz: 'Europe/Prague', start: iso(24 * 26), end: iso(24 * 38) },
];

const feeds = (prefix: string, n: number, failing?: number): TableFeed[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-t${i + 1}`,
    name: i === 0 ? 'Feature Table' : `Outer Table ${i + 1}`,
    main: i === 0,
    failing: failing === i,
  }));

const day = (eventId: string, label: DayLabel, startH: number, durationMin: number, status: StreamStatus, tables = 1, failing?: number): Day => {
  const id = `${eventId}-${label.replace(/\s+/g, '').toLowerCase()}`;
  return { id, label, start: iso(startH), durationMin, status, tables: feeds(id, tables, failing) };
};

export const events: TourEvent[] = [
  {
    id: 'lv-main',
    seriesId: 'lv26',
    number: 76,
    name: 'Main Event World Championship',
    buyIn: 10_000,
    entrants: 9_412,
    prizePool: 88_472_800,
    firstPrize: 10_000_000,
    level: 41,
    remaining: 7,
    leaderId: 'p04',
    featured: true,
    days: [
      day('lv-main', 'Day 1A', -24 * 6, 600, 'vod'),
      day('lv-main', 'Day 1B', -24 * 5, 600, 'vod'),
      day('lv-main', 'Day 2', -24 * 4, 660, 'vod', 2),
      day('lv-main', 'Day 3', -24 * 2, 660, 'vod', 4),
      // The hero broadcast: on air now with a 30-minute delay; four tables for multiview, one outer feed fails (error state demo).
      day('lv-main', 'Final Table', -1.5, 540, 'delayed', 4, 3),
    ],
  },
  {
    id: 'lv-hr',
    seriesId: 'lv26',
    number: 45,
    name: '$50,000 High Roller',
    buyIn: 50_000,
    entrants: 312,
    prizePool: 15_210_000,
    firstPrize: 4_102_000,
    level: 29,
    remaining: 4,
    leaderId: 'p19',
    days: [day('lv-hr', 'Day 1A', -24 * 2, 540, 'vod'), day('lv-hr', 'Day 2', -24, 540, 'vod', 2), day('lv-hr', 'Final Table', -0.75, 420, 'live', 2)],
  },
  {
    id: 'lv-ppc',
    seriesId: 'lv26',
    number: 58,
    name: "Players' Championship",
    buyIn: 50_000,
    entrants: 0,
    prizePool: 0,
    firstPrize: 0,
    level: 0,
    remaining: 0,
    days: [day('lv-ppc', 'Day 1A', 3, 600, 'upcoming', 2), day('lv-ppc', 'Day 2', 27, 600, 'upcoming', 2), day('lv-ppc', 'Final Table', 51, 480, 'upcoming', 1)],
  },
  {
    id: 'lv-mm',
    seriesId: 'lv26',
    number: 12,
    name: 'Millionaire Maker',
    buyIn: 1_500,
    entrants: 11_870,
    prizePool: 16_024_500,
    firstPrize: 1_500_000,
    level: 44,
    remaining: 1,
    leaderId: 'p09',
    winnerId: 'p09',
    days: [day('lv-mm', 'Day 1A', -24 * 20, 600, 'vod'), day('lv-mm', 'Day 2', -24 * 18, 600, 'vod'), day('lv-mm', 'Final Table', -24 * 17, 480, 'vod')],
  },
  {
    id: 'lv-plo',
    seriesId: 'lv26',
    number: 23,
    name: 'Pot-Limit Omaha Championship',
    buyIn: 10_000,
    entrants: 1_108,
    prizePool: 10_415_200,
    firstPrize: 2_005_600,
    level: 36,
    remaining: 1,
    leaderId: 'p14',
    winnerId: 'p14',
    days: [day('lv-plo', 'Day 1A', -24 * 14, 600, 'vod'), day('lv-plo', 'Day 2', -24 * 13, 600, 'vod'), day('lv-plo', 'Final Table', -24 * 12, 480, 'vod')],
  },
  {
    id: 'lv-ladies',
    seriesId: 'lv26',
    number: 31,
    name: 'Ladies Championship',
    buyIn: 1_000,
    entrants: 1_204,
    prizePool: 1_083_600,
    firstPrize: 186_200,
    level: 30,
    remaining: 1,
    leaderId: 'p13',
    winnerId: 'p13',
    days: [day('lv-ladies', 'Day 1A', -24 * 10, 540, 'vod'), day('lv-ladies', 'Final Table', -24 * 9, 420, 'vod')],
  },
  {
    id: 'lv-tc',
    seriesId: 'lv26',
    number: 64,
    name: 'Tournament of Champions',
    buyIn: 0,
    entrants: 404,
    prizePool: 1_000_000,
    firstPrize: 250_000,
    level: 27,
    remaining: 1,
    leaderId: 'p01',
    winnerId: 'p01',
    days: [day('lv-tc', 'Day 1A', -24 * 7, 540, 'vod'), day('lv-tc', 'Final Table', -24 * 6.5, 420, 'vod')],
  },
  {
    id: 'eu-main',
    seriesId: 'eu26',
    number: 1,
    name: 'Autumn Classic Main Event',
    buyIn: 5_300,
    entrants: 0,
    prizePool: 0,
    firstPrize: 0,
    level: 0,
    remaining: 0,
    days: [day('eu-main', 'Day 1A', 24 * 27, 600, 'upcoming', 2), day('eu-main', 'Day 1B', 24 * 28, 600, 'upcoming', 2), day('eu-main', 'Final Table', 24 * 32, 480, 'upcoming', 1)],
  },
  {
    id: 'eu-shr',
    seriesId: 'eu26',
    number: 9,
    name: '€100,000 Super High Roller',
    buyIn: 100_000,
    entrants: 0,
    prizePool: 0,
    firstPrize: 0,
    level: 0,
    remaining: 0,
    days: [day('eu-shr', 'Day 1A', 24 * 33, 540, 'upcoming', 1), day('eu-shr', 'Final Table', 24 * 34, 420, 'upcoming', 1)],
  },
];

// Recent finishes for player profiles.
const finishes: [string, string, number, number][] = [
  ['p09', 'lv-mm', 1, 1_500_000],
  ['p14', 'lv-plo', 1, 2_005_600],
  ['p13', 'lv-ladies', 1, 186_200],
  ['p01', 'lv-tc', 1, 250_000],
  ['p07', 'lv-mm', 3, 640_000],
  ['p19', 'lv-plo', 2, 1_239_400],
  ['p04', 'lv-tc', 4, 82_000],
  ['p02', 'lv-ladies', 2, 115_000],
  ['p12', 'lv-mm', 6, 248_300],
  ['p17', 'lv-plo', 5, 401_800],
  ['p01', 'lv-plo', 7, 214_900],
  ['p10', 'lv-mm', 9, 131_600],
];
for (const [pid, eventId, place, prize] of finishes) players.find((p) => p.id === pid)!.recent.push({ eventId, place, prize });

// Final table seats for the hero broadcast (chip counts are simulated live).
export const finalTableSeats: { playerId: string; stack: number }[] = [
  { playerId: 'p04', stack: 182_400_000 },
  { playerId: 'p07', stack: 141_000_000 },
  { playerId: 'p19', stack: 96_750_000 },
  { playerId: 'p01', stack: 88_100_000 },
  { playerId: 'p12', stack: 61_200_000 },
  { playerId: 'p15', stack: 39_800_000 },
  { playerId: 'p08', stack: 22_150_000 },
];

// ---- hands (30) -----------------------------------------------------------------------------

const HAND_TITLES: Record<HandType, string[]> = {
  allin: ['Four-way all-in before the flop', 'Short stack moves in from the button', 'All-in and a call for the chip lead', 'Coin flip for a seat at the final table', 'Shove over a three-bet', 'Double-up on the bubble', 'All-in with the bracelet in sight', 'Covered all-in, run it once'],
  bigpot: ['The biggest pot of the series so far', '300-million-chip pot at the final table', 'Three streets of value', 'Set over set in a monster pot', 'Overpair meets the nut flush draw', 'Pot that decided the chip lead', 'River overbet in a huge pot'],
  bluff: ['Triple-barrel with seven-high', 'River bluff with the table watching', 'Float, then the turn raise', 'Blocker bluff on a four-flush board', 'The check-raise bluff of the summer', 'Representing the straight'],
  badbeat: ['One-outer on the river', 'Runner-runner on the final table', 'Quads beat on the turn', 'The river card nobody expected', 'Set under set, then a miracle'],
  herofold: ['Laying down a full house', 'Folding kings preflop on the bubble', 'The disciplined river fold', 'Read of the night: pocket queens away'],
};

const dayOf = (eventId: string, label: DayLabel) => events.find((e) => e.id === eventId)!.days.find((d) => d.label === label)!;
// The hero broadcast (Main Event Final Table) gets a third of the hands so its timeline is busy.
const HAND_PLACES: [string, DayLabel][] = [
  ['lv-main', 'Final Table'],
  ['lv-main', 'Day 3'],
  ['lv-hr', 'Final Table'],
  ['lv-main', 'Final Table'],
  ['lv-mm', 'Final Table'],
  ['lv-plo', 'Final Table'],
  ['lv-main', 'Final Table'],
  ['lv-main', 'Day 2'],
  ['lv-ladies', 'Final Table'],
  ['lv-tc', 'Final Table'],
];

const types: HandType[] = ['allin', 'bigpot', 'bluff', 'badbeat', 'herofold'];
const counts: Record<HandType, number> = { allin: 8, bigpot: 7, bluff: 6, badbeat: 5, herofold: 4 };
// Round-robin across types so the grid shows a mix.
const seq: HandType[] = [];
const left = { ...counts };
while (seq.length < 30) for (const t of types) if (left[t]-- > 0) seq.push(t);
const nth: Record<HandType, number> = { allin: 0, bigpot: 0, bluff: 0, badbeat: 0, herofold: 0 };

export const hands: Hand[] = seq.map((type, i) => {
  const [eventId, label] = HAND_PLACES[i % HAND_PLACES.length];
  const d = dayOf(eventId, label);
  const a = players[(i * 7) % players.length];
  const b = players[(i * 11 + 3) % players.length];
  const title = HAND_TITLES[type][nth[type]++ % HAND_TITLES[type].length];
  const winner = i % 3 === 0 ? b : a;
  const pot = Math.round((type === 'bigpot' ? 180 : type === 'allin' ? 120 : 60) * (0.6 + ((i * 37) % 50) / 50)) * 1_000_000;
  return {
    id: `h${String(i + 1).padStart(2, '0')}`,
    title,
    type,
    eventId,
    dayId: d.id,
    playerIds: [a.id, b.id],
    pot,
    t: Math.round(((i * 0.137) % 0.9 + 0.05) * d.durationMin * 60),
    result: type === 'herofold' ? `${a.name} folds — ${b.name} shows the bluff` : `${winner.name} wins the pot`,
    winnerId: winner.id,
    views: 12_000 + ((i * 7919) % 480_000),
    durationSec: 70 + ((i * 53) % 240),
  };
});

// ---- archive classics (6) ---------------------------------------------------------------------

export const archive: ArchiveItem[] = [
  { id: 'a1', title: 'Main Event Final Table', year: 2019, subtitle: 'The longest heads-up in championship history', durationSec: 9 * 3600 + 1200, winnerId: 'p19', hue: 215 },
  { id: 'a2', title: "Players' Championship", year: 2021, subtitle: 'Eight disciplines, one champion', durationSec: 7 * 3600, winnerId: 'p07', hue: 0 },
  { id: 'a3', title: 'High Roller Final Table', year: 2022, subtitle: 'A record field for the summer high roller', durationSec: 6 * 3600 + 900, winnerId: 'p14', hue: 230 },
  { id: 'a4', title: 'Main Event Day 7', year: 2023, subtitle: 'From 35 players to the final nine', durationSec: 10 * 3600, winnerId: 'p17', hue: 260 },
  { id: 'a5', title: 'Tournament of Champions', year: 2024, subtitle: 'Bracelet winners only', durationSec: 5 * 3600 + 1800, winnerId: 'p01', hue: 210 },
  { id: 'a6', title: 'Main Event Final Table', year: 2025, subtitle: 'The comeback from one big blind', durationSec: 8 * 3600 + 2400, winnerId: 'p04', hue: 270 },
];

// ---- lookups -----------------------------------------------------------------------------------

export const playerById = (id: string) => players.find((p) => p.id === id)!;
export const eventById = (id: string) => events.find((e) => e.id === id);
export const seriesById = (id: string) => series.find((s) => s.id === id)!;
export const dayById = (id: string) => {
  for (const e of events) {
    const d = e.days.find((x) => x.id === id);
    if (d) return { event: e, day: d };
  }
  return undefined;
};
/** The hero broadcast: Main Event Final Table. */
export const HERO_DAY_ID = 'lv-main-finaltable';
