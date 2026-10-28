// Shows — the recurring programmes of the WSOP TV channels (NBA TV-style "Shows" section).
// Each show is a group of slots in the channel schedule (data/channels), so air times always match the guide.
import { programs, type Program, type ProgramKind } from './channels';

export interface Show {
  id: string;
  title: string;
  /** One line under the title. */
  tagline: string;
  description: string;
  kind: ProgramKind;
  /** Which schedule slots belong to the show. */
  match: (p: Program) => boolean;
  /** Still pool for the poster. */
  art: 'broadcast' | 'people' | 'hands';
}

export const shows: Show[] = [
  {
    id: 'wsop-live',
    title: 'WSOP Live',
    tagline: 'Final tables, live from Las Vegas',
    description: 'Live coverage from the feature table, with hole cards, chip counts and commentary. The Main Event airs on WSOP TV 1 in English and WSOP Español in Spanish; high rollers and side events on WSOP TV 2.',
    kind: 'live',
    match: (p) => p.kind === 'live',
    art: 'broadcast',
  },
  {
    id: 'the-rail',
    title: 'The Rail',
    tagline: 'The studio show',
    description: 'Previews and recaps from the WSOP TV studio: stacks, storylines and picks before every final table, and the results from every table after.',
    kind: 'studio',
    match: (p) => p.title.startsWith('The Rail'),
    art: 'people',
  },
  {
    id: 'hand-of-the-day',
    title: 'Hand of the Day',
    tagline: 'The biggest pot of the last 24 hours',
    description: 'One hand, told start to finish — the action on every street, the reads and the decision that won the pot.',
    kind: 'highlights',
    match: (p) => p.title === 'Hand of the Day',
    art: 'broadcast',
  },
  {
    id: 'bracelet-moments',
    title: 'Bracelet Moments',
    tagline: 'Every winning hand of the week',
    description: 'The final hand of every bracelet event, from the last all-in to the trophy presentation.',
    kind: 'highlights',
    match: (p) => p.title === 'Bracelet Moments',
    art: 'broadcast',
  },
  {
    id: 'final-table-encores',
    title: 'Final Table Encores',
    tagline: 'Full days, edited for TV',
    description: 'The best broadcast days of the series, cut down to the hands that mattered.',
    kind: 'replay',
    match: (p) => p.kind === 'replay',
    art: 'broadcast',
  },
  {
    id: 'high-roller-hands',
    title: 'High Roller Hands',
    tagline: 'Six-figure pots, cut down to the action',
    description: 'The biggest pots from the high roller tables, with the play-by-play on every street.',
    kind: 'highlights',
    match: (p) => p.title === 'High Roller Hands',
    art: 'broadcast',
  },
  {
    id: 'wsop-classics',
    title: 'WSOP Classics',
    tagline: 'Legendary final tables, 24/7',
    description: 'Championship final tables from past series, edited for TV. Free on the WSOP Classics channel.',
    kind: 'classic',
    match: (p) => p.kind === 'classic',
    art: 'broadcast',
  },
  {
    id: 'greatest-bluffs',
    title: 'Greatest Bluffs',
    tagline: 'Ten of the boldest bluffs ever filmed',
    description: 'The bluffs people still talk about — the spots, the bet sizes and the folds that followed.',
    kind: 'highlights',
    match: (p) => p.title === 'Greatest Bluffs',
    art: 'broadcast',
  },
  {
    id: 'bad-beat-hall-of-fame',
    title: 'Bad Beat Hall of Fame',
    tagline: 'The hands that got away',
    description: 'One-outers, runner-runners and the stories behind them.',
    kind: 'highlights',
    match: (p) => p.title === 'Bad Beat Hall of Fame',
    art: 'broadcast',
  },
  {
    id: 'wsop-en-espanol',
    title: 'WSOP en Español',
    tagline: 'La Mesa y lo mejor del día',
    description: 'El programa de estudio y las mejores manos del día, con comentarios en español en WSOP Español.',
    kind: 'studio',
    match: (p) => p.channelId === 'wsop-es' && (p.kind === 'studio' || p.title === 'Lo mejor del día'),
    art: 'people',
  },
];

export const showById = (id: string) => shows.find((s) => s.id === id);
/** Every slot of a show, in time order. */
export const airingsOf = (s: Show) => programs.filter(s.match).sort((a, b) => a.start - b.start);
/** The show a schedule slot belongs to (if any). */
export const showOf = (p: Program) => shows.find((s) => s.match(p));

/** Who's on the call (fictional commentary teams), as poker schedules list it. */
export function commentaryFor(p: Program): string | null {
  if (p.channelId === 'wsop-es') return p.kind === 'live' || p.kind === 'replay' ? 'Comentarios: Marta Ríos y Pablo Vega' : p.kind === 'studio' ? 'Presenta: Marta Ríos' : null;
  if (p.kind === 'live' || p.kind === 'replay') return `Commentary: ${p.channelId === 'wsop2' ? 'Sam Okoye & Jules Laurent' : 'Ava Marsh & Leo Grant'}`;
  if (p.kind === 'studio') return 'Host: Ava Marsh';
  if (p.kind === 'classic') return 'Original broadcast commentary';
  return null;
}
