// Broadcast status helpers shared by cards, the player and the Tables panel.
import type { StreamStatus, TableFeed } from '../data/types';

/** Playing now (real time or delayed). */
export const isOnAir = (s: StreamStatus) => s === 'live' || s === 'delayed';
/** Scheduled for now: on air, starting late or interrupted. */
export const isBroadcasting = (s: StreamStatus) => isOnAir(s) || s === 'late' || s === 'interrupted';

/** Delay of one table while its day is delayed (feature tables usually 30 min, outer tables 15). */
export const tableDelay = (t: TableFeed, day: StreamStatus) => (day === 'delayed' ? (t.delayMin ?? 30) : 0);

/** Status of a single table: the day's status, unless the table has its own state while the day is on air. */
export const tableStatus = (t: TableFeed, day: StreamStatus): StreamStatus => {
  if (!isOnAir(day)) return day;
  if (t.state) return t.state;
  return tableDelay(t, day) > 0 ? 'delayed' : 'live';
};

export const shortTableName = (name: string) => name.replace('Feature Table', 'Feature').replace('Outer Table ', 'Outer ');
