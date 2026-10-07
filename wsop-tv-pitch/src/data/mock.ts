// MOCK DATA (in-code JSON). Fictional players and results. Broadcast times are generated relative to
// page load so the demo always has live, upcoming and ended slots "today".
import type { Banner, Channel, Curation, HomeSection, Notice, Player, Schedule, Series, StripBanner, TourEvent, Vod } from './types';
import { dayRel, hoursFrom } from '../lib/time';

const HALF_HOUR = 30 * 60_000;
/** Load time rounded down to the half hour: the anchor for every relative slot. */
export const T0 = Math.floor(Date.now() / HALF_HOUR) * HALF_HOUR;
const at = (h: number) => hoursFrom(T0, h);

const NASSAU = 'America/Nassau';
const NICOSIA = 'Asia/Nicosia';
const LA = 'America/Los_Angeles';

export const tours = ['BRACELETS', 'SUPER CIRCUIT', 'CIRCUIT'] as const;

export const series: Series[] = [
  { id: 'ser-paradise', tour: 'BRACELETS', name: '2026 WSOP Paradise', start: dayRel(-5, NASSAU), end: dayRel(10, NASSAU), venue: 'Baha Mar Resort', city: 'Nassau, Bahamas', timezone: NASSAU, hue: 200 },
  { id: 'ser-cyprus', tour: 'SUPER CIRCUIT', name: '2026 WSOP Super Circuit Cyprus', start: dayRel(20, NICOSIA), end: dayRel(31, NICOSIA), venue: 'Merit Royal Diamond', city: 'Kyrenia, Cyprus', timezone: NICOSIA, hue: 280 },
  { id: 'ser-la', tour: 'CIRCUIT', name: '2026 WSOP Circuit Los Angeles', start: dayRel(-45, LA), end: dayRel(-34, LA), venue: 'The Commerce Casino', city: 'Los Angeles, CA', timezone: LA, hue: 20 },
  { id: 'ser-vegas', tour: 'BRACELETS', name: '2026 WSOP Las Vegas', start: dayRel(-125, LA), end: dayRel(-77, LA), venue: 'Horseshoe & Paris', city: 'Las Vegas, NV', timezone: LA, hue: 45 },
];

const days = (prefix: string, tz: string, offsets: [EvDayLabel, number][]) =>
  offsets.map(([label, n]) => ({ id: `${prefix}-${label.replace(/\s/g, '').toLowerCase()}`, label, date: dayRel(n, tz) }));
type EvDayLabel = 'Day 1A' | 'Day 1B' | 'Day 2' | 'Day 3' | 'Final Table';

