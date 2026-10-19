// Global search over the demo catalogue: series/events, broadcast days, hands & clips, players, archive.
// Results never index outcomes (winners, hand results), so typing a champion's name can't spoil anything.
import type { Access, StreamStatus } from '../data/types';
import { HERO_DAY_ID, archive, events, hands, playerById, players, seriesById } from '../data/mock';
import { chips, duration } from './format';
import { frameFrom } from './media';
import { isOnAir } from './broadcast';

export type SearchKind = 'event' | 'day' | 'hand' | 'player' | 'archive';
export type SearchStatus = 'live' | 'upcoming' | 'vod';

export interface SearchItem {
  kind: SearchKind;
  id: string;
  title: string;
  sub: string;
  url: string;
  status?: SearchStatus;
  /** Exact stream status for the badge (live / delayed / vod …). */
  badge?: StreamStatus;
  seriesId?: string;
  access?: Access;
  image?: string;
  /** Lower-case text the query is matched against. */
  text: string;
}

const statusOf = (s: StreamStatus): SearchStatus => (isOnAir(s) || s === 'late' || s === 'interrupted' ? 'live' : s === 'upcoming' ? 'upcoming' : 'vod');
const lastName = (id: string) => playerById(id).name.split(' ').slice(-1)[0];
/** Spoiler-free title for a hand: who and how big, not what happened. */
export const safeHandTitle = (h: (typeof hands)[number]) => `${lastName(h.playerIds[0])} vs ${lastName(h.playerIds[1])} · ${chips(h.pot)} pot`;

export function buildIndex(streamMode: StreamStatus, spoilerFree: boolean): SearchItem[] {
  const dayStatus = (id: string, s: StreamStatus) => (id === HERO_DAY_ID ? streamMode : s);
  const out: SearchItem[] = [];
  for (const e of events) {
    const se = seriesById(e.seriesId);
    const sts = e.days.map((d) => dayStatus(d.id, d.status));
    const evStatus: SearchStatus = sts.some((s) => statusOf(s) === 'live') ? 'live' : sts.every((s) => s === 'upcoming') ? 'upcoming' : 'vod';
    out.push({
      kind: 'event',
      id: e.id,
      title: `#${e.number} ${e.name}`,
      sub: `${se.name} · ${e.game}`,
      url: `/events/${e.id}`,
      status: evStatus,
      seriesId: e.seriesId,
      image: frameFrom(e.number),
      text: `${e.name} ${e.number} ${se.name} ${se.city} ${e.game} event`.toLowerCase(),
    });
    for (const d of e.days) {
      const st = dayStatus(d.id, d.status);
      out.push({
        kind: 'day',
        id: d.id,
        title: `${e.name.replace(' World Championship', '')} · ${d.label}`,
        sub: `${se.name} · ${Math.round(d.durationMin / 60)}h`,
        url: `/watch/${d.id}`,
        status: statusOf(st),
        badge: st,
        seriesId: e.seriesId,
        access: d.access ?? 'subscriber',
        image: frameFrom(e.number + e.days.indexOf(d) * 3),
        text: `${e.name} ${d.label} ${se.name} ${d.label === 'Final Table' ? 'ft final table' : ''} broadcast`.toLowerCase(),
      });
    }
  }
  for (const h of hands) {
    const e = events.find((x) => x.id === h.eventId)!;
    const names = h.playerIds.map((id) => playerById(id).name);
    out.push({
      kind: 'hand',
      id: h.id,
      title: spoilerFree ? safeHandTitle(h) : h.title,
      sub: `${names.join(' vs ')} · #${e.number} ${e.name.replace(' World Championship', '')} · ${duration(h.durationSec)}`,
      url: `/watch/${h.dayId}?t=${h.t}&clip=${h.id}`,
      status: 'vod',
      seriesId: e.seriesId,
      access: h.access,
      image: frameFrom(Number(h.id.slice(1)) * 5),
      // In spoiler-free mode the descriptive title isn't searchable either.
      text: `${spoilerFree ? '' : h.title} ${names.join(' ')} ${e.name} hand clip`.toLowerCase(),
    });
  }
  for (const p of players) {
    out.push({
      kind: 'player',
      id: p.id,
      title: p.name,
      sub: `${p.country} · ${p.bracelets} bracelet${p.bracelets === 1 ? '' : 's'}`,
      url: `/players/${p.id}`,
      text: `${p.name} ${p.country} ${p.cc} player`.toLowerCase(),
    });
  }
  for (const a of archive) {
    out.push({
      kind: 'archive',
      id: a.id,
      title: `${a.year} ${a.title}`,
      sub: `${a.subtitle} · ${duration(a.durationSec)}`,
      url: '/archive',
      status: 'vod',
      access: a.access,
      image: frameFrom(a.year),
      text: `${a.year} ${a.title} ${a.subtitle} classic archive`.toLowerCase(),
    });
  }
  return out;
}

/** Score: whole-title prefix > word prefix > anywhere. 0 = no match. Every query word must match. */
function score(item: SearchItem, q: string) {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const title = item.title.toLowerCase();
  let total = 0;
  for (const w of words) {
    if (title.startsWith(w)) total += 30;
    else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) total += 20;
    else if (title.includes(w)) total += 12;
    else if (item.text.includes(w)) total += 6;
    else return 0;
  }
  return total;
}

export function search(index: SearchItem[], q: string) {
  return index
    .map((item) => ({ item, s: score(item, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}

/** Type-ahead suggestions: distinct titles of the best matches. */
export function suggest(index: SearchItem[], q: string, n = 6) {
  if (q.trim().length < 1) return [];
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const it of search(index, q)) {
    if (it.kind === 'hand') continue;
    const k = it.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
    if (out.length >= n) break;
  }
  return out;
}

export const KIND_LABEL: Record<SearchKind, string> = { event: 'Event', day: 'Broadcast', hand: 'Hand', player: 'Player', archive: 'Classic' };
