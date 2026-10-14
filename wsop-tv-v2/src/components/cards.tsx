// Content cards shared by Home, Live, Hands, Players and Archive.
import { Link } from 'react-router-dom';
import type { ArchiveItem, Day, Hand, Player, TourEvent } from '../data/types';
import { HERO_DAY_ID, eventById, playerById, seriesById } from '../data/mock';
import { chips, compact, duration, moneyShort } from '../lib/format';
import { fmtDateTime } from '../lib/time';
import { useApp } from '../state/app';
import { HAND_META, HandGlyph } from '../features/player/markers';
import { Avatar, BraceletCount, CountryCode, Icon, Spoiler, StatusBadge, cx } from './ui';

/** Abstract artwork for a broadcast (no images): stage gradient + event number. */
export function Art({ hue = 220, label, children, className }: { hue?: number; label?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('stage relative aspect-video overflow-hidden rounded-card', className)} style={{ ['--stage-a' as string]: `hsl(${hue} 16% 17%)`, ['--stage-b' as string]: `hsl(${hue} 20% 7%)` }}>
      <div className="absolute top-[24%] left-[18%] h-[52%] w-[64%] rounded-[50%] border border-white/10" aria-hidden />
      {label && <span className="absolute right-3 bottom-2 text-4xl font-black text-white/[0.07] tnum select-none">{label}</span>}
      {children}
    </div>
  );
}

export function useDayStatus(day: Day) {
  const { state } = useApp();
  return day.id === HERO_DAY_ID ? state.streamMode : day.status;
}

export function BroadcastCard({ event, day, wide, progress }: { event: TourEvent; day: Day; wide?: boolean; progress?: number }) {
  const { state } = useApp();
  const status = useDayStatus(day);
  return (
    <Link to={`/watch/${day.id}`} className={cx('group block', wide ? 'w-80 sm:w-96' : 'w-64 sm:w-72')}>
      <Art hue={200 + event.number * 3} label={`#${event.number}`} className="transition-transform duration-200 group-hover:scale-[1.015]">
        <span className="absolute top-2 left-2">
          <StatusBadge status={status} size="sm" />
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
  );
}

export function HandCard({ hand, className }: { hand: Hand; className?: string }) {
  const ev = eventById(hand.eventId)!;
  const m = HAND_META[hand.type];
  return (
    <div className={cx('group rounded-card border border-line bg-surface p-3 transition-colors duration-150 hover:border-line-strong', className)}>
      <Link to={`/watch/${hand.dayId}?t=${hand.t}`} className="block rounded-card">
      <Art hue={210 + ev.number * 5}>
        <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[4px] bg-black/70 px-1.5 py-1">
          <HandGlyph type={hand.type} size={14} />
          <span className="label text-[10px]">{m.label}</span>
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

export function PlayerCard({ player, rank }: { player: Player; rank?: number }) {
  return (
    <Link to={`/players/${player.id}`} className="group flex w-44 flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 text-center transition-colors duration-150 hover:border-line-strong">
      {rank && <span className="label self-start text-subtle tnum">#{rank}</span>}
      <Avatar name={player.name} hue={player.hue} size={64} />
      <span className="text-sm font-semibold group-hover:text-gold-strong">{player.name}</span>
      <span className="flex items-center gap-2 text-xs text-muted">
        <CountryCode cc={player.cc} /> <BraceletCount n={player.bracelets} size={14} />
      </span>
      <span className="text-xs text-muted tnum">{moneyShort(player.earnings)} earnings</span>
    </Link>
  );
}

export function ArchiveCard({ item }: { item: ArchiveItem }) {
  const { toast } = useApp();
  const w = playerById(item.winnerId);
  return (
    <div className="group w-72">
      <button onClick={() => toast('Archive playback opens the same player (demo)')} className="block w-full rounded-card text-left">
      <Art hue={item.hue} label={String(item.year)}>
        <span className="label absolute top-2 left-2 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[10px]">Classic · {item.year}</span>
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
