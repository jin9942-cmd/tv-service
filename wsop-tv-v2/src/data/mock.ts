// Fictional demo data. Times are relative to page load so the demo always has something live.
import type { Access, ArchiveItem, Day, DayLabel, Hand, HandType, Player, Series, StreamStatus, TableFeed, TourEvent } from './types';

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

/** A final table is a single table, so its extra streams are camera feeds of that table; earlier days have outer tables. */
const FT_FEEDS = ['Main Feed', 'Clean Feed', 'Player Cam', 'Overhead Cam'];
const feeds = (prefix: string, n: number, failing?: number, finalTable?: boolean): TableFeed[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-t${i + 1}`,
    name: finalTable ? FT_FEEDS[i] : i === 0 ? 'Feature Table' : `Outer Table ${i + 1}`,
    main: i === 0,
    failing: failing === i,
  }));

/** Upcoming broadcasts get realistic start times: today → next :00/:30, later days → noon Las Vegas time. */
const LA = 'America/Los_Angeles';
const laHour = (ms: number) => Number(new Intl.DateTimeFormat('en-US', { timeZone: LA, hour: 'numeric', hourCycle: 'h23' }).format(ms));
function upcomingStart(startH: number) {
  const at = T0 + startH * H;
  if (startH < 12) return new Date(Math.ceil(at / (30 * 60_000)) * 30 * 60_000).toISOString();
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: LA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at).split('-').map(Number);
  let noon = Date.UTC(y, m - 1, d, 19); // 12:00 PDT; corrected below when PST applies
  noon += (12 - laHour(noon)) * H;
  return new Date(noon).toISOString();
}

const day = (eventId: string, label: DayLabel, startH: number, durationMin: number, status: StreamStatus, tables = 1, failing?: number): Day => {
  const id = `${eventId}-${label.replace(/\s+/g, '').toLowerCase()}`;
  return { id, label, start: status === 'upcoming' ? upcomingStart(startH) : iso(startH), durationMin, status, tables: feeds(id, tables, failing, label === 'Final Table') };
};

export const events: TourEvent[] = [
  {
    id: 'lv-main',
    game: 'No-Limit Hold’em', startingStack: 60_000, blinds: { sb: 1_500_000, bb: 3_000_000, ante: 3_000_000 },
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
      // The hero broadcast: on air now; four tables for multiview. Per-table delays and states are set below.
      day('lv-main', 'Final Table', -1.5, 540, 'delayed', 4),
    ],
  },
  {
    id: 'lv-hr',
    game: 'No-Limit Hold’em', startingStack: 300_000, blinds: { sb: 250_000, bb: 500_000, ante: 500_000 },
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
    // Live without delay; the outer feed fails on the client (error state demo with Retry).
    days: [day('lv-hr', 'Day 1A', -24 * 2, 540, 'vod'), day('lv-hr', 'Day 2', -24, 540, 'vod', 2), day('lv-hr', 'Final Table', -0.75, 420, 'live', 2, 1)],
  },
  {
    id: 'lv-ppc',
    game: 'Mixed Games', startingStack: 300_000,
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
    game: 'No-Limit Hold’em', startingStack: 40_000,
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
    game: 'Pot-Limit Omaha', startingStack: 60_000,
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
    game: 'No-Limit Hold’em', startingStack: 40_000,
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
    game: 'No-Limit Hold’em', startingStack: 30_000,
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
    game: 'No-Limit Hold’em', startingStack: 50_000,
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
    game: 'No-Limit Hold’em', startingStack: 300_000,
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

// Hero Final Table: one table, four camera feeds on the same 30-minute delay (hole cards are shown, so every feed
// is delayed). Two feeds show broadcast states — one starts late, one is temporarily interrupted.
// Day 3 (four tables) keeps per-table delays: feature table 30 min, outer tables 15 min.
{
  const ft = events[0].days[4];
  ft.tables = [
    { id: `${ft.id}-t1`, name: 'Main Feed', main: true, delayMin: 30 },
    { id: `${ft.id}-t2`, name: 'Clean Feed', delayMin: 30 },
    { id: `${ft.id}-t3`, name: 'Player Cam', delayMin: 30, state: 'late', expected: iso(0.4) },
    { id: `${ft.id}-t4`, name: 'Overhead Cam', delayMin: 30, state: 'interrupted' },
  ];
  const d3 = events[0].days[3];
  d3.tables = d3.tables.map((t, i) => ({ ...t, delayMin: i === 0 ? 30 : 15 }));
  // One replay is open to any signed-in account (no subscription needed).
  events[0].days[0].access = 'signin';
}
/** Demo override "Late start" for the whole hero broadcast: expected start shown to viewers. */
export const HERO_EXPECTED_START = iso(0.35);

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
// Seven left: stacks add up to the chips in play (9,412 entrants × 60,000 starting stack = 564,720,000).
export const finalTableSeats: { playerId: string; stack: number }[] = [
  { playerId: 'p04', stack: 163_200_000 },
  { playerId: 'p07', stack: 126_100_000 },
  { playerId: 'p19', stack: 86_520_000 },
  { playerId: 'p01', stack: 78_800_000 },
  { playerId: 'p12', stack: 54_700_000 },
  { playerId: 'p15', stack: 35_600_000 },
  { playerId: 'p08', stack: 19_800_000 },
];

// ---- hands (30) -----------------------------------------------------------------------------

const HAND_TITLES: Record<HandType, string[]> = {
  allin: ['Ace-king against queens for the chip lead', 'Short stack moves in from the button', 'Four-way all-in before the flop', 'Pocket pair races two overcards', 'Shove over a three-bet, snap call', 'Jam from the small blind', 'Covered all-in, ace-high holds', 'Flush draw against top pair, all in on the flop'],
  bigpot: ['The biggest pot of the day', 'Three streets of value with the nut straight', 'Set over set', 'Overpair meets the nut flush draw', 'The pot that decided the chip lead', 'River overbet with the nuts', 'Turned straight against top two pair'],
  bluff: ['Triple-barrel with seven-high', 'River bluff on a scare card', 'Float the flop, raise the turn', 'Blocker bluff on a four-flush board', 'Check-raise bluff on a paired board', 'Repping the straight on the river'],
  badbeat: ['One-outer on the river', 'Runner-runner flush', 'Quads beat on the turn', 'Two-outer for a double-up', 'Set under set, then the case card'],
  herofold: ['Laying down a full house', 'Kings folded to a five-bet', 'The disciplined river fold', 'Queens away after a four-bet'],
};

/** Typical pot size by stage — early days play small blinds, final tables play deep in the millions. */
const STAGE_POT: Record<string, number> = { 'Day 1A': 220_000, 'Day 1B': 220_000, 'Day 2': 1_600_000, 'Day 3': 6_500_000 };
const FT_POT: Record<string, number> = { 'lv-main': 60_000_000, 'lv-hr': 16_000_000, 'lv-mm': 30_000_000, 'lv-plo': 14_000_000, 'lv-ladies': 3_200_000, 'lv-tc': 4_500_000 };
const TYPE_POT: Record<HandType, number> = { bigpot: 1.9, allin: 1.4, badbeat: 1.2, bluff: 0.8, herofold: 0.7 };
/** Who can appear in a hand: the actual final-table field where we have it, otherwise anyone. */
const FIELD: Record<string, string[]> = {
  'lv-main-finaltable': ['p04', 'p07', 'p19', 'p01', 'p12', 'p15', 'p08'],
  'lv-hr-finaltable': ['p19', 'p14', 'p17', 'p07'],
  'lv-mm-finaltable': ['p09', 'p07', 'p12', 'p10', 'p05', 'p11'],
  'lv-plo-finaltable': ['p14', 'p19', 'p17', 'p01', 'p06'],
  'lv-ladies-finaltable': ['p13', 'p02', 'p09', 'p06', 'p18'],
  'lv-tc-finaltable': ['p01', 'p04', 'p07', 'p19', 'p14'],
};
/** Round to a broadcast-friendly figure (two significant digits). */
const roundPot = (n: number) => {
  const step = 10 ** Math.max(3, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
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

const playerById = (id: string) => players.find((p) => p.id === id)!;

export const hands: Hand[] = seq.map((type, i) => {
  const [eventId, label] = HAND_PLACES[i % HAND_PLACES.length];
  const d = dayOf(eventId, label);
  const field = FIELD[d.id] ?? players.map((p) => p.id);
  const a = playerById(field[(i * 3) % field.length]);
  const b = playerById(field[(i * 5 + 1) % field.length] === a.id ? field[(i * 5 + 2) % field.length] : field[(i * 5 + 1) % field.length]);
  const title = HAND_TITLES[type][nth[type]++ % HAND_TITLES[type].length];
  const winner = i % 3 === 0 ? b : a;
  const base = label === 'Final Table' ? (FT_POT[eventId] ?? 10_000_000) : (STAGE_POT[label] ?? 1_000_000);
  const pot = roundPot(base * TYPE_POT[type] * (0.7 + ((i * 37) % 60) / 100));
  return {
    id: `h${String(i + 1).padStart(2, '0')}`,
    title,
    type,
    eventId,
    dayId: d.id,
    playerIds: [a.id, b.id],
    pot,
    t: Math.round(((i * 0.137) % 0.9 + 0.05) * d.durationMin * 60),
    result:
      type === 'herofold'
        ? `${a.name} lays it down — ${b.name} shows the stronger hand`
        : type === 'allin'
          ? `${winner.name} wins the all-in`
          : type === 'bluff'
            ? `${winner.name} takes it down`
            : `${winner.name} wins the pot`,
    winnerId: winner.id,
    views: 12_000 + ((i * 7919) % 480_000),
    durationSec: 70 + ((i * 53) % 240),
    // A mix of access levels: free clips (no account), free with sign-in, subscribers only.
    access: (i % 4 === 0 ? 'free' : i % 4 === 1 ? 'signin' : 'subscriber') as Access,
  };
});

// ---- archive classics (6) ---------------------------------------------------------------------

export const archive: ArchiveItem[] = [
  { id: 'a1', title: 'Main Event Final Table', year: 2019, subtitle: 'The longest heads-up in championship history', durationSec: 9 * 3600 + 1200, winnerId: 'p19', hue: 215, access: 'signin' },
  { id: 'a2', title: "Players' Championship", year: 2021, subtitle: 'Eight disciplines, one champion', durationSec: 7 * 3600, winnerId: 'p07', hue: 0, access: 'subscriber' },
  { id: 'a3', title: 'High Roller Final Table', year: 2022, subtitle: 'A record field for the summer high roller', durationSec: 6 * 3600 + 900, winnerId: 'p14', hue: 230, access: 'subscriber' },
  { id: 'a4', title: 'Main Event Day 7', year: 2023, subtitle: 'From 35 players to the final nine', durationSec: 10 * 3600, winnerId: 'p17', hue: 260, access: 'subscriber' },
  { id: 'a5', title: 'Tournament of Champions', year: 2024, subtitle: 'Bracelet winners only', durationSec: 5 * 3600 + 1800, winnerId: 'p01', hue: 210, access: 'signin' },
  { id: 'a6', title: 'Main Event Final Table', year: 2025, subtitle: 'The comeback from one big blind', durationSec: 8 * 3600 + 2400, winnerId: 'p04', hue: 270, access: 'subscriber' },
];

// ---- lookups -----------------------------------------------------------------------------------

export { playerById };
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
