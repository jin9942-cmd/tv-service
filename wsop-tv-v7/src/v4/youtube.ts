// Videos from the official WSOP YouTube channel (youtube.com/@WSOP, "World Series of Poker"), assuming WSOP TV can
// carry them. Every id was checked with YouTube's oEmbed (author "World Series of Poker") and every title is the
// channel's own, as published. Only uploads from before the demo moment (May 15, 2026) are used.
// Cards show YouTube's own thumbnail; playback uses the demo's archive clip, like the rest of the demo.
import { FOOTAGE } from '../lib/media';
import type { Video } from './catalog';
import { archiveEvent, broadcastsOf, highlightsOf } from './archive';

type Group = 'mizrachi' | 'hands' | 'iconic' | 'event' | 'season26' | 'y2026';
interface Yt {
  id: string;
  title: string;
  /** Upload date (YYYY-MM-DD), used only to order a row; the event clips' dates are approximate (their series' days). */
  date: string;
  group: Group;
  /** For event videos: the Browse row it belongs to (`<series>:<event number | main>`). */
  event?: string;
}

const Y = (id: string, title: string, date: string, group: Group, event?: string): Yt => ({ id, title, date, group, event });

const LIST: Yt[] = [
  // Michael Mizrachi's 2025
  Y('R4TmmJVeeWI', "Relive Michael Mizrachi's Incredible 2025 WSOP Main Event Story | #wsop", '2025-07-19', 'mizrachi', 'lv:main'),
  // The craziest hands
  Y('qLrlxa2XVks', 'ONCE in a LIFETIME Poker Hand 🤯', '2025-06-02', 'hands'),
  Y('Aot70Dr7Epw', 'This is INSANE 🤯 #wsop2025', '2025-07-18', 'hands'),
  Y('7E9hNeN2rw4', 'Priceless Reaction When It Hits', '2025-06-17', 'hands'),
  Y('edqRziQ0n-0', 'TWO MONSTER HANDS! 🔥 #QUADS #POKER', '2025-04-28', 'hands'),
  Y('Ilquv-CkjaU', 'FULL HOUSE BUT?! 🤮 #cooler #extreme', '2025-04-02', 'hands'),
  Y('Dni8N8820l4', "WSOP 2024's BIGGEST Poker Bluff!", '2024-10-24', 'hands'),
  Y('1Y4waMzoPak', 'The CRAZIEST Main Event poker hand of 2024... #shorts #poker', '2024-07-17', 'hands'),
  Y('BWxyxC5D9lI', 'You Wait ALL DAY for THIS Crazy Poker Hand?', '2024-10-07', 'hands'),
  Y('IATwKU2_I00', 'STRAIGHT FLUSH destroys FULL HOUSE! 🤮 WSOP Main Event', '2023-10-11', 'hands'),
  Y('alACbasLwdw', 'The CRAZIEST Poker FOLD of all time! 🤯', '2023-12-10', 'hands'),
  Y('sA--RqkdzPI', "Horrific Bad Beats We'll Never Forget! 🫢", '2023-06-19', 'hands'),
  Y('mpUDWFyLd5E', 'Trigger Pulled & Fold Engaged! Best Bluffs of the WSOP', '2023-08-19', 'hands'),
  // Iconic final tables and moments
  Y('SajAvmPg7x8', 'Moneymaker Heads-Up 🆚 Doyle Brunson', '2023-09-04', 'iconic'),
  Y('2SqDbxxXFdA', 'Witness the Exact Moment Stu Ungar Became a POKER ICON!', '2024-10-13', 'iconic'),
  Y('hztBTtkdfG8', 'Thorson EXPLODES On Amir Vahedi in 2003 Main Event!', '2023-08-03', 'iconic'),
  Y('zYD4MxoQb2Q', 'Youngest Player To Ever Win It!', '2023-09-05', 'iconic'),
  Y('70vL_M-P3jg', 'Craziest Main Event Final Hand EVER?!', '2023-09-08', 'iconic'),
  Y('LefBuO2ZxOk', 'POCKET ACES Cracked To Win WSOP Main Event! 😱', '2023-09-13', 'iconic'),
  Y('Mljk7nC-gb4', 'He WON the WSOP Main Event with THIS TERRIBLE HAND!', '2024-09-24', 'iconic'),
  Y('jHYp0d9HKVE', '2023 WSOP Champion WINS $12 Million! #wsop', '2023-07-17', 'iconic'),
  Y('VTIgwupawxE', 'The MOST PAINFUL Way To Lose The WSOP Main Event Final Table', '2022-08-18', 'iconic'),
  Y('XSFTEtyWjvQ', 'Doyle Brunson TAKES OUT TWO ALL-INs at the same time...', '2023-11-14', 'iconic'),
  // The 2025 season, by event (Browse rows)
  Y('RbWnu_pEG40', 'First Woman in 3 Decades to Reach the WSOP Main Event Final Table: Leo Margets |  #wsop', '2025-07-15', 'event', 'lv:main'),
  Y('_OvwB1VM2xk', 'HIGHLIGHTS | $1,000 Mystery Millions Final Table | #wsop', '2025-06-01', 'event', 'lv:1'),
  Y('J3qgS5pfKqo', 'HIGHLIGHTS | $250K Super High Roller Final Table | #wsop', '2025-06-20', 'event', 'lv:46'),
  Y('BcvYT-AZSDA', '$4,752,551 for Seth Davies – $250K Super High Roller | #WinnersCircle', '2025-06-20', 'event', 'lv:46'),
  Y('iqowrfWMTU4', 'Right After the Win: Seth Davies #wsop2025', '2025-06-20', 'event', 'lv:46'),
  Y('GrjIb3rTyzo', 'Good or Bad for Poker? | Martin Kabrhel in the 2025 WSOP $250K Super High Roller #wsop', '2025-06-20', 'event', 'lv:46'),
  Y('yC8ikcDSXd0', '$1,968,927 for Jason Koon – $50K High Roller WSOP 2025 | #WinnersCircle', '2025-06-14', 'event', 'lv:32'),
  Y('sUQ2ryliFLg', '$2,649,158 for Joao Vieira – $100K High Roller WSOP 2025 | #WinnersCircle', '2025-06-18', 'event', 'lv:38'),
  Y('b0Is_TGWECo', 'Phil Ivey Chasing His 12th Bracelet | 2025 WSOP $25K PLO High Roller #wsop', '2025-06-24', 'event', 'lv:51'),
  Y('lL05Fuic7xs', 'HIGHLIGHTS | $50K PLO High Roller Final Table | #wsop', '2025-06-27', 'event', 'lv:57'),
  Y('nPl4XNf9VuY', '$184,094 for Shiina Okamoto – $1K Ladies Event WSOP 2025 | #WinnersCircle', '2025-07-01', 'event', 'lv:70'),
  Y('V0G4EDKNj_U', 'Back-to-Back Champion. Is She the Best Female Player? | 2025 WSOP Ladies Championship #wsop', '2025-07-01', 'event', 'lv:70'),
  Y('lNLUdaH9g3c', 'HIGHLIGHTS | WSOP Paradise Super Main Event | Final Table | WSOP Paradise 2025 #wsop', '2025-12-18', 'event', 'pa:main'),
  Y('wpbjVoZ0ex8', 'HIGHLIGHTS | WSOP Paradise Super Main Event | Day 4 | WSOP Paradise 2025 #wsop', '2025-12-17', 'event', 'pa:main'),
  Y('qvx2zuZ3Pvw', 'HIGHLIGHTS | WSOP Paradise Super Main Event | Day 3 | WSOP Paradise 2025 #wsop', '2025-12-16', 'event', 'pa:main'),
  Y('IeKh7Xg7S1U', 'HIGHLIGHTS | WSOP Paradise Super Main Event | Day 2B | WSOP Paradise 2025 #wsop', '2025-12-15', 'event', 'pa:main'),
  Y('CW0UTUQCB8k', '$25K Super Main Event Champion #Bahamas #Paradise', '2025-12-18', 'event', 'pa:main'),
  Y('6TnQxvLRdRw', '🥇€1,140,000 for 1st🏆€10,350 WSOPE MAIN EVENT NLH European Championship - Final Table 👑🎙️Luka Bojovic', '2025-10-08', 'event', 'eu:main'),
  Y('5VhUDMsnnA4', '🏆 WSOPE NLH Colossus - Final Day [BRACELET EVENT #7] live from King\'s 👑 #wsop #poker', '2025-09-28', 'event', 'eu:7'),
  Y('KAQtghf5o38', '$5M GTD | WSOP Super Circuit Cyprus Main Event - Final Day', '2025-10-21', 'event', 'circuit:main'),
  // The 2026 World Series of Poker as the Schedule shows it (Jul 14, 2026): the channel's uploads up to that day. Only
  // the Schedule uses these (the rest of the demo is set on May 15, 2026).
  Y('XjKaiw5oAY0', 'The BIGGEST POT In The 2026 MAIN EVENT', '2026-07-13', 'season26'),
  Y('CeVpt52Ao2Y', 'Michael Mizrachi’s Day 5 Was Pure Chaos', '2026-07-11', 'season26'),
  Y('y5PZt0XW-H8', 'The Sickest Bluff Of The Main Event', '2026-07-10', 'season26'),
  Y('HwEHTLyTBE4', "The Most ABSURD Main Event Hand We've Seen", '2026-07-10', 'season26'),
  Y('IMZVcSsG5PI', "Michael Mizrachi's Bracelet #9 Run | $10,000 PLO Championship Final Table", '2026-06-29', 'season26'),
  Y('deAsBMKAaFk', '$50,000 PPC - Final Table | World Series of Poker', '2026-06-25', 'season26'),
  // The 2026 season in Browse (WSOP Europe in Prague, the World Series of Poker, Super Circuit Canada): the channel's
  // broadcasts and highlights of each series, with their upload dates.
  Y('hbBsq81e8d0', "€10,000,000 GTD | WSOP Europe Main Event - Day 1A", '2026-04-03', 'y2026'),
  Y('EFrXwz3WX0I', "€10,000,000 GTD | WSOP Europe Main Event - Day 1B", '2026-04-04', 'y2026'),
  Y('pp9pA3dQWIk', "€10,000,000 GTD | WSOP Europe Main Event - Day 1C", '2026-04-05', 'y2026'),
  Y('guQ6R799HWk', "€10,000,000 GTD | WSOP Europe Main Event - Day 2", '2026-04-06', 'y2026'),
  Y('hGQfNNau0AI', "€10,000,000 GTD | WSOP Europe Main Event - Day 3", '2026-04-07', 'y2026'),
  Y('2NdbZTnIIAM', "€10,000,000 GTD | WSOP Europe Main Event - Day 4", '2026-04-08', 'y2026'),
  Y('ryST1tVOUAw', "€10,000,000 GTD | WSOP Europe Main Event - Day 5", '2026-04-09', 'y2026'),
  Y('Dqkl7d_pnqc', "€10,000,000 GTD | WSOP Europe Main Event - Final Table (Session 1)", '2026-04-10', 'y2026'),
  Y('z_ykW11RBRI', "€10,000,000 GTD | WSOP Europe Main Event - Final Table (Session 2)", '2026-04-10', 'y2026'),
  Y('C7QTh7wva00', "HIGHLIGHTS | 2026 WSOPE Main Event | Day 1A | Prague", '2026-04-03', 'y2026'),
  Y('hTgGN22V_PY', "HIGHLIGHTS | 2026 WSOPE Main Event | Day 1B | Prague", '2026-04-04', 'y2026'),
  Y('sSKRlPNO0UY', "HIGHLIGHTS | 2026 WSOPE Main Event | Day 2 | Prague", '2026-04-07', 'y2026'),
  Y('Zih5mb_5EVQ', "HIGHLIGHTS | 2026 WSOPE Main Event | Final Table | Prague", '2026-04-10', 'y2026'),
  Y('To5xgFlsnCY', "WSOP Super Circuit Canada Main Event $5K - Day 2A", '2026-09-04', 'y2026'),
  Y('H0JSipNlrNY', "WSOP Super Circuit Canada Main Event $5K - Day 2B", '2026-09-05', 'y2026'),
  Y('alcnNHlgdUk', "WSOP Super Circuit Canada Main Event $5K - Day 2C", '2026-09-06', 'y2026'),
  Y('Ur4ZIB3erL0', "WSOP Super Circuit Canada Main Event $5K - Day 3", '2026-09-07', 'y2026'),
  Y('-1SlgRr5Wt8', "WSOP Super Circuit Canada Main Event $5K - Day 4", '2026-09-08', 'y2026'),
  Y('XZFpibvB5uA', "WSOP Super Circuit Canada Main Event $5K - Day 5", '2026-09-09', 'y2026'),
  Y('YLd_y-jRqCE', "WSOP Super Circuit Canada Main Event $5K - FINAL TABLE", '2026-09-10', 'y2026'),
  Y('6ISDwWBcFqc', "WSOP Super Circuit Canada Main Event $5K - FINAL TABLE", '2026-09-10', 'y2026'),
  Y('NgmC2AyY6eQ', "$10,000 Main Event - Day 1A | World Series of Poker", '2026-07-03', 'y2026'),
  Y('5WAC_EHuelU', "$10,000 Main Event Day 1B | World Series of Poker", '2026-07-04', 'y2026'),
  Y('2vo-KVi9rJs', "$10,000 Main Event Day 1C | World Series of Poker", '2026-07-04', 'y2026'),
  Y('GLXWjV3Ic0I', "$10,000 Main Event Day 1D | World Series of Poker", '2026-07-05', 'y2026'),
  Y('ecq6RRht7GI', "$10,000 Main Event Day 2ABC | World Series of Poker", '2026-07-06', 'y2026'),
  Y('R_44RqfjiWY', "$10,000 Main Event Day 3 | World Series of Poker", '2026-07-09', 'y2026'),
  Y('lRuDBOkDvQk', "$10,000 Main Event Day 5 | World Series of Poker", '2026-07-10', 'y2026'),
  Y('ogoG54uaq9k', "$10,000 Main Event Day 6 | World Series of Poker", '2026-07-12', 'y2026'),
  Y('qAeO_w5QJrQ', "$10,000 Main Event Day 8 | World Series of Poker", '2026-07-14', 'y2026'),
  Y('QwqXyihmYBQ', "HIGHLIGHTS | $10,000 Main Event | Day 1A", '2026-07-03', 'y2026'),
  Y('kIErxAhqX1o', "HIGHLIGHTS | $10,000 Main Event | Day 1D", '2026-07-06', 'y2026'),
  Y('WWPGWi8aLvI', "HIGHLIGHTS | $10,000 Main Event | Day 2D", '2026-07-08', 'y2026'),
  Y('31rhZNp5zzI', "HIGHLIGHTS | $10,000 Main Event | Day 3", '2026-07-09', 'y2026'),
  Y('y7Yx4ZWtm68', "HIGHLIGHTS | $10,000 Main Event | Day 6", '2026-07-12', 'y2026'),
  Y('r8YzivCqwTQ', "HIGHLIGHTS | $10,000 Main Event | Day 7", '2026-07-13', 'y2026'),
  Y('3N-xegeMSos', "HIGHLIGHTS | $10,000 Main Event | Day 8", '2026-07-14', 'y2026'),
  Y('DtBU-JcgnkU', "HIGHLIGHTS | $10,000 Main Event | Final Table", '2026-08-04', 'y2026'),
  Y('_IiFpKlPB1k', "HIGHLIGHTS | $10,000 Main Event | Final Table Pt 2", '2026-08-05', 'y2026'),
  Y('OjAlvTqwQuc', "HIGHLIGHTS | $10,000 Main Event | Final Table Finale", '2026-08-06', 'y2026'),
  Y('t43kLxHyCKg', "$10,000 PLO Championship Final Table | World Series of Poker", '2026-06-29', 'y2026'),
  Y('jS7IqqfNZCE', "$5,000 NLH 6-Handed - FINAL TABLE | World Series of Poker", '2026-07-01', 'y2026'),
  Y('FeCb4Q5Xam8', "HIGHLIGHTS | $5,000 6-Handed No-Limit Hold’em | Final Table", '2026-07-01', 'y2026'),
  Y('-0CN3AbtOIk', "$10,000 NLH Mystery Bounty - Final Table | World Series of Poker", '2026-06-19', 'y2026'),
  Y('WrnZdEdZD4I', "$10,000 GGMillion$ High Roller - Final Table | World Series of Poker", '2026-06-04', 'y2026'),
  Y('1k1hXnTwK_U', "$1,000 Ladies Championship - Final Table | World Series of Poker", '2026-06-29', 'y2026'),
  Y('fGU5ONdh5p8', "$500 NLH Colossus - Final Table | World Series of Poker", '2026-06-16', 'y2026'),
];

