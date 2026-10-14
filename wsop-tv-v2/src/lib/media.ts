// Real poker footage reused from the v1 demo: Creative Commons videos streamed from Wikimedia Commons, plus stills
// extracted from them (public/media, see CREDITS.md). Not WSOP footage — the people shown are unrelated to the fictional data.
const WM = 'https://upload.wikimedia.org/wikipedia/commons/';
const MEDIA = `${import.meta.env.BASE_URL}media/`;

export interface Footage {
  id: string;
  url: string;
  credit: string;
  /** Still frames (seconds into the video → image). */
  frames: { sec: number; src: string }[];
}

export const FOOTAGE: Record<'ft' | 'mtl' | 'int' | 'deal', Footage> = {
  ft: {
    id: 'ft',
    url: WM + 'transcoded/f/fd/Incredibly_Unbelievable_Fold_on_the_World_Poker_Tour.webm/Incredibly_Unbelievable_Fold_on_the_World_Poker_Tour.webm.480p.vp9.webm',
    credit: 'World Poker Tour · CC BY 3.0 · via Wikimedia Commons',
    frames: [40, 110, 180, 260, 330, 400].map((sec) => ({ sec, src: `${MEDIA}fold_${sec}.jpg` })),
  },
  mtl: {
    id: 'mtl',
    url: WM + 'transcoded/d/d4/Lynn_Gilmartin_Previews_WPT_Montreal_at_Playground_Poker_Club.webm/Lynn_Gilmartin_Previews_WPT_Montreal_at_Playground_Poker_Club.webm.480p.vp9.webm',
    credit: 'World Poker Tour · CC BY 3.0 · via Wikimedia Commons',
    frames: [25, 70].map((sec) => ({ sec, src: `${MEDIA}mtl_${sec}.jpg` })),
  },
  int: {
    id: 'int',
    url: WM + 'transcoded/8/88/World_Poker_Tour_asks_players_which_country_is_the_best.webm/World_Poker_Tour_asks_players_which_country_is_the_best.webm.480p.vp9.webm',
    credit: 'World Poker Tour · CC BY 3.0 · via Wikimedia Commons',
    frames: [{ sec: 30, src: `${MEDIA}wpt_30.jpg` }],
  },
  deal: {
    id: 'deal',
    url: WM + '9/99/Texas_Hold_%27em.webm',
    credit: 'BrewCrewCountry93 · CC BY-SA 4.0 · via Wikimedia Commons',
    frames: [{ sec: 40, src: `${MEDIA}deal_40.jpg` }],
  },
};

export const HERO_POSTER = `${MEDIA}hero_ft.jpg`;

/** Still for a table feed: the feature table uses the final-table footage, outer tables rotate through the rest. */
export function tableFrame(tableIndex: number, seed = 0): string {
  if (tableIndex === 0) return FOOTAGE.ft.frames[(seed + 1) % FOOTAGE.ft.frames.length].src;
  const pool = [FOOTAGE.mtl.frames[0], FOOTAGE.ft.frames[3], FOOTAGE.mtl.frames[1], FOOTAGE.int.frames[0], FOOTAGE.deal.frames[0]];
  return pool[(tableIndex - 1 + seed) % pool.length].src;
}

/** Any still, picked deterministically from a number (for upcoming / replay cards). */
export function frameFrom(n: number): string {
  const all = [...FOOTAGE.ft.frames, ...FOOTAGE.mtl.frames, ...FOOTAGE.int.frames, ...FOOTAGE.deal.frames];
  return all[Math.abs(n) % all.length].src;
}

/** Video for a table feed (feature table = final-table footage), and where in the clip to start. */
export function tableVideo(tableIndex: number): { url: string; start: number; credit: string } {
  const f = [FOOTAGE.ft, FOOTAGE.mtl, FOOTAGE.int, FOOTAGE.deal][tableIndex % 4];
  return { url: f.url, start: tableIndex === 0 ? 110 : 20, credit: f.credit };
}
