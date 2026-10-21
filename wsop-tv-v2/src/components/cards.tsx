// Content cards shared by Home, Live, Hands, Players and Archive.
import { Link, useNavigate } from 'react-router-dom';
import { thumbFor } from '../lib/media';
import type { ArchiveItem, Day, Hand, Player, TourEvent } from '../data/types';
import { HERO_DAY_ID, eventById, playerById, seriesById } from '../data/mock';
import { chips, compact, duration } from '../lib/format';
import { fmtDateTime } from '../lib/time';
import { canWatch, gateForAccess, useApp } from '../state/app';
import { isOnAir } from '../lib/broadcast';
import { HAND_META, HandGlyph } from '../features/player/markers';
import { AccessBadge, Avatar, Icon, Spoiler, StatusBadge, cx } from './ui';
import { CardMenu, useListAction, useLongPress, type MenuAction } from '../features/library/listActions';

/** Abstract artwork for a broadcast (no images): stage gradient + event number. */
/** Card artwork: a real still from the CC footage when `image` is given, otherwise a neutral stage. */
export function Art({ hue = 220, label, children, className, image }: { hue?: number; label?: string; children?: React.ReactNode; className?: string; image?: string }) {
  return (
    <div className={cx('stage relative aspect-video overflow-hidden rounded-card', className)} style={{ ['--stage-a' as string]: `hsl(${hue} 16% 17%)`, ['--stage-b' as string]: `hsl(${hue} 20% 7%)` }}>
      {image ? (
        <>
          <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" aria-hidden />
        </>
      ) : (
        <div className="absolute top-[24%] left-[18%] h-[52%] w-[64%] rounded-[50%] border border-white/10" aria-hidden />
      )}
      {label && !image && <span className="absolute right-3 bottom-2 text-4xl font-black text-white/[0.07] tnum select-none">{label}</span>}
      {children}
    </div>
  );
}

export function useDayStatus(day: Day) {
  const { state } = useApp();
  return day.id === HERO_DAY_ID ? state.streamMode : day.status;
}

export function BroadcastCard({ event, day, wide, progress, extraActions }: { event: TourEvent; day: Day; wide?: boolean; progress?: number; extraActions?: MenuAction[] }) {
  const { state } = useApp();
  const status = useDayStatus(day);
  const lp = useLongPress();
  const listAction = useListAction('day', day.id);
  return (
    <div className={cx('group relative block', wide ? 'w-80 sm:w-96' : 'w-64 sm:w-72')} {...lp.bind}>
    <Link to={`/watch/${day.id}`} className="block">
      <Art hue={200 + event.number * 3} image={thumbFor(`day:${day.id}`)} className="transition-transform duration-200 group-hover:scale-[1.015]">
        <span className="absolute top-2 left-2">
          <StatusBadge status={status} size="sm" />
        </span>
        <span className={cx('absolute right-2', progress !== undefined ? 'bottom-3' : 'bottom-2')}>
          <AccessBadge onArt access={day.access ?? 'subscriber'} live={isOnAir(status)} locked={!canWatch(day.access ?? 'subscriber', state, isOnAir(status))} />
        </span>
        {progress !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <i className="block h-full bg-gold" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        )}
      </Art>
      <p className="mt-2 truncate text-[15px] font-semibold group-hover:text-gold-strong">
        {event.name} · {day.label}
      </p>
      <p className="truncate text-xs text-muted">
        {seriesById(event.seriesId).name} · {status === 'upcoming' ? fmtDateTime(day.start, state.tz) : `Event #${event.number}`}
      </p>
    </Link>
    <CardMenu actions={[listAction, ...(extraActions ?? [])]} openSignal={lp.signal} className="top-2 right-2" />
    </div>
  );
}

