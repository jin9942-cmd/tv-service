// The demo's series: a day of the 2025 WSOP Las Vegas series rebuilt from its broadcasts on the NAS. The demo stands
// on Jun 17, 2025 (series day 22), while the Event #46 final table is on air. The eight televised events, their dates
// and results are from the 2025 record (PokerNews event pages and series schedule; Wikipedia "2025 World Series of
// Poker"). Footage: 60 s cuts of each event's own broadcast (public/s25), see archive.ts S25.
import { s25Clip, s25Still } from './archive';

export const SERIES = {
  name: '2025 WSOP',
  place: 'Las Vegas · Horseshoe and Paris Las Vegas',
  start: '2025-05-27',
  end: '2025-07-16',
  events: 100,
  /** The demo moment. */
  today: '2025-06-17',
};
const dayMs = 86_400_000;
export const seriesDay = (iso: string) => Math.round((Date.parse(iso) - Date.parse(SERIES.start)) / dayMs) + 1;
export const SERIES_DAYS = seriesDay(SERIES.end);

export type CastState = 'replay' | 'live' | 'upcoming';
export interface Cast {
  /** Archive event id (its page and broadcasts). */
  id: string;
  number: number;
  name: string;
  buyIn: string;
  /** The televised day (the final table, or the Main Event's run of days). */
  date: string;
  dateTo?: string;
  what: string;
  state: CastState;
  /** Footage of its own (public/s25). */
  key?: string;
  /** Result, from the record (finished events only). */
  winner?: { name: string; cc: string; prize: string };
  entries: number;
}
export const CASTS: Cast[] = [
  { id: '2025-lv-3', number: 3, name: '$5,000 8-Handed No-Limit Hold’em', buyIn: '$5,000', date: '2025-05-31', what: 'Final table', state: 'replay', key: 'e3', winner: { name: 'Antonio Galiana', cc: 'ES', prize: '$582,008' }, entries: 693 },
  { id: '2025-lv-7', number: 7, name: '$25,000 Heads-Up Championship', buyIn: '$25,000', date: '2025-06-01', what: 'Final', state: 'replay', key: 'e7', winner: { name: 'Artur Martirosian', cc: 'RU', prize: '$500,000' }, entries: 64 },
  { id: '2025-lv-19', number: 19, name: '$500 Colossus', buyIn: '$500', date: '2025-06-10', what: 'Final table', state: 'replay', key: 'e19', winner: { name: 'Courtenay Williams', cc: 'US', prize: '$542,540' }, entries: 16_301 },
  { id: '2025-lv-38', number: 38, name: '$100,000 No-Limit Hold’em High Roller', buyIn: '$100,000', date: '2025-06-13', what: 'Final table', state: 'replay', key: 'e38', winner: { name: 'João Vieira', cc: 'PT', prize: '$2,649,158' }, entries: 103 },
  { id: '2025-lv-46', number: 46, name: '$250,000 Super High Roller', buyIn: '$250,000', date: '2025-06-17', what: 'Final table', state: 'live', key: 'e46', entries: 63 },
  { id: '2025-lv-53', number: 53, name: '$1,500 Millionaire Maker', buyIn: '$1,500', date: '2025-06-25', what: 'Final table', state: 'upcoming', entries: 11_996 },
  { id: '2025-lv-66', number: 66, name: '$50,000 Poker Players Championship', buyIn: '$50,000', date: '2025-06-28', what: 'Final table', state: 'upcoming', entries: 107 },
  { id: '2025-lv-main', number: 81, name: '$10,000 Main Event', buyIn: '$10,000', date: '2025-07-02', dateTo: '2025-07-16', what: 'Day 1A to the final table', state: 'upcoming', entries: 9_735 },
];
export const LIVE = CASTS.find((c) => c.state === 'live')!;
export const NEXT = CASTS.find((c) => c.state === 'upcoming')!;
export const castStill = (c: Cast) => (c.key ? s25Still(c.key) : undefined);
export const castClip = (c: Cast) => (c.key ? s25Clip(c.key) : undefined);
/** The broadcast to open: the event's televised day in the archive. */
export const castVideoId = (c: Cast) => `arc.${c.id}.${c.id === '2025-lv-7' || c.id === '2025-lv-38' || c.id === '2025-lv-46' ? 1 : 0}`;
export const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
