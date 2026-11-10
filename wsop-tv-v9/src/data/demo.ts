/**
 * WSOP TV v9 — every number on screen is sample data. Nothing here comes from EBS, GGPass or WSOP+.
 * The demo clock is fixed to the 2026 Main Event final table day so the screens always read the same.
 */

export const nas = (p: string) => __NAS__ + p;

/** Demo "today": Tuesday 14 July 2026, 3:12 PM in Las Vegas (PT). */
export const DEMO_TODAY = '2026-07-14';
export const DEMO_NOW_PT = '3:12 PM';

export type PlayerId =
  | 'negreanu' | 'hellmuth' | 'polk' | 'ivey' | 'dwan' | 'holz'
  | 'koon' | 'haxton' | 'chidwick' | 'bonomo' | 'foxen' | 'badziakouski'
  | 'kenney' | 'seiver';

export type Player = {
  id: PlayerId;
  name: string;
  short: string;
  initials: string;
  country: string;
  cc: string;
  tag?: string;
  bio: string;
  bracelets: number;
  earnings: string;
  poy: number;
  cashes: number;
  finalTables: number;
  firstBracelet: number;
  itm: string;
};

export const PLAYERS: Record<PlayerId, Player> = {
  negreanu: { id: 'negreanu', name: 'Daniel Negreanu', short: 'D. Negreanu', initials: 'DN', country: 'Canada', cc: 'CA', tag: 'GGPoker Ambassador', bio: 'Two-time WSOP Player of the Year, chasing a seventh bracelet at his first Main Event final table since 2001.', bracelets: 6, earnings: '$51M', poy: 2, cashes: 156, finalTables: 47, firstBracelet: 1998, itm: '23%' },
  hellmuth: { id: 'hellmuth', name: 'Phil Hellmuth', short: 'P. Hellmuth', initials: 'PH', country: 'USA', cc: 'US', bio: 'The bracelet record holder. Won the Main Event in 1989 and has been trying to win it again ever since.', bracelets: 17, earnings: '$32M', poy: 1, cashes: 214, finalTables: 68, firstBracelet: 1989, itm: '27%' },
  polk: { id: 'polk', name: 'Doug Polk', short: 'D. Polk', initials: 'DP', country: 'USA', cc: 'US', bio: 'Heads-up specialist and card-room owner, playing a rare full Main Event schedule.', bracelets: 3, earnings: '$10M', poy: 0, cashes: 31, finalTables: 9, firstBracelet: 2014, itm: '19%' },
  ivey: { id: 'ivey', name: 'Phil Ivey', short: 'P. Ivey', initials: 'PI', country: 'USA', cc: 'US', bio: 'Ten bracelets across every game in the rotation, back at a Main Event final table for the first time since 2001.', bracelets: 10, earnings: '$45M', poy: 0, cashes: 95, finalTables: 40, firstBracelet: 2000, itm: '21%' },
  dwan: { id: 'dwan', name: 'Tom Dwan', short: 'T. Dwan', initials: 'TD', country: 'USA', cc: 'US', bio: 'Cash-game legend in his first deep Main Event run. Won his first bracelet in 2025.', bracelets: 1, earnings: '$9M', poy: 0, cashes: 12, finalTables: 3, firstBracelet: 2025, itm: '14%' },
  holz: { id: 'holz', name: 'Fedor Holz', short: 'F. Holz', initials: 'FH', country: 'Germany', cc: 'DE', bio: 'High-roller regular back from semi-retirement. Two bracelets, in 2016 and 2021.', bracelets: 2, earnings: '$41M', poy: 0, cashes: 28, finalTables: 11, firstBracelet: 2016, itm: '25%' },
  koon: { id: 'koon', name: 'Jason Koon', short: 'J. Koon', initials: 'JK', country: 'USA', cc: 'US', bio: 'The high-roller circuit’s most consistent winner over the last decade.', bracelets: 1, earnings: '$58M', poy: 0, cashes: 40, finalTables: 14, firstBracelet: 2022, itm: '24%' },
  haxton: { id: 'haxton', name: 'Isaac Haxton', short: 'I. Haxton', initials: 'IH', country: 'USA', cc: 'US', bio: 'Theory-first high roller with a strong record in the $100K events.', bracelets: 2, earnings: '$40M', poy: 0, cashes: 33, finalTables: 12, firstBracelet: 2016, itm: '20%' },
  chidwick: { id: 'chidwick', name: 'Stephen Chidwick', short: 'S. Chidwick', initials: 'SC', country: 'UK', cc: 'GB', bio: 'England’s all-time money leader and a fixture of every high-roller final table.', bracelets: 2, earnings: '$64M', poy: 0, cashes: 72, finalTables: 22, firstBracelet: 2019, itm: '26%' },
  bonomo: { id: 'bonomo', name: 'Justin Bonomo', short: 'J. Bonomo', initials: 'JB', country: 'USA', cc: 'US', bio: 'Won the $1M Big One for One Drop in 2018 and three bracelets along the way.', bracelets: 3, earnings: '$66M', poy: 0, cashes: 70, finalTables: 21, firstBracelet: 2014, itm: '22%' },
  foxen: { id: 'foxen', name: 'Alex Foxen', short: 'A. Foxen', initials: 'AF', country: 'USA', cc: 'US', bio: 'Former GPI Player of the Year, built his bankroll in the high-roller series.', bracelets: 1, earnings: '$37M', poy: 1, cashes: 64, finalTables: 19, firstBracelet: 2023, itm: '24%' },
  badziakouski: { id: 'badziakouski', name: 'Mikita Badziakouski', short: 'M. Badziakouski', initials: 'MB', country: 'Belarus', cc: 'BY', bio: 'Super-high-roller specialist who rarely plays below $50K.', bracelets: 1, earnings: '$40M', poy: 0, cashes: 18, finalTables: 8, firstBracelet: 2018, itm: '28%' },
  kenney: { id: 'kenney', name: 'Bryn Kenney', short: 'B. Kenney', initials: 'BK', country: 'USA', cc: 'US', bio: 'Former all-time money leader, back at the high-roller tables this summer.', bracelets: 1, earnings: '$69M', poy: 0, cashes: 45, finalTables: 13, firstBracelet: 2014, itm: '21%' },
  seiver: { id: 'seiver', name: 'Scott Seiver', short: 'S. Seiver', initials: 'SS', country: 'USA', cc: 'US', bio: 'Mixed-game and high-roller winner with five bracelets, and the 2025 Main Event champion.', bracelets: 5, earnings: '$34M', poy: 0, cashes: 61, finalTables: 20, firstBracelet: 2018, itm: '23%' },
};

