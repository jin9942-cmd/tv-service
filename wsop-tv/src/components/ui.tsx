import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BroadcastStatus, EventStatus, Player } from '../data/types';
import { initials } from '../lib/format';
import { ACCESS_LABEL, TIER_LABEL, canAccess, minimumTier, type AccessLevel, type Tier } from '../config/entitlements';
import { LockIcon } from '../state/gate';

export function Avatar({ player, size = 40 }: { player: Pick<Player, 'name' | 'color'>; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: player.color, fontSize: size * 0.38 }}
      role="img"
      aria-label={`${player.name} (placeholder image)`}
    >
      {initials(player.name)}
    </span>
  );
}

const SUITS = ['♠', '♥', '♦', '♣'];

/** Placeholder thumbnail — no official imagery is used in this demo. */
export function Thumb({ seed, label, sub, children }: { seed: string; label?: string; sub?: string; children?: ReactNode }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const suit = SUITS[h % 4];
  return (
    <div
      className="thumb"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 35% 22%), hsl(${(hue + 40) % 360} 30% 10%))` }}
      aria-hidden={!label}
    >
      <span className={`thumb-suit ${suit === '♥' || suit === '♦' ? 'is-red' : ''}`}>{suit}</span>
      {label && <span className="thumb-label">{label}</span>}
      {sub && <span className="thumb-sub">{sub}</span>}
      {children}
    </div>
  );
}

const STATUS_TEXT: Record<BroadcastStatus | EventStatus, string> = {
  live: 'Live',
  delayed: 'Delayed',
  interrupted: 'Interrupted',
  ended: 'Ended',
  scheduled: 'Scheduled',
  upcoming: 'Upcoming',
  replay: 'Replay',
};

export function StatusBadge({ status, small }: { status: BroadcastStatus | EventStatus; small?: boolean }) {
  return (
    <span className={`status status-${status} ${small ? 'status-sm' : ''}`}>
      {status === 'live' && <span className="live-dot" />}
      {STATUS_TEXT[status]}
    </span>
  );
}

export function AccessTag({ level, tier }: { level: AccessLevel; tier: Tier }) {
  if (canAccess(tier, level)) {
    return level === 'highlight' ? <span className="tag tag-free">Free</span> : null;
  }
  return (
    <span className="tag tag-lock" title={ACCESS_LABEL[level]}>
      <LockIcon /> {minimumTier(level) === 'free' ? 'Sign in' : TIER_LABEL[minimumTier(level)]}
    </span>
  );
}

export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-text">{children}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

export function SampleNote({ children }: { children: ReactNode }) {
  return (
    <p className="sample-note">
      <span className="sample-pill">Sample</span> {children}
    </p>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> {label}
    </div>
  );
}

export function PlayerLink({ player }: { player: Player | null | undefined }) {
  if (!player) return <span>Unknown player</span>;
  return (
    <Link className="player-link" to={`/players/${player.id}`}>
      {player.name}
    </Link>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}