/**
 * The channel's titles as cards show them, in the same style as the other cards: the channel's own words, without
 * emoji or hashtags, ALL-CAPS words in normal case (abbreviations such as WSOP or PLO kept), and "|" / " - "
 * separators as "·".
 */
const KEEP_CAPS = new Set(['WSOP', 'WSOPE', 'PLO', 'PPC', 'NLH', 'GTD', 'TV', 'AA', 'KK', 'QQ', 'JJ', 'AK', 'NFL']);
export function cardTitle(raw: string): string {
  const text = raw
    .replace(/\u{1F19A}/gu, 'vs')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/#[A-Za-z]\w*/g, '')
    .replace(/\s*\|\s*|\s+[–-]\s+/g, ' · ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => {
      const letters = w.replace(/[^A-Za-z]/g, '');
      if (letters.length < 2 || letters !== letters.toUpperCase() || KEEP_CAPS.has(letters)) return w;
      // HIGHLIGHTS → Highlights, ALL-INs stays (not all caps), "LIFETIME" → "Lifetime".
      return w.replace(/[A-Z]{2,}/g, (m, at: number) => (at === w.search(/[A-Za-z]/) ? m[0] + m.slice(1).toLowerCase() : m.toLowerCase()));
    })
    .join(' ');
  return text
    .replace(/(\s*·\s*)+/g, ' · ')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    // The channel's sign-off ("… | World Series of Poker") says nothing on WSOP TV.
    .replace(/\s*·\s*World Series of Poker$/, '')
    .trim();
}

