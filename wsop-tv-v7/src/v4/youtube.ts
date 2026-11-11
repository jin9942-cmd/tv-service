// Videos from the official WSOP YouTube channel (youtube.com/@WSOP, "World Series of Poker"), assuming WSOP TV can
// carry them. Every id was checked with YouTube's oEmbed (author "World Series of Poker") and every title is the
// channel's own, as published. Only uploads from before the demo moment (May 15, 2026) are used.
// Cards show YouTube's own thumbnail; playback uses the demo's archive clip, like the rest of the demo.
import { FOOTAGE } from '../lib/media';
import type { Video } from './catalog';
import { archiveEvent, broadcastsOf, highlightsOf } from './archive';

type Group = 'mizrachi' | 'hands' | 'iconic' | 'event' | 'season26';
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
];

const toVideo = (y: Yt, i: number): Video => ({
  id: `yt.${y.id}`,
  kind: 'clip',
  title: y.title,
  // No line under the title (where it's from isn't something the viewer needs on the card).
  subtitle: '',
  // The title is the channel's own text; no separate description.
  description: '',
  // hqdefault is 4:3 with the 16:9 picture letterboxed; the card's 16:9 crop of its middle drops the bars.
  thumb: `https://i.ytimg.com/vi/${y.id}/hqdefault.jpg`,
  thumbPos: '50% 50%',
  media: { url: FOOTAGE.ft.url, start: 40 + ((i * 53) % 360) },
  // Lengths aren't shown (they weren't checked).
  durationSec: 0,
  tags: [],
  about: [
    ['Source', 'WSOP YouTube channel'],
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
