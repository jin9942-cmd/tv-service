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
    // Hall-wide shots only — frames showing operator branding are excluded.
    frames: [52, 64].map((sec) => ({ sec, src: `${MEDIA}mtl_s${sec}.jpg` })),
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

/**
 * Stills extracted from the CC footage (public/media), grouped by what they show:
 * broadcast = TV-style tournament tables · hands = card / chip close-ups · people = interviews and presenters.
 */
const POOLS = {
  broadcast: ["fold_110.jpg","fold_180.jpg","fold_260.jpg","fold_330.jpg","fold_40.jpg","fold_400.jpg","ft_s116.jpg","ft_s125.jpg","ft_s134.jpg","ft_s152.jpg","ft_s161.jpg","ft_s17.jpg","ft_s179.jpg","ft_s188.jpg","ft_s197.jpg","ft_s206.jpg","ft_s215.jpg","ft_s224.jpg","ft_s242.jpg","ft_s251.jpg","ft_s26.jpg","ft_s278.jpg","ft_s287.jpg","ft_s305.jpg","ft_s314.jpg","ft_s323.jpg","ft_s341.jpg","ft_s35.jpg","ft_s359.jpg","ft_s368.jpg","ft_s377.jpg","ft_s422.jpg","ft_s44.jpg","ft_s440.jpg","ft_s53.jpg","ft_s71.jpg","ft_s8.jpg","ft_s80.jpg","ft_s89.jpg","ft_s98.jpg","mtl_s52.jpg","mtl_s64.jpg","mtl_s82.jpg"],
  hands: ["deal_40.jpg","deal_s10.jpg","deal_s16.jpg","deal_s22.jpg","deal_s28.jpg","deal_s34.jpg","deal_s40.jpg","deal_s46.jpg"],
  people: ["int_s13.jpg","int_s23.jpg","int_s28.jpg","int_s33.jpg","int_s38.jpg","int_s48.jpg","int_s53.jpg","int_s63.jpg","int_s68.jpg","int_s73.jpg","int_s78.jpg","int_s8.jpg","int_s83.jpg","wpt_30.jpg"],
} as const;
export type StillPool = 'broadcast' | 'hands' | 'people';
// Walk each pool with a stride so neighbouring cards come from different scenes.
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
// The stride must share no factor with the pool size, or the walk would repeat a few stills.
const spread = (list: readonly string[]) => {
  const stride = [7, 5, 3, 11, 13].find((k) => gcd(k, list.length) === 1) ?? 1;
  return list.map((_, i) => MEDIA + list[(i * stride) % list.length]);
};
const ORDER: Record<StillPool, string[]> = {
  broadcast: spread(POOLS.broadcast),
  // Hand clips come from televised tables too; home-game close-ups only once those run out.
  hands: [...spread(POOLS.broadcast), ...spread(POOLS.hands)],
  people: spread(POOLS.people),
};
const EVERY = [...ORDER.broadcast, ...ORDER.people, ...spread(POOLS.hands)];

/** Any still, picked deterministically from a number (scrub previews: table shots only). */
export function frameFrom(n: number): string {
  return ORDER.broadcast[Math.abs(n) % ORDER.broadcast.length];
}

/**
 * Thumbnail for a piece of content. Each key (e.g. `day:lv-main-day2`, `hand:h03`) gets its own still the first time
 * it's asked for — the next unused one from its pool — so cards don't share an image until the stills run out
 * (~65); the same content keeps the same image everywhere (card, player poster, search, My List).
 */
const assigned = new Map<string, string>();
const used = new Set<string>();
export function thumbFor(key: string, pool: StillPool = key.startsWith('hand:') ? 'hands' : 'broadcast'): string {
  const hit = assigned.get(key);
  if (hit) return hit;
  const src = ORDER[pool].find((x) => !used.has(x)) ?? EVERY.find((x) => !used.has(x)) ?? ORDER[pool][assigned.size % ORDER[pool].length];
  assigned.set(key, src);
  used.add(src);
  return src;
}

/** Video for a table feed (feature table = final-table footage), and where in the clip to start. */
export function tableVideo(tableIndex: number): { url: string; start: number; credit: string } {
  // Table feeds play the final-table footage at different points (the Montreal video shows operator branding).
  const f = FOOTAGE.ft;
  return { url: f.url, start: [110, 200, 290, 380][tableIndex % 4], credit: f.credit };
}
