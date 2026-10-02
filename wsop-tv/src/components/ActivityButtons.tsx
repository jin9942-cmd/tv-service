import { useGate } from '../state/gate';
import { setHandSaved, setPlayerFollowed, useActivity } from '../state/activity';

/** Save / unsave a hand. Guests are asked to sign in, then the save completes on the same page. */
export function SaveHandButton({ handId, compact }: { handId: string; compact?: boolean }) {
  const gate = useGate();
  const saved = !!useActivity().savedHands[handId];
  const toggle = () => {
    if (gate.tier === 'guest') {
      gate.requireSignIn({ signInFor: 'save this hand', then: () => setHandSaved(handId, true) });
      return;
    }
    setHandSaved(handId, !saved);
  };
  return (
    <button
      className={`btn ${compact ? 'btn-sm' : ''} ${saved ? 'btn-on' : 'btn-secondary'}`}
      aria-pressed={saved}
      onClick={toggle}
    >
      <BookmarkIcon filled={saved} /> {saved ? 'Saved' : 'Save hand'}
    </button>
  );
}

/** Follow / unfollow a player. State is shared everywhere through the activity store. */
export function FollowButton({ playerId, playerName, compact }: { playerId: string; playerName: string; compact?: boolean }) {
  const gate = useGate();
  const following = !!useActivity().followedPlayers[playerId];
  const toggle = () => {
    if (gate.tier === 'guest') {
      gate.requireSignIn({ signInFor: `follow ${playerName}`, then: () => setPlayerFollowed(playerId, true) });
      return;
    }
    setPlayerFollowed(playerId, !following);
  };
  return (
    <button
      className={`btn ${compact ? 'btn-sm' : ''} ${following ? 'btn-on' : 'btn-primary'}`}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${playerName}` : `Follow ${playerName}`}
      onClick={toggle}
    >
      {following ? '✓ Following' : '+ Follow'}
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M6 3h12v18l-6-4-6 4z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
