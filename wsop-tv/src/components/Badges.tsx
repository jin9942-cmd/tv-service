import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { badgeProgress, markBadgeNotified, useActivity, type BadgeProgress } from '../state/activity';
import { BADGES } from '../config/badges';

const ICONS: Record<string, string> = {
  'first-table': 'M4 6h16v10H4zM8 20h8M12 16v4',
  'hand-collector': 'M6 3h12v18l-6-4-6 4z',
  'final-fan': 'M8 4h8v5a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M12 13v4M9 20h6',
  'player-follower': 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M17 8v6M14 11h6',
};

export function BadgeIcon({ id, earned }: { id: string; earned: boolean }) {
  return (
    <span className={`badge-icon ${earned ? 'is-earned' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d={ICONS[id] ?? 'M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function formatProgress(p: BadgeProgress) {
  return p.unit === 'sec' ? `${p.current}s / ${p.target}s` : `${p.current} / ${p.target} ${p.unit}`;
}

export function BadgeCard({ p }: { p: BadgeProgress }) {
  const earned = !!p.earnedAt;
  return (
    <li className={`badge-card ${earned ? 'is-earned' : ''}`}>
      <BadgeIcon id={p.badge.id} earned={earned} />
      <div className="badge-text">
        <p className="badge-name">{p.badge.name}</p>
        <p className="badge-desc">{p.badge.description}</p>
        {earned ? (
          <p className="badge-meta">Earned {new Date(p.earnedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        ) : (
          <>
            <div className="badge-bar" role="progressbar" aria-valuemin={0} aria-valuemax={p.target} aria-valuenow={p.current} aria-label={`${p.badge.name} progress`}>
              <span style={{ width: `${(p.current / p.target) * 100}%` }} />
            </div>
            <p className="badge-meta">
              {formatProgress(p)} ·{' '}
              <Link to={p.badge.start.to} className="credit-link">
                {p.badge.start.label}
              </Link>
            </p>
          </>
        )}
      </div>
    </li>
  );
}

export function BadgeList() {
  const progress = badgeProgress(useActivity());
  return (
    <ul className="badge-list">
      {progress.map((p) => (
        <BadgeCard key={p.badge.id} p={p} />
      ))}
    </ul>
  );
}

/** Next badge to aim for: the unearned one closest to completion. */
export function nextBadge(progress: BadgeProgress[]): BadgeProgress | undefined {
  return progress.filter((p) => !p.earnedAt).sort((a, b) => b.current / b.target - a.current / a.target)[0];
}

/**
 * Small, non-blocking toast for newly earned badges. Shown once per badge: it is marked as notified
 * the moment it appears, so it won't repeat after refresh or in another tab.
 */
export function BadgeToast() {
  const activity = useActivity();
  const [showing, setShowing] = useState<string | null>(null);

  useEffect(() => {
    if (showing) return;
    // Only a visible tab claims the notification, so a background tab can't show it too.
    if (document.visibilityState !== 'visible') return;
    const pending = BADGES.find((b) => activity.earned[b.id] && !activity.earned[b.id].notified);
    if (!pending) return;
    setShowing(pending.id);
    markBadgeNotified(pending.id);
  }, [activity.earned, showing]);

  useEffect(() => {
    if (!showing) return;
    const t = window.setTimeout(() => setShowing(null), 6000);
    return () => window.clearTimeout(t);
  }, [showing]);

  const badge = BADGES.find((b) => b.id === showing);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {badge && (
        <div className="toast">
          <BadgeIcon id={badge.id} earned />
          <div className="toast-text">
            <p className="toast-title">Badge earned · {badge.name}</p>
            <p className="toast-sub">
              {badge.description}.{' '}
              <Link to="/me" className="credit-link" onClick={() => setShowing(null)}>
                My WSOP
              </Link>
            </p>
          </div>
          <button className="toast-close" aria-label="Dismiss" onClick={() => setShowing(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
