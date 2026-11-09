// The latest season: the 2025 WSOP Las Vegas series (May 27 – Jul 16, 2025), shown as what it is today — replays.
// No live state: live coverage starts with the 2027 series. The televised final tables, their dates and results are
// from the 2025 record (PokerNews event pages and series schedule; Wikipedia "2025 World Series of Poker").
// #53 Millionaire Maker is left out: the WSOP awarded no bracelet and named no official winner. Footage: 60 s cuts of
// each event's own broadcast (public/s25), see archive.ts S25.
import { S25, s25Clip, s25Still } from './archive';

export const SERIES = {
  name: '2025 WSOP',
  place: 'Las Vegas · Horseshoe and Paris Las Vegas',
  start: '2025-05-27',
  end: '2025-07-16',
  events: 100,
};

export interface Cast {
  /** Archive event id (its page and broadcasts). */
  id: string;
  number: number;
  name: string;
  short: string;
  buyIn: string;
  /** The day the bracelet was won. */
  date: string;
  what: string;
  winner: { name: string; cc: string; prize: string };
  entries: number;
}
/** Newest first. */
export const CASTS: Cast[] = [
  { id: '2025-lv-main', number: 81, name: '$10,000 Main Event', short: 'Main Event', buyIn: '$10,000', date: '2025-07-16', what: 'Final table', winner: { name: 'Michael Mizrachi', cc: 'US', prize: '$10,000,000' }, entries: 9_735 },
  { id: '2025-lv-66', number: 66, name: '$50,000 Poker Players Championship', short: '$50K Poker Players Championship', buyIn: '$50,000', date: '2025-06-28', what: 'Final table', winner: { name: 'Michael Mizrachi', cc: 'US', prize: '$1,331,322' }, entries: 107 },
  { id: '2025-lv-46', number: 46, name: '$250,000 Super High Roller', short: '$250K Super High Roller', buyIn: '$250,000', date: '2025-06-17', what: 'Final table', winner: { name: 'Seth Davies', cc: 'US', prize: '$4,752,551' }, entries: 63 },
  { id: '2025-lv-38', number: 38, name: '$100,000 No-Limit Hold’em High Roller', short: '$100K High Roller', buyIn: '$100,000', date: '2025-06-13', what: 'Final table', winner: { name: 'João Vieira', cc: 'PT', prize: '$2,649,158' }, entries: 103 },
  { id: '2025-lv-19', number: 19, name: '$500 Colossus', short: '$500 Colossus', buyIn: '$500', date: '2025-06-10', what: 'Final table', winner: { name: 'Courtenay Williams', cc: 'US', prize: '$542,540' }, entries: 16_301 },
  { id: '2025-lv-7', number: 7, name: '$25,000 Heads-Up Championship', short: '$25K Heads-Up Championship', buyIn: '$25,000', date: '2025-06-01', what: 'Final', winner: { name: 'Artur Martirosian', cc: 'RU', prize: '$500,000' }, entries: 64 },
  { id: '2025-lv-3', number: 3, name: '$5,000 8-Handed No-Limit Hold’em', short: '$5K 8-Handed No-Limit Hold’em', buyIn: '$5,000', date: '2025-05-31', what: 'Final table', winner: { name: 'Antonio Galiana', cc: 'ES', prize: '$582,008' }, entries: 693 },
];
const key = (c: Cast) => S25[c.id]?.key;
export const castStill = (c: Cast) => (key(c) ? s25Still(key(c)!) : undefined);
export const castHero = (c: Cast) => (key(c) ? `${import.meta.env.BASE_URL}s25/${key(c)}-hero.jpg` : undefined);
export const castClip = (c: Cast) => (key(c) ? s25Clip(key(c)!) : undefined);
/** The broadcast to open: the event's final-table day in the archive. */
export const castVideoId = (c: Cast) => `arc.${c.id}.${S25[c.id]?.day ?? 0}`;
export const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