export type Status = 'live' | 'vod' | 'upcoming' | 'final' | 'replay';
/** GGPass bundle tiers (WSOP+ billing). Free: highlights + schedule. Standard: live + timeshift/VOD. Platinum: also picks any feature table when several are live. */
export type Tier = 'free' | 'standard' | 'platinum';
export const TIER_RANK: Record<Tier, number> = { free: 0, standard: 1, platinum: 2 };
export const PLANS: { tier: Tier; name: string; price: string }[] = [
  { tier: 'free', name: 'Free', price: '$0' },
  { tier: 'standard', name: 'GGPass Standard', price: '$9.99/mo' },
  { tier: 'platinum', name: 'GGPass Platinum', price: '$49.99/mo' },
];
export const PLAN_FEATURES: { label: string; from: Tier }[] = [
  { label: 'Highlight clips', from: 'free' },
  { label: 'Schedule', from: 'free' },
  { label: 'Live streaming', from: 'standard' },
  { label: 'Timeshift / VOD', from: 'standard' },
  { label: 'Multi feature table select', from: 'platinum' },
];

export type Broadcast = {
  id: string;
  status: Status;
  /** Second line on the ticker card. */
  sub: string;
  /** Short label for the ticker card. */
  short: string;
  title: string;
  series: string;
  season: number;
  eventNo: string;
  day: string;
  table: string;
  venue: string;
  started: string;
  prize: string;
  blinds: [number, number, number];
  /** Seats in order with starting chip counts (sample). */
  seats: { pid: PlayerId; chips: number }[];
  still: string;
  video: string;
  /** Where in the source footage this broadcast starts (seconds). */
  offset: number;
  /** Lowest GGPass tier that plays it. */
  access: Tier;
  viewers?: number;
  /** For upcoming broadcasts. */
  startsAt?: string;
  /** For replays: the final result. */
  result?: { pid: PlayerId; place: number }[];
  /** Payout ladder from the remaining places upward (sample). */
  payouts: { place: number; amount: string }[];
};