export const events: TourEvent[] = [
  // Paradise (ongoing)
  { id: 'ev-p8', seriesId: 'ser-paradise', number: 8, name: 'Mystery Bounty', buyIn: '$1,000', days: days('ev-p8', NASSAU, [['Day 1A', -4], ['Day 1B', -3], ['Day 2', -1], ['Final Table', 0]]) },
  { id: 'ev-p10', seriesId: 'ser-paradise', number: 10, name: 'NLH High Roller', buyIn: '$25,000', days: days('ev-p10', NASSAU, [['Day 1A', -2], ['Day 2', -1], ['Final Table', 0]]) },
  { id: 'ev-p11', seriesId: 'ser-paradise', number: 11, name: 'Pot-Limit Omaha', buyIn: '$5,000', days: days('ev-p11', NASSAU, [['Day 1A', -3], ['Day 2', -1], ['Final Table', 0]]) },
  { id: 'ev-p12', seriesId: 'ser-paradise', number: 12, name: 'Ladies Championship', buyIn: '$1,000', days: days('ev-p12', NASSAU, [['Day 1A', -1], ['Final Table', 0]]) },
  { id: 'ev-p13', seriesId: 'ser-paradise', number: 13, name: 'Main Event', buyIn: '$3,000', days: days('ev-p13', NASSAU, [['Day 1A', -2], ['Day 1B', -1], ['Day 2', 0], ['Day 3', 1], ['Final Table', 2]]) },
  { id: 'ev-p14', seriesId: 'ser-paradise', number: 14, name: 'Mini Main Event', buyIn: '$600', days: days('ev-p14', NASSAU, [['Day 1A', 0], ['Day 1B', 1], ['Day 2', 2], ['Final Table', 3]]) },
  // Super Circuit Cyprus (upcoming)
  { id: 'ev-c1', seriesId: 'ser-cyprus', number: 1, name: 'Opener NLH', buyIn: '€550', days: days('ev-c1', NICOSIA, [['Day 1A', 20], ['Day 2', 21], ['Final Table', 22]]) },
  { id: 'ev-c5', seriesId: 'ser-cyprus', number: 5, name: 'PLO Championship', buyIn: '€2,200', days: days('ev-c5', NICOSIA, [['Day 1A', 23], ['Final Table', 24]]) },
  { id: 'ev-c9', seriesId: 'ser-cyprus', number: 9, name: 'Super High Roller', buyIn: '€50,000', days: days('ev-c9', NICOSIA, [['Day 1A', 26], ['Final Table', 27]]) },
  { id: 'ev-c12', seriesId: 'ser-cyprus', number: 12, name: 'Main Event', buyIn: '€5,300', days: days('ev-c12', NICOSIA, [['Day 1A', 27], ['Day 1B', 28], ['Day 2', 29], ['Final Table', 31]]) },
  // Circuit LA (ended)
  { id: 'ev-l1', seriesId: 'ser-la', number: 1, name: 'Circuit Opener', buyIn: '$400', days: days('ev-l1', LA, [['Day 1A', -45], ['Final Table', -44]]) },
  { id: 'ev-l6', seriesId: 'ser-la', number: 6, name: 'PLO Bounty', buyIn: '$600', days: days('ev-l6', LA, [['Day 1A', -41], ['Final Table', -40]]) },
  { id: 'ev-l10', seriesId: 'ser-la', number: 10, name: 'Main Event Ring', buyIn: '$1,700', days: days('ev-l10', LA, [['Day 1A', -38], ['Day 1B', -37], ['Day 2', -36], ['Final Table', -35]]) },
  { id: 'ev-l12', seriesId: 'ser-la', number: 12, name: 'High Roller Ring', buyIn: '$5,000', days: days('ev-l12', LA, [['Day 1A', -35], ['Final Table', -34]]) },
  // Las Vegas (ended)
  { id: 'ev-v1', seriesId: 'ser-vegas', number: 1, name: 'Mystery Millions', buyIn: '$1,000', days: days('ev-v1', LA, [['Day 1A', -125], ['Final Table', -121]]) },
  { id: 'ev-v45', seriesId: 'ser-vegas', number: 45, name: 'Poker Players Championship', buyIn: '$50,000', days: days('ev-v45', LA, [['Day 1A', -100], ['Final Table', -96]]) },
  { id: 'ev-v76', seriesId: 'ser-vegas', number: 76, name: 'NLH Main Event', buyIn: '$10,000', days: days('ev-v76', LA, [['Day 1A', -95], ['Day 2', -90], ['Final Table', -77]]) },
  { id: 'ev-v80', seriesId: 'ser-vegas', number: 80, name: 'Tournament of Champions', buyIn: 'Freeroll', days: days('ev-v80', LA, [['Day 1A', -80], ['Final Table', -79]]) },
];

export const channels: Channel[] = [
  { id: 'CH-01', name: 'Feature EN', signal: 'ok' },
  { id: 'CH-02', name: 'Feature ES', signal: 'ok' },
  { id: 'CH-03', name: 'Final Table', signal: 'ok' },
  { id: 'CH-04', name: 'Studio / Highlights', signal: 'no-signal' },
];

const S = (s: Omit<Schedule, 'visible' | 'baseViewers'> & { baseViewers?: number; visible?: boolean }): Schedule => ({
  visible: true,
  baseViewers: 0,
  ...s,
});