/** Each upload's length in seconds, as YouTube lists it (checked Nov 12, 2026). */
const LENGTH: Record<string, number> = {
  'hbBsq81e8d0': 19351,
  'EFrXwz3WX0I': 31505,
  'pp9pA3dQWIk': 30902,
  'guQ6R799HWk': 38295,
  'hGQfNNau0AI': 38750,
  '2NdbZTnIIAM': 38105,
  'ryST1tVOUAw': 27825,
  'Dqkl7d_pnqc': 31465,
  'z_ykW11RBRI': 16445,
  'C7QTh7wva00': 3553,
  'hTgGN22V_PY': 823,
  'sSKRlPNO0UY': 1024,
  'Zih5mb_5EVQ': 1220,
  'To5xgFlsnCY': 23770,
  'H0JSipNlrNY': 25905,
  'alcnNHlgdUk': 27050,
  'Ur4ZIB3erL0': 31195,
  '-1SlgRr5Wt8': 27085,
  'XZFpibvB5uA': 38580,
  'YLd_y-jRqCE': 42900,
  '6ISDwWBcFqc': 4005,
  'NgmC2AyY6eQ': 24390,
  '5WAC_EHuelU': 24650,
  '2vo-KVi9rJs': 24330,
  'GLXWjV3Ic0I': 24085,
  'ecq6RRht7GI': 24201,
  'R_44RqfjiWY': 24710,
  'lRuDBOkDvQk': 16100,
  'ogoG54uaq9k': 42900,
  'qAeO_w5QJrQ': 41650,
  'QwqXyihmYBQ': 1237,
  'kIErxAhqX1o': 1556,
  'WWPGWi8aLvI': 1030,
  '31rhZNp5zzI': 1085,
  'y7Yx4ZWtm68': 1756,
  'r8YzivCqwTQ': 1551,
  '3N-xegeMSos': 1737,
  'DtBU-JcgnkU': 1174,
  '_IiFpKlPB1k': 1416,
  'OjAlvTqwQuc': 1333,
  't43kLxHyCKg': 19475,
  'jS7IqqfNZCE': 18015,
  'FeCb4Q5Xam8': 1233,
  '-0CN3AbtOIk': 18600,
  'WrnZdEdZD4I': 15805,
  '1k1hXnTwK_U': 25365,
  'fGU5ONdh5p8': 21095,
  '1Y4waMzoPak': 49,
  '2SqDbxxXFdA': 44,
  '5VhUDMsnnA4': 25600,
  '6TnQxvLRdRw': 29615,
  '70vL_M-P3jg': 45,
  '7E9hNeN2rw4': 76,
  'Aot70Dr7Epw': 115,
  'BWxyxC5D9lI': 47,
  'BcvYT-AZSDA': 34,
  'CW0UTUQCB8k': 74,
  'CeVpt52Ao2Y': 1796,
  'Dni8N8820l4': 51,
  'GrjIb3rTyzo': 1209,
  'HwEHTLyTBE4': 253,
  'IATwKU2_I00': 53,
  'IMZVcSsG5PI': 1123,
  'IeKh7Xg7S1U': 2185,
  'Ilquv-CkjaU': 42,
  'J3qgS5pfKqo': 464,
  'KAQtghf5o38': 21790,
  'LefBuO2ZxOk': 52,
  'Mljk7nC-gb4': 56,
  'R4TmmJVeeWI': 1332,
  'RbWnu_pEG40': 454,
  'SajAvmPg7x8': 58,
  'V0G4EDKNj_U': 1006,
  'VTIgwupawxE': 113,
  'XSFTEtyWjvQ': 53,
  'XjKaiw5oAY0': 87,
  '_OvwB1VM2xk': 177,
  'alACbasLwdw': 40,
  'b0Is_TGWECo': 343,
  'deAsBMKAaFk': 16870,
  'edqRziQ0n-0': 44,
  'hztBTtkdfG8': 45,
  'iqowrfWMTU4': 61,
  'jHYp0d9HKVE': 60,
  'lL05Fuic7xs': 559,
  'lNLUdaH9g3c': 2278,
  'mpUDWFyLd5E': 56,
  'nPl4XNf9VuY': 40,
  'qLrlxa2XVks': 87,
  'qvx2zuZ3Pvw': 2033,
  'sA--RqkdzPI': 57,
  'sUQ2ryliFLg': 44,
  'wpbjVoZ0ex8': 2210,
  'y5PZt0XW-H8': 209,
  'yC8ikcDSXd0': 30,
  'zYD4MxoQb2Q': 46,
};