const ME_PAYOUTS = [
  { place: 1, amount: '$12,100,000' },
  { place: 2, amount: '$6,300,000' },
  { place: 3, amount: '$4,700,000' },
  { place: 4, amount: '$3,500,000' },
  { place: 5, amount: '$2,600,000' },
  { place: 6, amount: '$2,000,000' },
];

const HR_PAYOUTS = [
  { place: 1, amount: '$2,450,000' },
  { place: 2, amount: '$1,515,000' },
  { place: 3, amount: '$1,050,000' },
  { place: 4, amount: '$745,000' },
  { place: 5, amount: '$540,000' },
  { place: 6, amount: '$405,000' },
  { place: 7, amount: '$312,000' },
];

/** Today's broadcasts: what the Tournament Ticker lists. */
export const TODAY: Broadcast[] = [
  {
    id: 'me-ft',
    status: 'live',
    sub: '6 Players · $12.1M',
    short: 'Main Event FT',
    title: 'Main Event · Final Table',
    series: 'WSOP 2026',
    season: 2026,
    eventNo: 'Event #76',
    day: 'Final Table',
    table: 'Main Stage',
    venue: 'Horseshoe & Paris Las Vegas',
    started: '2:00 PM PT',
    prize: '$12.1M First Place',
    blinds: [100_000, 200_000, 200_000],
    seats: [
      { pid: 'negreanu', chips: 45_200_000 },
      { pid: 'hellmuth', chips: 38_500_000 },
      { pid: 'polk', chips: 35_100_000 },
      { pid: 'ivey', chips: 32_800_000 },
      { pid: 'dwan', chips: 28_200_000 },
      { pid: 'holz', chips: 28_200_000 },
    ],
    still: 'stills/vegas-ft-05.jpg',
    video: 'video/ft.mp4',
    offset: 0,
    access: 'standard',
    viewers: 12_450,
    payouts: ME_PAYOUTS,
  },
  {
    id: 'hr100k',
    status: 'live',
    sub: '7 Left · $2.45M',
    short: '$100K HR',
    title: '$100,000 High Roller · Final Day',
    series: 'WSOP 2026',
    season: 2026,
    eventNo: 'Event #81',
    day: 'Day 3 · Final',
    table: 'Feature Table',
    venue: 'Horseshoe Las Vegas',
    started: '1:00 PM PT',
    prize: '$2.45M First Place',
    blinds: [60_000, 120_000, 120_000],
    seats: [
      { pid: 'koon', chips: 9_800_000 },
      { pid: 'chidwick', chips: 8_150_000 },
      { pid: 'haxton', chips: 6_900_000 },
      { pid: 'bonomo', chips: 5_400_000 },
      { pid: 'foxen', chips: 4_750_000 },
      { pid: 'badziakouski', chips: 3_200_000 },
      { pid: 'kenney', chips: 2_600_000 },
    ],
    still: 'stills/vegas-hr-02.jpg',
    video: 'video/ft.mp4',
    offset: 420,
    access: 'platinum',
    viewers: 3_180,
    payouts: HR_PAYOUTS,
  },
  {
    id: 'seniors',
    status: 'final',
    sub: 'Winner: J. Smith',
    short: 'Seniors Event',
    title: 'Seniors Championship · Final Table',
    series: 'WSOP 2026',
    season: 2026,
    eventNo: 'Event #74',
    day: 'Final Table',
    table: 'Feature Table',
    venue: 'Horseshoe Las Vegas',
    started: 'Ended 11:40 AM PT',
    prize: '$662K First Place',
    blinds: [40_000, 80_000, 80_000],
    seats: [],
    still: 'stills/vegas-d1-04.jpg',
    video: 'video/ft.mp4',
    offset: 1600,
    access: 'standard',
    payouts: [],
  },
  {
    id: 'me-d6',
    status: 'vod',
    sub: 'Full · 8h 45m',
    short: 'ME Day 6',
    title: 'Main Event · Day 6',
    series: 'WSOP 2026',
    season: 2026,
    eventNo: 'Event #76',
    day: 'Day 6',
    table: 'Feature Table',
    venue: 'Horseshoe & Paris Las Vegas',
    started: 'Yesterday · 11:00 AM PT',
    prize: '$12.1M First Place',
    blinds: [60_000, 120_000, 120_000],
    seats: [
      { pid: 'negreanu', chips: 21_400_000 },
      { pid: 'ivey', chips: 18_900_000 },
      { pid: 'seiver', chips: 12_300_000 },
      { pid: 'dwan', chips: 11_000_000 },
      { pid: 'holz', chips: 9_700_000 },
      { pid: 'polk', chips: 8_800_000 },
    ],
    still: 'stills/vegas-d5-02.jpg',
    video: 'video/ft.mp4',
    offset: 900,
    access: 'standard',
    payouts: ME_PAYOUTS,
  },
  {
    id: 'mm-ft',
    status: 'upcoming',
    sub: 'Final Table · 9 Left',
    short: 'Mystery Millions FT',
    title: 'Mystery Millions · Final Table',
    series: 'WSOP 2026',
    season: 2026,
    eventNo: 'Event #79',
    day: 'Final Table',
    table: 'Feature Table',
    venue: 'Paris Las Vegas',
    started: '7:00 PM PT',
    startsAt: '7:00 PM PT',
    prize: '$1M First Place',
    blinds: [50_000, 100_000, 100_000],
    seats: [],
    still: 'stills/vegas-shr-03.jpg',
    video: 'video/ft.mp4',
    offset: 1300,
    access: 'standard',
    payouts: [],
  },
  {
    id: 'ppc50k',
    status: 'upcoming',
    sub: 'Day 1',
    short: '$50K PPC',
    title: '$50,000 Poker Players Championship · Day 1',
    series: 'WSOP 2026',
    season: 2026,
    eventNo: 'Event #82',
    day: 'Day 1',
    table: 'Feature Table',
    venue: 'Horseshoe Las Vegas',
    started: '9:00 PM PT',
    startsAt: '9:00 PM PT',
    prize: '',
    blinds: [0, 0, 0],
    seats: [],
    still: 'stills/vegas-shr-06.jpg',
    video: 'video/ft.mp4',
    offset: 1700,
    access: 'standard',
    payouts: [],
  },
];

