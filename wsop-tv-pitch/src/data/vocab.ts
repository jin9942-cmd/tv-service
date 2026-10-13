// Poker vocabulary for AI subtitles (speech-to-text custom dictionary, managed in the CMS).
// Captions in the app are built from these terms, so a CMS change shows up in the player.

export type VocabCategory = '선수명' | '포커 용어' | '대회·장소명';
export type VocabLang = 'EN' | 'ES' | 'KO';
export type VocabStatus = 'active' | 'pending';

export interface VocabTerm {
  id: string;
  phrase: string;
  /** How the speech engine tends to hear it. */
  soundsLike: string;
  /** What the subtitle should show. */
  displayAs: string;
  category: VocabCategory;
  /** Dictionaries are managed per language (VOC-001). */
  lang: VocabLang;
  enabled: boolean;
  status: VocabStatus;
  updatedAt: number;
  updatedBy: string;
}

const ago = (min: number) => Date.now() - min * 60_000;

export const seedVocab: VocabTerm[] = [
  { id: 'vc-1', phrase: 'Seo-yeon Han', soundsLike: 'so yeon hahn', displayAs: 'Seo-yeon Han', category: '선수명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(4300), updatedBy: 'ops.lee' },
  { id: 'vc-2', phrase: 'Mateo Valcourt', soundsLike: 'mateo val core', displayAs: 'Mateo Valcourt', category: '선수명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(4300), updatedBy: 'ops.lee' },
  { id: 'vc-3', phrase: 'Ines Duarte-Lindqvist', soundsLike: 'enis do art lind quist', displayAs: 'Inês Duarte-Lindqvist', category: '선수명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(2900), updatedBy: 'ops.lee' },
  { id: 'vc-4', phrase: 'Final Table', soundsLike: 'final tables', displayAs: 'Final Table', category: '대회·장소명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(9000), updatedBy: 'ops.lee' },
  { id: 'vc-5', phrase: 'Main Event', soundsLike: 'mane event', displayAs: 'Main Event', category: '대회·장소명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(9000), updatedBy: 'ops.lee' },
  { id: 'vc-6', phrase: 'Bracelet', soundsLike: 'brace let', displayAs: 'bracelet', category: '대회·장소명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(9000), updatedBy: 'ops.lee' },
  { id: 'vc-7', phrase: 'Heads-up', soundsLike: 'heads op', displayAs: 'heads-up', category: '포커 용어', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(9000), updatedBy: 'ops.lee' },
  { id: 'vc-8', phrase: 'River', soundsLike: 'riva', displayAs: 'river', category: '포커 용어', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(9000), updatedBy: 'ops.lee' },
  { id: 'vc-9', phrase: 'Paradise Island', soundsLike: 'pair a dice island', displayAs: 'Paradise Island', category: '대회·장소명', lang: 'EN', enabled: true, status: 'active', updatedAt: ago(6000), updatedBy: 'ops.lee' },
  // Not yet deployed: the demo caption still shows the raw transcription until "사전 배포".
  { id: 'vc-10', phrase: 'Yuna Kagami', soundsLike: 'you na ka gami', displayAs: 'Yuna Kagami', category: '선수명', lang: 'EN', enabled: true, status: 'pending', updatedAt: ago(35), updatedBy: 'editor.kim' },
  { id: 'vc-11', phrase: 'Mesa Final', soundsLike: 'mesa final', displayAs: 'Mesa Final', category: '포커 용어', lang: 'ES', enabled: true, status: 'active', updatedAt: ago(5000), updatedBy: 'ops.lee' },
  { id: 'vc-12', phrase: '한서연', soundsLike: '한서연', displayAs: '한서연 (Seo-yeon Han)', category: '선수명', lang: 'KO', enabled: true, status: 'active', updatedAt: ago(5000), updatedBy: 'ops.lee' },
];

/** Caption lines: plain text plus references to vocabulary terms (by phrase). */
type Seg = string | { term: string; raw: string };
export const CAPTION_LINES: Seg[][] = [
  [{ term: 'Seo-yeon Han', raw: 'so yeon hahn' }, ' takes a seat at the ', { term: 'Final Table', raw: 'final tables' }, '.'],
  ['What a moment on ', { term: 'Paradise Island', raw: 'pair a dice island' }, ' — the crowd is on its feet.'],
  [{ term: 'Yuna Kagami', raw: 'you na ka gami' }, ' and ', { term: 'Mateo Valcourt', raw: 'mateo val core' }, ' are now ', { term: 'Heads-up', raw: 'heads op' }, '.'],
  ['The ', { term: 'Main Event', raw: 'mane event' }, ' ', { term: 'Bracelet', raw: 'brace let' }, ' is one step closer.'],
];

/** Render a caption line with the currently deployed vocabulary. */
export function renderCaption(line: Seg[], vocab: VocabTerm[]): { text: string; fixed: boolean }[] {
  return line.map((seg) => {
    if (typeof seg === 'string') return { text: seg, fixed: false };
    const t = vocab.find((v) => v.phrase === seg.term && v.lang === 'EN' && v.enabled && v.status === 'active');
    return t ? { text: t.displayAs, fixed: true } : { text: seg.raw, fixed: false };
  });
}
