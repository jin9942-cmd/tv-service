import { Link, useParams } from 'react-router-dom';
import { getHands, getPastFinals, getPlayer, getPlayers } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Avatar, EmptyState, Loading, SampleNote, AccessTag } from '../components/ui';
import { HandCard } from '../components/HandCard';
import { fmtUSD, ordinal } from '../lib/format';
import { lookup } from '../data/api';
import { useAuth } from '../state/gate';

export function PlayersList() {
  const { data: players, loading } = useAsync(getPlayers, []);
  if (loading || !players) return <Loading />;
  return (
    <div className="page">
      <header className="page-head">
        <h1>Players</h1>
        <p className="muted">Fictional demo profiles. Placeholder images are used instead of official photos.</p>
      </header>
      <div className="grid grid-players">
        {players.map((p) => (
          <Link key={p.id} to={`/players/${p.id}`} className="card player-card">
            <Avatar player={p} size={56} />
            <span className="player-card-text">
              <span className="card-title">{p.name}</span>
              <span className="card-meta">
                {p.country} · {p.bracelets} bracelet{p.bracelets === 1 ? '' : 's'}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PlayerProfile() {
  const { playerId = '' } = useParams();
  const { tier } = useAuth();
  const { data: player, loading } = useAsync(() => getPlayer(playerId), [playerId]);
  const { data: hands } = useAsync(() => getHands({ playerId, clipsOnly: true }), [playerId]);
  const { data: finals } = useAsync(() => getPastFinals(playerId), [playerId]);

  if (loading) return <Loading />;
  if (!player) {
    return (
      <div className="page page-narrow">
        <EmptyState title="Player not found" actions={<Link className="btn btn-primary" to="/players">All players</Link>}>
          This profile doesn’t exist in the demo dataset.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="profile-head">
        <Avatar player={player} size={96} />
        <div className="profile-text">
          <p className="muted">
            {player.country} · {player.hometown}
          </p>
          <h1 className="profile-name">{player.name}</h1>
          {player.nickname && <p className="profile-nick">“{player.nickname}”</p>}
          <p className="lead">{player.bio}</p>
        </div>
      </section>

      <dl className="facts facts-stats">
        <div className="fact">
          <dt>Bracelets</dt>
          <dd>{player.bracelets}</dd>
        </div>
        <div className="fact">
          <dt>Career earnings</dt>
          <dd>{fmtUSD(player.careerEarnings)}</dd>
        </div>
        <div className="fact">
          <dt>Final tables</dt>
          <dd>{player.finalTables}</dd>
        </div>
        <div className="fact">
          <dt>Cashes</dt>
          <dd>{player.cashes}</dd>
        </div>
      </dl>
      <SampleNote>Fictional player and sample statistics.</SampleNote>

      <section className="block">
        <h2 className="section-title">Past finals</h2>
        {!finals ? (
          <Loading />
        ) : finals.length ? (
          <ul className="finals-list">
            {finals.map((f) => {
              const b = f.broadcastId ? lookup.broadcast(f.broadcastId) : null;
              return (
                <li key={f.event.id}>
                  <Link to={`/watch/${f.event.id}${f.broadcastId ? `/${f.broadcastId}` : ''}`} state={{ select: true }} className="final-row">
                    <span className="final-year">{f.season.year}</span>
                    <span className="final-main">
                      <span className="final-name">{f.event.name}</span>
                      <span className="muted">
                        Finished {ordinal(f.place)} · {fmtUSD(f.prize)}
                      </span>
                    </span>
                    {b && <AccessTag level={b.access} tier={tier} />}
                    <span className="final-cta">▶ Replay</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No past finals yet" actions={<Link className="btn btn-secondary" to="/archive">Browse the archive</Link>}>
            {player.name} hasn’t reached a televised final table in a past season.
          </EmptyState>
        )}
      </section>

      <section className="block">
        <h2 className="section-title">Hand replays</h2>
        {!hands ? (
          <Loading />
        ) : hands.length ? (
          <div className="grid">
            {hands.map((h) => (
              <HandCard key={h.id} hand={h} />
            ))}
          </div>
        ) : (
          <EmptyState title="No hand replays featuring this player" actions={<Link className="btn btn-secondary" to="/hands">All hand replays</Link>}>
            Clips appear after a player’s key hands are reviewed.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
