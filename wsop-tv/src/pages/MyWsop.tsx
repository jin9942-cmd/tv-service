// My WSOP: the signed-in viewer's own page (not a player profile).
import { Link } from 'react-router-dom';
import { useAuth, useGate } from '../state/gate';
import { badgeProgress, useActivity } from '../state/activity';
import { lookup } from '../data/api';
import { ContinueWatching } from '../components/ContinueWatching';
import { HandCard } from '../components/HandCard';
import { Avatar, EmptyState } from '../components/ui';
import { FollowButton, SaveHandButton } from '../components/ActivityButtons';
import { BadgeCard, nextBadge } from '../components/Badges';
import { GlossaryToggle } from '../components/Glossary';
import { TIER_LABEL } from '../config/entitlements';
import { progressStore, useStore } from '../state/stores';

export function MyWsop() {
  const auth = useAuth();
  const gate = useGate();
  const activity = useActivity();
  const progress = useStore(progressStore);

  if (auth.tier === 'guest') {
    return (
      <div className="page page-narrow">
        <header className="page-head">
          <h1>My WSOP</h1>
        </header>
        <EmptyState
          title="Sign in to see your WSOP"
          actions={
            <>
              <button className="btn btn-primary" onClick={() => gate.requireSignIn({ signInFor: 'open My WSOP' })}>
                Continue with GGPass (demo)
              </button>
              <Link to="/watch" className="btn btn-secondary">
                Watch live
              </Link>
            </>
          }
        >
          Continue watching, saved hands, followed players and activity badges live here.
        </EmptyState>
        <section className="block">
          <h2 className="section-title">Settings</h2>
          <GlossarySetting />
        </section>
      </div>
    );
  }

  const saved = Object.entries(activity.savedHands)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => lookup.hand(id))
    .filter((h): h is NonNullable<typeof h> => !!h);
  const followed = Object.entries(activity.followedPlayers)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => lookup.player(id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const badges = badgeProgress(activity);
  const earnedCount = badges.filter((b) => b.earnedAt).length;
  const next = nextBadge(badges);
  const plan = auth.tier === 'free' ? 'No subscription' : `${TIER_LABEL[auth.tier]} (demo)`;

  return (
    <div className="page">
      <header className="me-head">
        <div className="me-id">
          <Avatar player={{ name: auth.displayName ?? 'Demo Viewer', color: '#3a3f4b' }} size={56} />
          <div>
            <h1 className="me-name">My WSOP</h1>
            <p className="muted">{auth.displayName} · signed in with GGPass (demo)</p>
          </div>
        </div>
        <dl className="me-stats">
          <div>
            <dt>WSOP+ plan</dt>
            <dd>{plan}</dd>
          </div>
          <div>
            <dt>Saved hands</dt>
            <dd>{saved.length}</dd>
          </div>
          <div>
            <dt>Following</dt>
            <dd>{followed.length}</dd>
          </div>
          <div>
            <dt>Badges</dt>
            <dd>
              {earnedCount} / {badges.length}
            </dd>
          </div>
        </dl>
      </header>

      <div className="me-grid">
        <div className="me-main">
          {Object.keys(progress).length > 0 ? (
            <ContinueWatching />
          ) : (
            <section className="block">
              <h2 className="section-title">Continue watching</h2>
              <EmptyState title="Nothing in progress" actions={<Link to="/archive" className="btn btn-secondary">Browse replays</Link>}>
                Replays and hand clips you stop part-way through appear here.
              </EmptyState>
            </section>
          )}

          <section className="block">
            <h2 className="section-title">Saved hands</h2>
            {saved.length ? (
              <div className="grid">
                {saved.map((h) => (
                  <div key={h.id} className="saved-item">
                    <HandCard hand={h} />
                    <SaveHandButton handId={h.id} compact />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No saved hands yet" actions={<Link to="/hands" className="btn btn-primary">Browse hand replays</Link>}>
                Use “Save hand” on any hand replay to keep it here.
              </EmptyState>
            )}
          </section>

          <section className="block">
            <h2 className="section-title">Following</h2>
            {followed.length ? (
              <ul className="follow-list">
                {followed.map((p) => (
                  <li key={p.id} className="follow-row">
                    <Link to={`/players/${p.id}`} className="follow-link">
                      <Avatar player={p} size={44} />
                      <span className="follow-text">
                        <span className="card-title">{p.name}</span>
                        <span className="card-meta">{p.country}</span>
                      </span>
                    </Link>
                    <FollowButton playerId={p.id} playerName={p.name} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Not following anyone yet" actions={<Link to="/players" className="btn btn-primary">Find players</Link>}>
                Follow players from their profile to find them quickly.
              </EmptyState>
            )}
          </section>
        </div>

        <aside className="me-aside">
          <section className="block me-badges">
            <h2 className="section-title">Activity badges</h2>
            <p className="muted small">
              Badges record what you’ve watched and saved in this demo. They aren’t a skill rating, don’t depend on your WSOP+ plan and
              don’t unlock content.
            </p>
            {next && (
              <p className="next-badge">
                Next: <strong>{next.badge.name}</strong> — {next.badge.description.toLowerCase()}
              </p>
            )}
            <ul className="badge-list">
              {badges.map((p) => (
                <BadgeCard key={p.badge.id} p={p} />
              ))}
            </ul>
          </section>

          <section className="block">
            <h2 className="section-title">Settings</h2>
            <GlossarySetting />
          </section>
        </aside>
      </div>
    </div>
  );
}

function GlossarySetting() {
  return (
    <div className="setting-row">
      <div>
        <p className="setting-title">Poker terms help</p>
        <p className="muted small">Tap highlighted terms such as BB, Stack or Bubble for a short explanation. Off by default.</p>
      </div>
      <GlossaryToggle />
    </div>
  );
}
