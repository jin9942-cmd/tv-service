import { createContext, useContext, type ReactNode } from 'react';
import type { AppRoute, AppTab, HomeSection, Member, Tier } from '../data/types';
import type { Mode } from '../state/store';
import type { DisplayTz } from '../lib/time';

// ---- environment (lets the CMS preview render the same app with overrides) ----

export interface AppEnv {
  member: Member;
  mode: Mode;
  layout: HomeSection[];
  tz: DisplayTz;
  notes: boolean;
  /** CMS preview: read-only, no navigation side effects. */
  preview: boolean;
  route: AppRoute;
  push: (r: AppRoute) => void;
  /** Swap the current screen (e.g. switching channel) without growing the back stack. */
  replace: (r: AppRoute) => void;
  back: () => void;
  goTab: (t: AppTab) => void;
  sheet: (s: SheetKind) => void;
  scrollRoot: () => HTMLElement | null;
}

export type SheetKind = null | { kind: 'login'; reason: string; then?: () => void } | { kind: 'paywall'; tier: Tier; title: string };

export const Env = createContext<AppEnv>(null as unknown as AppEnv);
export const useEnv = () => useContext(Env);

// ---- badges ----------------------------------------------------------------

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`tier tier-${tier}`}>
      {tier === 'free' ? 'Free' : tier === 'basic' ? 'Basic' : 'Premium'}
    </span>
  );
}

export function LiveBadge({ small }: { small?: boolean }) {
  return (
    <span className={`live ${small ? 'live-sm' : ''}`}>
      <i /> LIVE
    </span>
  );
}

export function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z" />
    </svg>
  );
}

// ---- placeholder art: the broadcast table set seen from above (no casino props) ----

/** Felt colours by hue band; classic green by default. */
const feltHue = (hue: number) => {
  const h = ((hue % 360) + 360) % 360;
  if (h < 60 || h > 330) return 355;
  if (h >= 250) return 275;
  if (h >= 210) return 205;
  return 150;
};

export function Art({ hue, title, sub, ratio = '16/9', children, className = '' }: { hue: number; title?: string; sub?: string; ratio?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`art ${className}`} style={{ aspectRatio: ratio, ['--felt' as string]: feltHue(hue) }}>
      <span className="felt" aria-hidden="true">
        <span className="felt-line" />
      </span>
      {(title || sub) && (
        <span className="art-text">
          {title && <b>{title}</b>}
          {sub && <small>{sub}</small>}
        </span>
      )}
      {children}
    </div>
  );
}

// ---- player avatar: initials with a gold ring (bracelet / trophy cue) ----

export function ProfileAvatar({ name, hue, size = 64 }: { name: string; hue: number; size?: number }) {
  const ini = name
    .split(/[s-]+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
  return (
    <span className="p-avatar" style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${hue} 50% 18%))` }}>
      {ini}
    </span>
  );
}

// ---- planning note bubble -----------------------------------------------------

export function Note({ children, side = 'right' }: { children: ReactNode; side?: 'right' | 'left' | 'inline' }) {
  const { notes } = useEnv();
  if (!notes) return null;
  return (
    <span className={`note note-${side}`} role="note">
      <span className="note-dot">기획</span>
      {children}
    </span>
  );
}

// ---- section header ------------------------------------------------------------

export function SectionHead({ title, action, onAction, note }: { title: ReactNode; action?: string; onAction?: () => void; note?: ReactNode }) {
  return (
    <>
      <div className="sec-head">
        <h2>{title}</h2>
        {action && (
          <button className="sec-more" onClick={onAction}>
            {action} <Icon name="chevron" size={14} />
          </button>
        )}
      </div>
      {note && <Note>{note}</Note>}
    </>
  );
}

// ---- icons -----------------------------------------------------------------

const PATHS: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  bell: 'M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0z',
  bellOn: 'M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0zM18 3l1.5 1.5M6 3 4.5 4.5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0z',
  home: 'M3 11 12 4l9 7v9h-6v-6H9v6H3z',
  calendar: 'M7 3v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2v2H9V3zM5 10h14v9H5z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  trophy: 'M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v2H8v-2h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z',
  back: 'M15 5 8 12l7 7',
  chevron: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  pip: 'M3 5h18v14H3zM12 12h7v5h-7z',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4-2 .6a7 7 0 0 1-.7 1.7l1 1.8-2 2-1.8-1a7 7 0 0 1-1.7.7L13 21h-2l-.6-2a7 7 0 0 1-1.7-.7l-1.8 1-2-2 1-1.8a7 7 0 0 1-.7-1.7L3 13v-2l2-.6a7 7 0 0 1 .7-1.7l-1-1.8 2-2 1.8 1A7 7 0 0 1 10.2 5L11 3h2l.6 2a7 7 0 0 1 1.7.7l1.8-1 2 2-1 1.8a7 7 0 0 1 .7 1.7L21 11z',
  eye: 'M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
};

const STROKE = new Set(['back', 'chevron', 'close', 'full', 'pip', 'bellOn', 'film']);

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS | string; size?: number }) {
  const stroke = STROKE.has(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={PATHS[name]}
        fill={stroke ? 'none' : 'currentColor'}
        stroke={stroke ? 'currentColor' : 'none'}
        strokeWidth={stroke ? 2 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
