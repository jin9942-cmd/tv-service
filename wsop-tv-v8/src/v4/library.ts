// v8 — what Home shows from the archive, taken only from the NAS archive's file list (the folders the video list
// sheet is made from; src/data/library.json, built by a script): the 2024 WSOP Paradise Super Main Event hand clips
// (players and cards as named in each file) and the Best of 2003 WSOP programs. Lengths are the files' own;
// pictures are frames of each file. Playback uses the demo's archive clip, like the rest of the archive.
import data from '../data/library.json';
import { FOOTAGE } from '../lib/media';
import type { Video } from './catalog';

export interface HandClip {
  id: string;
  day: string;
  n: number;
  players: { name: string; cards: string }[];
  sec: number;
  file: string;
}
export interface Program {
  id: string;
  title: string;
  sec: number;
  file: string;
}
export const PARADISE_2024_HANDS = data.paradise2024Hands as HandClip[];
export const BEST_OF_2003 = data.best2003 as Program[];
export const PARADISE_2024_DAYS = [...new Set(PARADISE_2024_HANDS.map((h) => h.day))];

const art = (id: string) => `${import.meta.env.BASE_URL}library/${id}.jpg`;
export const handTitle = (h: HandClip) => h.players.map((p) => [p.name, p.cards].filter(Boolean).join(' ')).join(' vs ');

function handVideo(h: HandClip): Video {
  return {
    id: `lib.${h.id}`,
    kind: 'clip',
    title: handTitle(h),
    subtitle: `2024 WSOP Paradise Super Main Event · ${h.day} · Hand ${h.n}`,
    description: `Hand ${h.n} of ${h.day}, 2024 WSOP Paradise Super Main Event.`,
    thumb: art(h.id),
    thumbPos: '50% 50%',
    media: { url: FOOTAGE.ft.url, start: 40 + ((h.n * 37) % 360) },
    durationSec: h.sec,
    status: 'vod',
    tags: [
      { slug: 'year-2024', label: '2024' },
      { slug: 'arc-series-pa', label: 'WSOP Paradise' },
    ],
    about: [
      ['Event', '2024 WSOP Paradise Super Main Event'],
      ['Day', h.day],
      ['Hand', String(h.n)],
      ['Players', h.players.map((p) => p.name).join(', ')],
    ],
    views: 0,
  };
}
function programVideo(p: Program): Video {
  return {
    id: `lib.${p.id}`,
    kind: 'classic',
    title: p.title,
    subtitle: 'Best of 2003 WSOP',
    description: `${p.title}, from the Best of 2003 WSOP programs.`,
    thumb: art(p.id),
    thumbPos: '50% 50%',
    media: { url: FOOTAGE.ft.url, start: 40 },
    durationSec: p.sec,
    status: 'vod',
    tags: [{ slug: 'year-2003', label: '2003' }],
    about: [
      ['Year', '2003'],
      ['Program', p.title],
    ],
    views: 0,
  };
}
export const paradiseHands = (day?: string) => PARADISE_2024_HANDS.filter((h) => !day || h.day === day).map(handVideo);
export const bestOf2003 = () => BEST_OF_2003.map(programVideo);

/** `lib.<id>` → the video. */
export function libraryVideo(id: string): Video | undefined {
  const k = id.slice(4);
  const h = PARADISE_2024_HANDS.find((x) => x.id === k);
  if (h) return handVideo(h);
  const p = BEST_OF_2003.find((x) => x.id === k);
  return p ? programVideo(p) : undefined;
}