/** Past finals: replays opened from a player's PAST FINALS. Same screen as live, marked REPLAY. */
export const REPLAYS: Broadcast[] = [
  rep('r-2025-me', 2025, 'Main Event · Final Table', 'Event #74', 'stills/vegas-ft-11.jpg', 'video/ft.mp4', 200, [
    ['seiver', 1], ['polk', 2], ['holz', 3], ['dwan', 4], ['kenney', 5],
  ]),
  rep('r-2024-ppc', 2024, '$50,000 Poker Players Championship · Final Table', 'Event #48', 'stills/vegas-shr-05.jpg', 'video/ft.mp4', 1100, [
    ['negreanu', 1], ['ivey', 2], ['seiver', 3], ['hellmuth', 4], ['bonomo', 5], ['chidwick', 6],
  ]),
  rep('r-2023-hr', 2023, '$250,000 Super High Roller · Final Table', 'Event #60', 'stills/vegas-shr-01.jpg', 'video/ft.mp4', 600, [
    ['koon', 3], ['chidwick', 1], ['holz', 2], ['haxton', 4], ['badziakouski', 5], ['foxen', 6],
  ]),
  rep('r-2021-hr', 2021, '$100,000 High Roller · Final Table', 'Event #29', 'stills/vegas-hr-05.jpg', 'video/ft.mp4', 1500, [
    ['holz', 1], ['kenney', 2], ['bonomo', 3], ['koon', 4], ['dwan', 5], ['foxen', 6],
  ]),
  rep('r-2019-hu', 2019, '$25,000 Heads-Up Championship · Final', 'Event #52', 'stills/wsope-ft-06.jpg', 'video/ft.mp4', 1800, [
    ['polk', 1], ['haxton', 2],
  ]),
  rep('r-2001-me', 2001, 'Main Event · Final Table', 'Event #27', 'stills/classic-2001-b.jpg', 'video/classic.mp4', 0, [
    ['negreanu', 3], ['ivey', 5], ['hellmuth', 2], ['seiver', 4],
  ]),
  rep('r-1989-me', 1989, 'Main Event · Final Table', 'Event #17', 'stills/classic-1989-a.jpg', 'video/classic.mp4', 60, [
    ['hellmuth', 1],
  ]),
];

