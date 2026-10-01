import { Link } from 'react-router-dom';
import type { HandRecord } from '../data/types';
import { lookup } from '../data/api';
import { useAuth } from '../state/gate';
import { AccessTag, Thumb } from './ui';
import { formatClock } from '../lib/time';
import { progressStore, useStore } from '../state/stores';

export function HandCard({ hand, compact }: { hand: HandRecord; compact?: boolean }) {
  const { tier } = useAuth();
  const progress = useStore(progressStore)[`hand:${hand.id}`];
  const ev = lookup.event(hand.eventId);
  const season = ev ? lookup.season(ev.seasonId) : null;
  if (!hand.clip) return null;
  return (
    <Link to={`/hands/${hand.id}`} state={{ select: true }} className={`card hand-card ${compact ? 'is-compact' : ''}`}>
      <Thumb seed={hand.id} sub={compact ? undefined : `Hand #${hand.handNumber}`}>
        <span className="thumb-duration">{formatClock(hand.clip.durationSec)}</span>
        {progress && (
          <span className="thumb-progress" style={{ width: `${(progress.position / progress.duration) * 100}%` }} />
        )}
      </Thumb>
      <div className="card-body">
        <div className="card-tags">
          <AccessTag level={hand.clip.access} tier={tier} />
        </div>
        <p className="card-title">{hand.title}</p>
        <p className="card-meta">
          {compact && `Hand #${hand.handNumber} · `}
          {season?.year} · {ev?.shortName}
        </p>
      </div>
    </Link>
  );
}
