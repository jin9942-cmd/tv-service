// Mockup stand-ins: the 2026 Super Circuit Canada events #12 and #10 have no upload on the WSOP channel yet, so these
// placeholder cards show how the series page lays out more than one event. Not real videos — swap for the real
// broadcasts when they exist. Pictures are frames from the series' own Main Event uploads.
import { FOOTAGE } from '../lib/media';
import type { Video } from './catalog';

type Mock = { id: string; title: string; frame: number; length: number };

const pic = (n: number) => `${import.meta.env.BASE_URL}frames/y26/mock-${n}.jpg`;

const MOCKS: Mock[] = [
  { id: 'ca12-ft', title: '$25,000 Super High Roller · Final Table', frame: 2, length: 6 * 3600 + 12 * 60 + 41 },
  { id: 'ca12-d1', title: '$25,000 Super High Roller · Day 1', frame: 5, length: 8 * 3600 + 33 * 60 + 4 },
  { id: 'ca10-ft', title: '$14,000 GGMillion$ High Roller · Final Table', frame: 3, length: 7 * 3600 + 5 * 60 + 18 },
  { id: 'ca10-d1', title: '$14,000 GGMillion$ High Roller · Day 1', frame: 4, length: 9 * 3600 + 24 * 60 + 10 },
  { id: 'ca10-hl', title: '$14,000 GGMillion$ High Roller · Highlights', frame: 1, length: 14 * 60 + 52 },
];

const toVideo = (m: Mock, i: number): Video => ({
  id: `mock.${m.id}`,
  kind: 'clip',
  title: m.title,
  subtitle: '',
  description: '',
  thumb: pic(m.frame),
  thumbPos: '50% 50%',
  media: { url: FOOTAGE.ft.url, start: 60 + ((i * 71) % 360) },
  durationSec: m.length,
  tags: [],
  about: [['Source', 'Mockup (placeholder)']],
  views: 0,
});

const byId = new Map(MOCKS.map((m, i) => [`mock.${m.id}`, toVideo(m, i)]));
export const mockVideo = (id: string) => byId.get(id);