/** 편성 — today has 3 live, several upcoming and ended (with replay VODs), plus yesterday / tomorrow / the day after. */
export const schedules: Schedule[] = [
  // yesterday
  S({ id: 'sc-01', title: 'Main Event Day 1B — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day1b', type: 'Feature Table', channelId: 'CH-01', lang: 'EN', tier: 'basic', start: at(-27), end: at(-21), vodId: 'v-01' }),
  S({ id: 'sc-02', title: 'High Roller Day 2 — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p10', dayId: 'ev-p10-day2', type: 'Feature Table', channelId: 'CH-03', lang: 'EN', tier: 'premium', start: at(-26), end: at(-21), vodId: 'v-02' }),
  // today — ended
  S({ id: 'sc-03', title: 'Mystery Bounty Final Table', seriesId: 'ser-paradise', eventId: 'ev-p8', dayId: 'ev-p8-finaltable', type: 'Final Table', channelId: 'CH-03', lang: 'EN', tier: 'basic', start: at(-7), end: at(-4), vodId: 'v-03' }),
  S({ id: 'sc-04', title: 'PLO Final Table (Español)', seriesId: 'ser-paradise', eventId: 'ev-p11', dayId: 'ev-p11-finaltable', type: 'Final Table', channelId: 'CH-02', lang: 'ES', tier: 'basic', start: at(-6), end: at(-3), vodId: 'v-04' }),
  S({ id: 'sc-05', title: 'Paradise Daily — Day 1B Recap', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day1b', type: 'Highlight Show', channelId: 'CH-04', lang: 'EN', tier: 'free', start: at(-5), end: at(-4), vodId: 'v-05' }),
  // today — live (same event, different table / language)
  S({ id: 'sc-06', title: 'Main Event Day 2 — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day2', type: 'Feature Table', channelId: 'CH-01', lang: 'EN', tier: 'premium', start: at(-2), end: at(3), baseViewers: 18400 }),
  S({ id: 'sc-07', title: 'Main Event Day 2 — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day2', type: 'Feature Table', channelId: 'CH-02', lang: 'ES', tier: 'basic', start: at(-2), end: at(3), baseViewers: 6200 }),
  S({ id: 'sc-08', title: 'High Roller Final Table', seriesId: 'ser-paradise', eventId: 'ev-p10', dayId: 'ev-p10-finaltable', type: 'Final Table', channelId: 'CH-03', lang: 'EN', tier: 'free', start: at(-1), end: at(2.5), baseViewers: 9100 }),
  // today — upcoming
  S({ id: 'sc-09', title: 'Ladies Championship Final Table', seriesId: 'ser-paradise', eventId: 'ev-p12', dayId: 'ev-p12-finaltable', type: 'Final Table', channelId: 'CH-03', lang: 'EN', tier: 'basic', start: at(3), end: at(7) }),
  S({ id: 'sc-10', title: 'Paradise Daily — Main Event Day 2 Recap', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day2', type: 'Highlight Show', channelId: 'CH-04', lang: 'EN', tier: 'free', start: at(3.5), end: at(4.5) }),
  S({ id: 'sc-11', title: 'Mini Main Day 1A — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p14', dayId: 'ev-p14-day1a', type: 'Feature Table', channelId: 'CH-01', lang: 'EN', tier: 'basic', start: at(4), end: at(9), originalStart: at(3) }),
  S({ id: 'sc-12', title: 'Mini Main Day 1A — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p14', dayId: 'ev-p14-day1a', type: 'Feature Table', channelId: 'CH-02', lang: 'ES', tier: 'basic', start: at(4), end: at(9) }),
  // tomorrow
  S({ id: 'sc-13', title: 'Main Event Day 3 — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day3', type: 'Feature Table', channelId: 'CH-01', lang: 'EN', tier: 'premium', start: at(22), end: at(29) }),
  S({ id: 'sc-14', title: 'Main Event Day 3 — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day3', type: 'Feature Table', channelId: 'CH-02', lang: 'ES', tier: 'basic', start: at(22), end: at(29) }),
  S({ id: 'sc-15', title: 'Mini Main Day 1B — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p14', dayId: 'ev-p14-day1b', type: 'Feature Table', channelId: 'CH-03', lang: 'PT', tier: 'basic', start: at(23), end: at(28) }),
  S({ id: 'sc-16', title: 'Paradise Daily — Day 3 Preview', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-day3', type: 'Highlight Show', channelId: 'CH-04', lang: 'EN', tier: 'free', start: at(21), end: at(22) }),
  // the day after
  S({ id: 'sc-17', title: 'Main Event Final Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-finaltable', type: 'Final Table', channelId: 'CH-01', lang: 'EN', tier: 'premium', start: at(46), end: at(53) }),
  S({ id: 'sc-18', title: 'Main Event Final Table', seriesId: 'ser-paradise', eventId: 'ev-p13', dayId: 'ev-p13-finaltable', type: 'Final Table', channelId: 'CH-02', lang: 'ES', tier: 'premium', start: at(46), end: at(53) }),
  S({ id: 'sc-19', title: 'Mini Main Day 2 — Feature Table', seriesId: 'ser-paradise', eventId: 'ev-p14', dayId: 'ev-p14-day2', type: 'Feature Table', channelId: 'CH-03', lang: 'EN', tier: 'basic', start: at(47), end: at(52) }),
];

export const players: Player[] = [
  { id: 'pl-1', name: 'Mateo Valcourt', country: 'France', flag: '🇫🇷', bracelets: 3, rings: 5, earnings: 8_420_000, hue: 210 },
  { id: 'pl-2', name: 'Yuna Kagami', country: 'Japan', flag: '🇯🇵', bracelets: 2, rings: 1, earnings: 5_130_000, hue: 330 },
  { id: 'pl-3', name: 'Diego Albarrán', country: 'Mexico', flag: '🇲🇽', bracelets: 1, rings: 7, earnings: 3_960_000, hue: 140 },
  { id: 'pl-4', name: 'Seo-yeon Han', country: 'South Korea', flag: '🇰🇷', bracelets: 2, rings: 2, earnings: 6_270_000, hue: 270 },
  { id: 'pl-5', name: 'Callum Breck', country: 'United Kingdom', flag: '🇬🇧', bracelets: 0, rings: 4, earnings: 1_480_000, hue: 20 },
  { id: 'pl-6', name: 'Ines Duarte-Lindqvist', country: 'Portugal', flag: '🇵🇹', bracelets: 1, rings: 0, earnings: 2_210_000, hue: 170 },
  { id: 'pl-7', name: 'Noah Whitfield', country: 'United States', flag: '🇺🇸', bracelets: 4, rings: 9, earnings: 11_900_000, hue: 0 },
  { id: 'pl-8', name: 'Arash Teymouri', country: 'Canada', flag: '🇨🇦', bracelets: 0, rings: 2, earnings: 690_000, hue: 50 },
  { id: 'pl-9', name: 'Lucía Ferrante', country: 'Argentina', flag: '🇦🇷', bracelets: 1, rings: 3, earnings: 2_840_000, hue: 190 },
];

const V = (v: Vod) => v;
export const vods: Vod[] = [
  // replays created from ended broadcasts
  V({ id: 'v-01', title: 'Main Event Day 1B — Full Replay', type: 'Full Replay', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'basic', durationSec: 21_600, views: 48_200, publishedAt: at(-20), playerIds: ['pl-1', 'pl-4', 'pl-7'], description: 'Six hours from the Day 1B feature table.', scheduleId: 'sc-01' }),
  V({ id: 'v-02', title: 'High Roller Day 2 — Full Replay', type: 'Full Replay', seriesId: 'ser-paradise', eventId: 'ev-p10', tier: 'premium', durationSec: 18_000, views: 21_900, publishedAt: at(-20), playerIds: ['pl-2', 'pl-7'], description: 'The bubble and the race to the final table.', scheduleId: 'sc-02' }),
  V({ id: 'v-03', title: 'Mystery Bounty Final Table — Full Replay', type: 'Full Replay', seriesId: 'ser-paradise', eventId: 'ev-p8', tier: 'basic', durationSec: 10_800, views: 9_300, publishedAt: at(-3.5), playerIds: ['pl-3', 'pl-5', 'pl-9'], description: 'Every mystery envelope opened at the final table.', scheduleId: 'sc-03' }),
  V({ id: 'v-04', title: 'PLO Final Table (Español) — Full Replay', type: 'Full Replay', seriesId: 'ser-paradise', eventId: 'ev-p11', tier: 'basic', durationSec: 10_800, views: 4_100, publishedAt: at(-2.5), playerIds: ['pl-3', 'pl-9'], description: 'Spanish-language commentary of the PLO final.', scheduleId: 'sc-04' }),
  V({ id: 'v-05', title: 'Paradise Daily — Day 1B Recap', type: 'Highlight', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'free', durationSec: 1_440, views: 61_000, publishedAt: at(-3.8), playerIds: ['pl-1', 'pl-6'], description: 'The day in 24 minutes.', scheduleId: 'sc-05' }),
  // highlights / clips / hands / interviews
  V({ id: 'v-06', title: 'Quads vs Full House on Day 1A', type: 'Hand', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'free', durationSec: 214, views: 132_000, publishedAt: at(-40), playerIds: ['pl-7', 'pl-5'], description: 'The cooler everyone is talking about.' }),
  V({ id: 'v-07', title: 'Kagami’s River Hero Call', type: 'Hand', seriesId: 'ser-paradise', eventId: 'ev-p10', tier: 'basic', durationSec: 186, views: 88_400, publishedAt: at(-19), playerIds: ['pl-2', 'pl-1'], description: 'Third pair, all the chips.' }),
  V({ id: 'v-08', title: 'High Roller Day 2 Highlights', type: 'Highlight', seriesId: 'ser-paradise', eventId: 'ev-p10', tier: 'free', durationSec: 912, views: 54_300, publishedAt: at(-18), playerIds: ['pl-2', 'pl-7', 'pl-4'], description: 'Best hands of the day.' }),
  V({ id: 'v-09', title: 'Bounty Envelope Reveal: $250K', type: 'Clip', seriesId: 'ser-paradise', eventId: 'ev-p8', tier: 'free', durationSec: 96, views: 201_000, publishedAt: at(-3), playerIds: ['pl-5'], description: 'The top mystery prize is found.' }),
  V({ id: 'v-10', title: 'Seo-yeon Han on Her Day 1A Chip Lead', type: 'Interview', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'free', durationSec: 340, views: 23_600, publishedAt: at(-30), playerIds: ['pl-4'], description: 'Post-day interview.' }),
  V({ id: 'v-11', title: 'Main Event Day 1A — Full Replay', type: 'Full Replay', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'premium', durationSec: 23_400, views: 39_800, publishedAt: at(-44), playerIds: ['pl-4', 'pl-7', 'pl-5'], description: 'Day 1A feature table.' }),
  V({ id: 'v-12', title: 'This Week in Paradise', type: 'Highlight', seriesId: 'ser-paradise', tier: 'free', durationSec: 1_800, views: 77_000, publishedAt: at(-48), playerIds: ['pl-1', 'pl-2', 'pl-7'], description: 'Weekly round-up show.' }),
  V({ id: 'v-13', title: 'Circuit LA Main Event — Final Table', type: 'Full Replay', seriesId: 'ser-la', eventId: 'ev-l10', tier: 'basic', durationSec: 25_200, views: 31_200, publishedAt: at(-24 * 34), playerIds: ['pl-3', 'pl-8'], description: 'Ring event final table.' }),
  V({ id: 'v-14', title: 'Circuit LA High Roller — Winning Hand', type: 'Hand', seriesId: 'ser-la', eventId: 'ev-l12', tier: 'free', durationSec: 150, views: 18_900, publishedAt: at(-24 * 33), playerIds: ['pl-8'], description: 'Ring-clinching hand.' }),
  V({ id: 'v-15', title: 'Las Vegas Main Event — Final Table', type: 'Full Replay', seriesId: 'ser-vegas', eventId: 'ev-v76', tier: 'premium', durationSec: 36_000, views: 410_000, publishedAt: at(-24 * 76), playerIds: ['pl-7', 'pl-1', 'pl-4', 'pl-6'], description: 'The biggest final table of the year.' }),
  V({ id: 'v-16', title: 'Players Championship — Heads-up', type: 'Clip', seriesId: 'ser-vegas', eventId: 'ev-v45', tier: 'basic', durationSec: 1_260, views: 96_000, publishedAt: at(-24 * 95), playerIds: ['pl-2', 'pl-7'], description: 'Mixed-game heads-up for the bracelet.' }),
  V({ id: 'v-17', title: 'Whitfield: “Four bracelets, one goal”', type: 'Interview', seriesId: 'ser-vegas', eventId: 'ev-v76', tier: 'free', durationSec: 420, views: 64_000, publishedAt: at(-24 * 75), playerIds: ['pl-7'], description: 'Champion interview.' }),
  V({ id: 'v-18', title: 'Las Vegas 2026 — Top 10 Hands', type: 'Highlight', seriesId: 'ser-vegas', tier: 'basic', durationSec: 1_380, views: 152_000, publishedAt: at(-24 * 70), playerIds: ['pl-1', 'pl-2', 'pl-3', 'pl-7'], description: 'Countdown of the summer’s best hands.' }),
  // shorts (9:16)
  V({ id: 'v-19', title: 'The fold of the year?', type: 'Shorts', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'free', durationSec: 42, views: 512_000, publishedAt: at(-6), playerIds: ['pl-5'], description: '' }),
  V({ id: 'v-20', title: 'Bounty envelope: $250K', type: 'Shorts', seriesId: 'ser-paradise', eventId: 'ev-p8', tier: 'free', durationSec: 31, views: 388_000, publishedAt: at(-3), playerIds: ['pl-5'], description: '' }),
  V({ id: 'v-21', title: 'Rail goes wild', type: 'Shorts', seriesId: 'ser-paradise', eventId: 'ev-p10', tier: 'free', durationSec: 27, views: 140_000, publishedAt: at(-18), playerIds: ['pl-2'], description: '' }),
  V({ id: 'v-22', title: 'Chip race in 30s', type: 'Shorts', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'free', durationSec: 30, views: 92_000, publishedAt: at(-22), playerIds: [], description: '' }),
  V({ id: 'v-23', title: 'Bracelet ceremony', type: 'Shorts', seriesId: 'ser-vegas', eventId: 'ev-v76', tier: 'free', durationSec: 45, views: 260_000, publishedAt: at(-24 * 76), playerIds: ['pl-7'], description: '' }),
  V({ id: 'v-24', title: 'Premium cam: hole cards only', type: 'Shorts', seriesId: 'ser-paradise', eventId: 'ev-p13', tier: 'premium', durationSec: 58, views: 33_000, publishedAt: at(-8), playerIds: ['pl-1'], description: '' }),
];

export const curations: Curation[] = [
  { id: 'cu-1', title: 'Main Event Replay', vodIds: ['v-01', 'v-11', 'v-05', 'v-06', 'v-10'] },
  { id: 'cu-2', title: 'This Week’s Highlights', vodIds: ['v-12', 'v-08', 'v-09', 'v-07', 'v-03'] },
  { id: 'cu-3', title: 'Relive Las Vegas 2026', vodIds: ['v-15', 'v-18', 'v-16', 'v-17'] },
];

export const banners: Banner[] = [
  { id: 'bn-1', title: 'Main Event Day 2 is LIVE', subtitle: '2026 WSOP Paradise · Feature Table', cta: 'Watch now', audiences: ['guest', 'free', 'basic', 'premium'], link: { name: 'live', scheduleId: 'sc-06' }, hue: 200 },
  { id: 'bn-2', title: 'Go Premium', subtitle: 'Every feature table, ad-free, 1080p+', cta: 'See plans', audiences: ['free'], link: { name: 'paywall' }, hue: 45 },
  { id: 'bn-3', title: 'Day 1B Full Replay', subtitle: 'Catch up before Day 3', cta: 'Watch replay', audiences: ['guest', 'free', 'basic', 'premium'], link: { name: 'vod', vodId: 'v-01' }, hue: 260 },
  { id: 'bn-4', title: 'Super Circuit Cyprus', subtitle: 'Coming soon · Merit Royal Diamond', cta: 'View schedule', audiences: ['guest', 'free', 'basic', 'premium'], link: { name: 'series', seriesId: 'ser-cyprus' }, hue: 290 },
];

export const stripBanners: StripBanner[] = [
  { id: 'st-guest', audience: 'guest', title: 'Create a free account to follow every table', cta: 'Log in', link: { name: 'tab', tab: 'my' } },
  { id: 'st-free', audience: 'free', title: 'Basic: feature tables in 1080p, fewer ads', cta: 'Upgrade', link: { name: 'paywall' } },
  { id: 'st-basic', audience: 'basic', title: 'Premium unlocks every final table, ad-free', cta: 'Go Premium', link: { name: 'paywall' } },
  { id: 'st-premium', audience: 'premium', title: 'Premium perk: hole-card cam on Main Event Day 3', cta: 'Set reminder', link: { name: 'tab', tab: 'schedule' } },
];

export const notices: Notice[] = [
  { id: 'nt-1', title: 'Main Event Day 2 stream starts 30 min earlier', date: at(-10) },
  { id: 'nt-2', title: 'New: Spanish commentary on Feature Table', date: at(-50) },
  { id: 'nt-3', title: 'Scheduled maintenance this Sunday 03:00–05:00 KST', date: at(-120) },
];

/** Continue-watching progress per signed-in member state (mock). */
export const continueWatching: { vodId: string; progress: number }[] = [
  { vodId: 'v-01', progress: 0.42 },
  { vodId: 'v-08', progress: 0.77 },
  { vodId: 'v-15', progress: 0.12 },
];

export const popularSearches = ['Main Event', 'Mystery Bounty', 'Seo-yeon Han', 'Final Table', 'Paradise'];

export const ALL_MEMBERS = ['guest', 'free', 'basic', 'premium'] as const;

const ALL = [...ALL_MEMBERS];
/** Home layouts (managed in CMS). Season: LIVE first. Off-season: VOD sections move up, LIVE NOW hidden. */
export const defaultSeasonLayout: HomeSection[] = [
  { id: 'banner', visible: true, audiences: ALL },
  { id: 'liveNow', visible: true, audiences: ALL },
  { id: 'todaySchedule', visible: true, audiences: ALL },
  { id: 'continue', visible: true, audiences: ['free', 'basic', 'premium'] },
  { id: 'tournaments', visible: true, audiences: ALL },
  { id: 'curation', visible: true, audiences: ALL },
  { id: 'plans', visible: true, audiences: ['guest', 'free', 'basic'] },
  { id: 'players', visible: true, audiences: ALL },
  { id: 'strip', visible: false, audiences: ALL },
  { id: 'notice', visible: false, audiences: ALL },
];

// Strip banner and notices start hidden to keep home calm; operators can turn them on in the CMS.
export const defaultOffSeasonLayout: HomeSection[] = [
  { id: 'banner', visible: true, audiences: ALL },
  { id: 'continue', visible: true, audiences: ['free', 'basic', 'premium'] },
  { id: 'curation', visible: true, audiences: ALL },
  { id: 'plans', visible: true, audiences: ['guest', 'free', 'basic'] },
  { id: 'todaySchedule', visible: true, audiences: ALL },
  { id: 'tournaments', visible: true, audiences: ALL },
  { id: 'players', visible: true, audiences: ALL },
  { id: 'liveNow', visible: false, audiences: ALL },
  { id: 'strip', visible: false, audiences: ALL },
  { id: 'notice', visible: false, audiences: ALL },
];

/** CMS dashboard extras. */
export const opsToday = {
  pushes: [
    { time: at(2.5), title: 'Ladies Championship FT starts in 30 min', target: '알림 신청자' },
    { time: at(3.5), title: 'Main Event Day 2 recap is live', target: '전체' },
  ],
  banners: [{ time: at(-6), title: 'Main Event Day 2 is LIVE (메인 배너)', target: '전체' }],
  popups: [{ time: at(1), title: 'Premium 7-day trial', target: '무료 회원' }],
  transcodeFailures: [{ vodId: 'v-04', title: 'PLO Final Table (Español) — 1080p 렌디션', reason: '오디오 트랙 불일치', at: at(-2.4) }],
};