const toVideo = (y: Yt, i: number): Video => ({
  id: `yt.${y.id}`,
  kind: 'clip',
  title: cardTitle(y.title),
  // No line under the title (where it's from isn't something the viewer needs on the card).
  subtitle: '',
  // The title is the channel's own text; no separate description.
  description: '',
  // hqdefault is 4:3 with the 16:9 picture letterboxed; the card's 16:9 crop of its middle drops the bars.
  thumb: `https://i.ytimg.com/vi/${y.id}/hqdefault.jpg`,
  thumbPos: '50% 50%',
  media: { url: FOOTAGE.ft.url, start: 40 + ((i * 53) % 360) },
  durationSec: LENGTH[y.id] ?? 0,
  tags: [],
  about: [
    ['Source', 'WSOP YouTube channel'],
    ['YouTube title', y.title],
  ],
  views: 0,
});

export const YT_VIDEOS: Video[] = LIST.map(toVideo);
const byId = new Map(YT_VIDEOS.map((v) => [v.id, v]));
export const youtubeVideo = (id: string) => byId.get(id);
/** One group's videos, newest upload first. */
export const ytGroup = (g: Group) =>
  LIST.filter((y) => y.group === g)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((y) => byId.get(`yt.${y.id}`)!);
/** The videos of one Browse row (`lv:46`, `pa:main` …), newest upload first. */
export const ytForEvent = (key: string) =>
  LIST.filter((y) => y.event === key)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((y) => byId.get(`yt.${y.id}`)!);

/**
 * Related videos for a channel video: for an event's clip, that event's own broadcasts and highlights (the archive
 * files) and its other channel clips; otherwise the other videos of its group (hands, iconic moments).
 */
export function ytRelated(v: Video, n = 10): Video[] {
  const y = LIST.find((x) => `yt.${x.id}` === v.id);
  if (!y) return [];
  const others = (list: Yt[]) => list.filter((x) => x.id !== y.id).map((x) => byId.get(`yt.${x.id}`)!);
  if (y.event) {
    const [series, ev] = y.event.split(':');
    const ref = archiveEvent(`2025-${series}-${ev}`);
    const files = ref ? [...broadcastsOf(ref), ...highlightsOf(ref)] : [];
    return [...others(LIST.filter((x) => x.event === y.event)), ...files].slice(0, n);
  }
  return others(LIST.filter((x) => x.group === y.group)).slice(0, n);
}