function rep(id: string, season: number, title: string, eventNo: string, still: string, video: string, offset: number, result: [PlayerId, number][]): Broadcast {
  const year = String(season);
  return {
    id,
    status: 'replay',
    sub: 'Replay',
    short: `${year} ${title.split(' · ')[0].replace('Main Event', 'ME').replace(/,000/g, 'K')}`,
    title,
    series: `WSOP ${year}`,
    season,
    eventNo,
    day: title.includes('Heads-Up') ? 'Final' : 'Final Table',
    table: 'Main Stage',
    venue: season < 2005 ? "Binion's Horseshoe, Las Vegas" : 'Las Vegas',
    started: `Aired ${year}`,
    prize: '',
    blinds: [0, 0, 0],
    seats: result.map(([pid]) => ({ pid, chips: 0 })),
    still,
    video,
    offset,
    access: 'standard',
    result: result.map(([pid, place]) => ({ pid, place })).sort((a, b) => a.place - b.place),
    payouts: [],
  };
}

export const ALL_BROADCASTS = [...TODAY, ...REPLAYS];
export const broadcastById = (id?: string) => ALL_BROADCASTS.find((b) => b.id === id);

/** Edited hand clips (free). Live hands in the Hand History link here when the clip exists. */
export type Clip = {
  id: string;
  title: string;
  broadcastId: string;
  hand: number;
  when: string;
  duration: string;
  still: string;
  offset: number;
  players: PlayerId[];
  tags: string[];
  views: string;
  summary: string;
  actions: { street: string; text: string }[];
};

