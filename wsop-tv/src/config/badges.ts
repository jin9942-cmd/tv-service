// DEMO ASSUMPTION: activity badges. Conditions can be changed here without touching UI code.
// Badges record viewing activity only. They are independent of WSOP+ subscription plans, never unlock
// content, and are not a measure of poker skill or any official status. No points, rewards or rankings.

export type BadgeRule =
  | { kind: 'watch-total'; seconds: number }
  | { kind: 'saved-hands'; count: number }
  | { kind: 'final-videos'; count: number; secondsEach: number }
  | { kind: 'followed-players'; count: number };

export interface BadgeDef {
  id: string;
  name: string;
  /** Short, neutral description of the activity (not a skill claim). */
  description: string;
  rule: BadgeRule;
  /** Where the empty state sends people to start this activity. */
  start: { label: string; to: string };
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first-table',
    name: 'First Table',
    description: 'Watched tournament broadcasts for 60 seconds',
    rule: { kind: 'watch-total', seconds: 60 },
    start: { label: 'Watch a broadcast', to: '/watch' },
  },
  {
    id: 'hand-collector',
    name: 'Hand Collector',
    description: 'Saved 3 different hands',
    rule: { kind: 'saved-hands', count: 3 },
    start: { label: 'Browse hand replays', to: '/hands' },
  },
  {
    id: 'final-fan',
    name: 'Final Fan',
    description: 'Watched 2 different final-table videos for 60 seconds each',
    rule: { kind: 'final-videos', count: 2, secondsEach: 60 },
    start: { label: 'Open a past final', to: '/archive' },
  },
  {
    id: 'player-follower',
    name: 'Player Follower',
    description: 'Followed 2 different players',
    rule: { kind: 'followed-players', count: 2 },
    start: { label: 'Find players', to: '/players' },
  },
];

/** How many seconds of real playback count per tick at most (guards against clock jumps). */
export const MAX_SECONDS_PER_TICK = 1.5;