export function HandCard({ hand, className }: { hand: Hand; className?: string }) {
  const { state } = useApp();
  const ev = eventById(hand.eventId)!;
  const m = HAND_META[hand.type];
  const lp = useLongPress();
  const listAction = useListAction('hand', hand.id);
  return (
    <div className={cx('group relative rounded-card border border-line bg-surface p-3 transition-colors duration-150 hover:border-line-strong', className)} {...lp.bind}>
      <CardMenu actions={[listAction]} openSignal={lp.signal} className="top-5 right-5" />
      {/* clip=… lets the player open just this hand when the full broadcast is locked (free highlights). */}
      <Link to={`/watch/${hand.dayId}?t=${hand.t}&clip=${hand.id}`} className="block rounded-card">
      <Art hue={210 + ev.number * 5} image={thumbFor(`hand:${hand.id}`)}>
        <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[4px] bg-black/70 px-1.5 py-1">
          <HandGlyph type={hand.type} size={14} />
          <span className="label text-[10px]">{m.label}</span>
        </span>
        <span className="absolute bottom-2 left-2">
          <AccessBadge onArt access={hand.access} locked={!canWatch(hand.access, state)} />
        </span>
        <span className="absolute right-2 bottom-2 rounded-[3px] bg-black/70 px-1.5 text-[11px] font-semibold tnum">{duration(hand.durationSec)}</span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden>
          <span className="flex size-11 items-center justify-center rounded-full bg-black/60 text-white">
            <Icon name="play" />
          </span>
        </span>
      </Art>
      <p className="mt-2.5 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-gold-strong">{hand.title}</p>
      <p className="mt-1 truncate text-xs text-muted">{hand.playerIds.map((id) => playerById(id).name).join(' vs ')}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="tnum">
          Pot <b>{chips(hand.pot)}</b>
        </span>
        <span className="truncate text-subtle">#{ev.number} {ev.name.replace(' World Championship', '')}</span>
      </div>
      </Link>
      <div className="mt-2 border-t border-line pt-2 text-xs">
        <Spoiler k={`hand-${hand.id}`} inline label="Hand result hidden">
          <span className="font-semibold">{hand.result}</span>
        </Spoiler>
      </div>
    </div>
  );
}

/** v1-style player tile: large round avatar, name, country code · bracelets. */
export function PlayerTile({ player, className }: { player: Player; className?: string }) {
  return (
    <Link to={`/players/${player.id}`} className={cx('group flex w-36 flex-col items-center gap-1.5 rounded-card px-1 py-2 text-center sm:w-40', className)}>
      <span className="mb-1.5 transition-transform duration-200 group-hover:scale-105">
        <Avatar name={player.name} hue={player.hue} size={88} vivid />
      </span>
      <span className="line-clamp-2 text-sm leading-snug font-bold group-hover:text-gold-strong">{player.name}</span>
      <span className="text-xs text-muted tnum">
        {player.cc} · {player.bracelets} bracelet{player.bracelets === 1 ? '' : 's'}
      </span>
    </Link>
  );
}

export function ArchiveCard({ item }: { item: ArchiveItem }) {
  const { state, toast, requireLogin } = useApp();
  const nav = useNavigate();
  const w = playerById(item.winnerId);
  const play = () => {
    const gate = gateForAccess(item.access, state);
    if (gate === 'ok') return toast('Archive playback opens the same player (demo)');
    if (gate === 'login') return requireLogin({ reason: item.access === 'signin' ? 'Sign in free with GGPASS to watch this classic.' : 'Sign in to watch this classic.' });
    if (gate === 'plans' || gate === 'expired') return nav('/plans', { state: { returnTo: '/archive', access: item.access } });
    if (gate === 'link') return toast('Link your GGPASS account to watch (see Account)');
    if (gate === 'restricted') return toast('Viewing isn’t available on this account');
    return nav('/devices', { state: { returnTo: '/archive' } });
  };
  const lp = useLongPress();
  const listAction = useListAction('archive', item.id);
  return (
    <div className="group relative w-72" {...lp.bind}>
      <CardMenu actions={[listAction]} openSignal={lp.signal} className="top-2 right-2" />
      <button onClick={play} className="block w-full rounded-card text-left">
      <Art hue={item.hue} image={thumbFor(`archive:${item.id}`)}>
        <span className="label absolute top-2 left-2 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[10px]">Classic · {item.year}</span>
        <span className="absolute bottom-2 left-2">
          <AccessBadge onArt access={item.access} locked={!canWatch(item.access, state)} />
        </span>
        <span className="absolute right-2 bottom-2 rounded-[3px] bg-black/70 px-1.5 text-[11px] font-semibold tnum">{duration(item.durationSec)}</span>
      </Art>
      <p className="mt-2 text-[15px] font-semibold group-hover:text-gold-strong">
        {item.year} {item.title}
      </p>
      <p className="line-clamp-1 text-xs text-muted">{item.subtitle}</p>
      </button>
      <p className="mt-1 text-xs">
        <span className="text-subtle">Champion </span>
        <Spoiler k={`archive-${item.id}`} inline label="Champion hidden">
          <span className="font-semibold">{w.name}</span>
        </Spoiler>
      </p>
    </div>
  );
}

export const viewsLabel = (n: number) => `${compact(n)} views`;