export const CLIPS: Clip[] = [
  {
    id: 'c-negreanu-polk', tags: ['Key Hand','Big Pot'], views: '125K', title: '$2.4M Pot: Negreanu vs Polk', broadcastId: 'me-ft', hand: 171, when: 'Main Event FT · 1h ago', duration: '4:32', still: 'stills/vegas-ft-12.jpg', offset: 60, players: ['negreanu', 'polk'],
    summary: 'Negreanu flats Polk’s button open with pocket nines, check-raises a 9-high flop for a set and gets paid all the way to the river.',
    actions: [
      { street: 'Pre-flop', text: 'Polk raises to 450K on the button · Negreanu calls from the big blind' },
      { street: 'Flop 9♣ 6♦ 2♠', text: 'Negreanu checks · Polk bets 400K · Negreanu raises to 1.2M · Polk calls' },
      { street: 'Turn K♥', text: 'Negreanu bets 1.6M · Polk calls' },
      { street: 'River 3♣', text: 'Negreanu bets 2.4M · Polk calls · Negreanu shows 9♥ 9♦ and wins 8.9M' },
    ],
  },
  {
    id: 'c-soul-read', tags: ['Key Hand','Soul Read'], views: '98K', title: 'Negreanu’s Soul Read on Hellmuth', broadcastId: 'me-d6', hand: 88, when: 'Main Event Day 6 · Yesterday', duration: '3:15', still: 'stills/vegas-d5-05.jpg', offset: 240, players: ['negreanu', 'hellmuth'],
    summary: 'Negreanu names Hellmuth’s hand out loud on the river and folds two pair face up.',
    actions: [
      { street: 'Pre-flop', text: 'Hellmuth raises to 260K · Negreanu calls' },
      { street: 'Flop Q♠ 8♠ 4♦', text: 'Hellmuth bets 300K · Negreanu calls' },
      { street: 'Turn 8♥', text: 'Both check' },
      { street: 'River 2♠', text: 'Hellmuth bets 1.1M · Negreanu folds Q♥ J♣ · Hellmuth shows A♠ 5♠' },
    ],
  },
  {
    id: 'c-triple-barrel', tags: ['Bluff','Big Pot'], views: '74K', title: 'Koon’s Seven-High Triple Barrel', broadcastId: 'hr100k', hand: 64, when: '$100K HR · 2 days ago', duration: '5:21', still: 'stills/vegas-hr-04.jpg', offset: 480, players: ['koon', 'chidwick'],
    summary: 'Koon fires three streets with seven-high and Chidwick finds the fold with top pair.',
    actions: [
      { street: 'Pre-flop', text: 'Koon raises to 240K · Chidwick calls' },
      { street: 'Flop K♦ 10♣ 5♣', text: 'Koon bets 180K · Chidwick calls' },
      { street: 'Turn 2♥', text: 'Koon bets 520K · Chidwick calls' },
      { street: 'River 3♠', text: 'Koon shoves 2.1M · Chidwick folds K♠ J♥' },
    ],
  },
  {
    id: 'c-road-ft', tags: ['Interview'], views: '41K', title: 'Interview: Road to the final table', broadcastId: 'me-d6', hand: 0, when: 'Main Event · 4 days ago', duration: '2:45', still: 'stills/vegas-ft-10.jpg', offset: 1000, players: ['negreanu'],
    summary: 'Negreanu on his first Main Event final table in 25 years.',
    actions: [],
  },
  {
    id: 'c-ivey-hero', tags: ['Hero Call','Big Pot'], views: '79K', title: 'Ivey’s hero call with ace-high', broadcastId: 'me-ft', hand: 176, when: 'Main Event FT · 40 min ago', duration: '3:02', still: 'stills/vegas-ft-06.jpg', offset: 320, players: ['ivey', 'dwan'],
    summary: 'Dwan overbets the river on a four-flush board; Ivey calls with the ace of hearts that blocks the nuts.',
    actions: [
      { street: 'Pre-flop', text: 'Dwan raises to 450K · Ivey 3-bets to 1.5M · Dwan calls' },
      { street: 'Flop J♥ 7♥ 4♣', text: 'Ivey bets 1.1M · Dwan calls' },
      { street: 'Turn 2♥', text: 'Both check' },
      { street: 'River 9♥', text: 'Dwan bets 6M · Ivey calls with A♥ K♣ and wins 17.2M' },
    ],
  },
  {
    id: 'c-holz-double', tags: ['All-In','Double Up'], views: '63K', title: 'Holz doubles through Hellmuth', broadcastId: 'me-ft', hand: 179, when: 'Main Event FT · 25 min ago', duration: '2:18', still: 'stills/vegas-ft-13.jpg', offset: 520, players: ['holz', 'hellmuth'],
    summary: 'Ace-king against queens, all in pre-flop; a king on the turn keeps Holz alive.',
    actions: [
      { street: 'Pre-flop', text: 'Hellmuth raises to 500K · Holz shoves 11.6M · Hellmuth calls with Q♦ Q♣' },
      { street: 'Board 8♠ 5♥ 3♦ K♣ 2♥', text: 'Holz shows A♦ K♥ and doubles to 23.4M' },
    ],
  },
  {
    id: 'c-bonomo-cooler', tags: ['Set Over Set','All-In'], views: '52K', title: 'Set Over Set All-In', broadcastId: 'hr100k', hand: 71, when: '$100K HR · 1h ago', duration: '2:56', still: 'stills/vegas-hr-03.jpg', offset: 760, players: ['bonomo', 'foxen'],
    summary: 'Sevens against fours on a dry board: 5.8M goes in on the turn.',
    actions: [
      { street: 'Pre-flop', text: 'Foxen raises to 250K · Bonomo calls' },
      { street: 'Flop 7♠ 4♥ Q♦', text: 'Foxen bets 200K · Bonomo raises to 650K · Foxen calls' },
      { street: 'Turn 10♣', text: 'Bonomo shoves · Foxen calls with 4♣ 4♦ · Bonomo shows 7♣ 7♦' },
    ],
  },
  {
    id: 'c-aa-cracked', tags: ['Bad Beat', 'All-In'], views: '87K', title: 'AA Cracked by Runner-Runner', broadcastId: 'me-ft', hand: 168, when: 'Main Event FT · 1h ago', duration: '2:40', still: 'stills/vegas-ft-08.jpg', offset: 700, players: ['polk', 'dwan'],
    summary: 'Polk gets aces in against Dwan’s ace-king of spades and loses to back-to-back spades.',
    actions: [
      { street: 'Pre-flop', text: 'Dwan raises to 450K · Polk 3-bets to 1.4M · Dwan 4-bets all in for 14.1M · Polk calls with A♣ A♦' },
      { street: 'Board Q♦ 8♠ 3♥ 6♠ 2♠', text: 'Dwan shows A♠ K♠ and makes a flush on the river' },
    ],
  },
  {
    id: 'c-day5-hl', tags: ['Highlights'], views: '210K', title: 'Main Event Day 5 Highlights', broadcastId: 'me-d6', hand: 0, when: 'Day 5 Highlights · 3 days ago', duration: '12:08', still: 'stills/vegas-d5-07.jpg', offset: 1200, players: ['negreanu', 'ivey', 'dwan'],
    summary: 'The best of Day 5: 74 players down to 31, Ivey’s comeback and Negreanu’s run to the chip lead.',
    actions: [],
  },
  {
    id: 'c-ivey-10', tags: ['Recap', 'Bracelet'], views: '144K', title: 'Ivey’s Bracelet #10', broadcastId: 'r-2024-ppc', hand: 0, when: '$10K PLO Recap', duration: '6:30', still: 'stills/vegas-shr-04.jpg', offset: 1400, players: ['ivey'],
    summary: 'The final three hands of Ivey’s tenth bracelet win.',
    actions: [],
  },
  {
    id: 'c-hellmuth-bluff', tags: ['Bluff', 'Hand of the Day'], views: '96K', title: 'Hellmuth’s Epic Bluff', broadcastId: 'me-d6', hand: 102, when: 'Hand of the Day', duration: '2:12', still: 'stills/vegas-d5-08.jpg', offset: 1500, players: ['hellmuth', 'ivey'],
    summary: 'Hellmuth turns third pair into a bluff and gets Ivey to fold the best hand.',
    actions: [
      { street: 'Flop 10♦ 7♣ 3♣', text: 'Ivey bets 260K · Hellmuth calls with 7♦ 6♦' },
      { street: 'Turn A♠', text: 'Ivey checks · Hellmuth bets 700K · Ivey calls' },
      { street: 'River K♣', text: 'Ivey checks · Hellmuth bets 2.2M · Ivey folds 10♠ 9♠' },
    ],
  },
];

