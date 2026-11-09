// v8 — Collections: named sets the NAS archive actually holds (no tagging, no picks by hand). A recurring event
// collects its final table from every year the archive has it; Best of 2003 WSOP is the archive's own programs.
import { archiveEvents, broadcastsOf, type ArchiveRef } from './archive';
import type { Video } from './catalog';
import { bestOf2003 } from './library';

/** The broadcast to open for an event: its last final-table day, else its last day. */
export function finalOf(ref: ArchiveRef): Video | undefined {
  const vs = broadcastsOf(ref);
  const days = ref.event.days;
  let i = -1;
  days.forEach((d, k) => {
    if (/final/i.test(d.label)) i = k;
  });
  return vs[i >= 0 ? i : vs.length - 1];
}
const lasVegas = (test: (r: ArchiveRef) => boolean) =>
  archiveEvents()
    .filter((r) => r.series.key === 'lv' && !r.year.classic && test(r))
    .sort((a, b) => b.year.year - a.year.year);

export interface Collection {
  id: string;
  title: string;
  blurb: string;
  videos: () => Video[];
  /** Years the collection covers (for the tile). */
  years: () => number[];
}
const fromEvents = (test: (r: ArchiveRef) => boolean) => ({
  videos: () => lasVegas(test).map(finalOf).filter((v): v is Video => !!v),
  years: () => [...new Set(lasVegas(test).map((r) => r.year.year))],
});
export const COLLECTIONS: Collection[] = [
  { id: 'best-of-2003', title: 'Best of 2003 WSOP', blurb: 'The Best of 2003 WSOP programs, from Moneymaker’s final table to the all-ins and bluffs of that year', videos: bestOf2003, years: () => [2003] },
  { id: 'super-high-roller', title: '$250,000 Super High Roller', blurb: 'Every Super High Roller in the archive: its final table, or its last televised day', ...fromEvents((r) => r.event.buyIn === 250_000) },
  { id: 'poker-players-championship', title: '$50,000 Poker Players Championship', blurb: 'Every Poker Players Championship in the archive: its final table, or its last televised day', ...fromEvents((r) => /poker players championship/i.test(r.event.name)) },
  { id: 'heads-up-championship', title: '$25,000 Heads-Up Championship', blurb: 'Every Heads-Up Championship in the archive: its final, or its last televised day', ...fromEvents((r) => /heads.?up/i.test(r.event.name) && r.event.buyIn === 25_000) },
  { id: 'millionaire-maker', title: 'Millionaire Maker', blurb: 'Every Millionaire Maker in the archive: its final table, or its last televised day', ...fromEvents((r) => /millionaire maker/i.test(r.event.name)) },
  { id: 'colossus', title: 'Colossus', blurb: 'Every Colossus in the archive: its final table, or its last televised day', ...fromEvents((r) => /colossus/i.test(r.event.name)) },
  { id: 'tournament-of-champions', title: 'Tournament of Champions', blurb: 'The Tournament of Champions broadcasts in the archive', ...fromEvents((r) => /tournament of champions/i.test(r.event.name)) },
];
export const collectionById = (id: string) => COLLECTIONS.find((c) => c.id === id);