export const clipById = (id?: string) => CLIPS.find((c) => c.id === id);
export const clipsFor = (pid: PlayerId) => CLIPS.filter((c) => c.players.includes(pid));
export const clipFor = (broadcastId: string, hand: number) => CLIPS.find((c) => c.broadcastId === broadcastId && c.hand === hand);

/** Past finals per player (the timeline on the profile). */
export const pastFinals = (pid: PlayerId) =>
  REPLAYS.flatMap((b) => {
    const r = b.result?.find((x) => x.pid === pid);
    return r ? [{ broadcast: b, place: r.place }] : [];
  }).sort((a, b) => b.broadcast.season - a.broadcast.season);

/** The broadcast a player is in right now, if any. */
export const liveBroadcastOf = (pid: PlayerId) => TODAY.find((b) => b.seats.some((s) => s.pid === pid) && b.id !== 'me-d6');

/** Schedule: 7 days around the demo day. Times in PT. */
export type ScheduleItem = { time: string; title: string; eventNo: string; broadcastId?: string; note?: string };
export const SCHEDULE: { date: string; label: string; items: ScheduleItem[] }[] = [
  { date: '2026-07-10', label: 'Fri, Jul 10', items: [
    { time: '11:00 AM', title: 'Main Event · Day 2ab', eventNo: 'Event #76', broadcastId: 'me-d6' },
    { time: '4:00 PM', title: '$1,500 Millionaire Maker · Final Table', eventNo: 'Event #71' },
  ] },
  { date: '2026-07-11', label: 'Sat, Jul 11', items: [
    { time: '11:00 AM', title: 'Main Event · Day 3', eventNo: 'Event #76', broadcastId: 'me-d6' },
  ] },
  { date: '2026-07-12', label: 'Sun, Jul 12', items: [] },
  { date: '2026-07-13', label: 'Mon, Jul 13', items: [
    { time: '11:00 AM', title: 'Main Event · Day 6', eventNo: 'Event #76', broadcastId: 'me-d6' },
    { time: '1:00 PM', title: '$100,000 High Roller · Day 2', eventNo: 'Event #81', broadcastId: 'hr100k' },
  ] },
  { date: '2026-07-14', label: 'Tue, Jul 14', items: [
    { time: '1:00 PM', title: '$100,000 High Roller · Final Day', eventNo: 'Event #81', broadcastId: 'hr100k' },
    { time: '2:00 PM', title: 'Main Event · Final Table', eventNo: 'Event #76', broadcastId: 'me-ft' },
    { time: '7:00 PM', title: 'Mystery Millions · Final Table', eventNo: 'Event #79', broadcastId: 'mm-ft' },
  ] },
  { date: '2026-07-15', label: 'Wed, Jul 15', items: [
    { time: '5:00 PM', title: 'Main Event · Winner’s interview & recap show', eventNo: 'Event #76', note: 'Studio show' },
  ] },
  { date: '2026-07-16', label: 'Thu, Jul 16', items: [] },
];

export const fmtChips = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
export const fmtBlinds = (b: [number, number, number]) => `${fmtChips(b[0])}/${fmtChips(b[1])}/${fmtChips(b[2])} ante`;
export const ordinal = (n: number) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
