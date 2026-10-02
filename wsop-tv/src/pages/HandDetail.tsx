import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { frameFor, getHand, getHands, getVideoSource, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { VideoPlayer } from '../components/VideoPlayer';
import { HandCard } from '../components/HandCard';
import { Avatar, EmptyState, FootageNote, Loading, SampleNote, StatusBadge } from '../components/ui';
import { LockIcon, useAuth, useGate } from '../state/gate';
import { ACCESS_LABEL, TIER_LABEL, checkAccess } from '../config/entitlements';
import { fmtChips } from '../lib/format';
import { NotFound } from './NotFound';
import { SaveHandButton } from '../components/ActivityButtons';
import { GlossaryText, GlossaryToggle } from '../components/Glossary';
import { track } from '../lib/analytics';

export function HandDetail() {
  const { handId = '' } = useParams();
  const { data: hand, loading } = useAsync(() => getHand(handId), [handId]);
  const { data: allClips } = useAsync(() => getHands({ clipsOnly: true }), []);
  const { tier } = useAuth();
  const gate = useGate();
  const location = useLocation();
  const autoOpened = useRef<string | null>(null);

  const access = hand?.clip ? checkAccess(tier, hand.clip.access) : null;
  const selected = (location.state as { select?: boolean } | null)?.select;
  const title = hand?.title ?? '';
  useEffect(() => {
    if (hand?.clip && selected && access && access.kind !== 'ok' && autoOpened.current !== hand.id) {
      autoOpened.current = hand.id;
      gate.open({ level: hand.clip.access, contentTitle: hand.title });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand?.id, selected, access?.kind]);

  if (loading) return <Loading />;
  if (!hand) return <NotFound what="hand replay" />;

  const event = lookup.event(hand.eventId);
  const season = event ? lookup.season(event.seasonId) : null;
  const broadcast = lookup.broadcast(hand.broadcastId);
  const winner = lookup.player(hand.winnerId);
  const source = hand.clip ? getVideoSource(hand.clip.sourceId) : null;
  const backUrl = `/watch/${hand.eventId}/${hand.broadcastId}`;
  const related = (allClips ?? []).filter((h) => h.id !== hand.id && h.eventId === hand.eventId);
  const more = related.length ? related : (allClips ?? []).filter((h) => h.id !== hand.id).slice(0, 4);

  let blocked = null;
  if (!hand.clip) {
    blocked = (
      <div className="state-overlay">
        <p className="overlay-title">No replay clip for this hand yet</p>
        <div className="overlay-text">
          The hand record is available below.
          <div className="overlay-actions">
            <Link className="btn btn-secondary btn-sm" to={backUrl}>
              Back to broadcast
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/hands">
              Other hands
            </Link>
          </div>
        </div>
      </div>
    );
  } else if (access && access.kind !== 'ok') {
    blocked = (
      <div className="state-overlay">
        <p className="overlay-title">
          <LockIcon /> {access.kind === 'login' ? 'Sign in to watch this hand' : `${TIER_LABEL[access.required]} plan required`}
        </p>
        <div className="overlay-text">
          {ACCESS_LABEL[hand.clip.access]}
          <div className="overlay-actions">
            <button className="btn btn-primary" onClick={() => gate.open({ level: hand.clip!.access, contentTitle: title })}>
              {access.kind === 'login' ? 'Sign in (demo)' : `Upgrade to ${TIER_LABEL[access.required]}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="backbar">
        {broadcast?.status === 'live' ? (
          <Link
            to={backUrl}
            className="btn btn-sm back-btn is-live"
            onClick={() => track('return_to_live_clicked', { from: 'hand', hand: hand.id })}
          >
            ↩ Return to live
          </Link>
        ) : (
          <Link to={backUrl} className="btn btn-ghost btn-sm back-btn">
            ← Back to original broadcast
          </Link>
        )}
        <span className="muted backbar-ctx">
          {season?.year} {event?.shortName} · {broadcast?.title}
          {broadcast && <StatusBadge status={broadcast.status} small />}
        </span>
      </div>

      <div className="watch-grid">
        <section className="watch-main">
          <VideoPlayer
            key={hand.id}
            source={source}
            mode="clip"
            clip={hand.clip ? { start: hand.clip.startSec, duration: hand.clip.durationSec } : undefined}
            blocked={blocked}
            label={hand.title}
            poster={frameFor(hand.clip?.sourceId, hand.clip?.startSec)}
            progress={{
              key: `hand:${hand.id}`,
              title: hand.title,
              subtitle: 'Hand replay',
              url: `/hands/${hand.id}`,
              image: frameFor(hand.clip?.sourceId, hand.clip?.startSec),
            }}
            endSlot={
              <>
                <p className="overlay-title">Hand complete</p>
                <div className="overlay-actions">
                  <Link
                    className="btn btn-primary"
                    to={backUrl}
                    onClick={() => broadcast?.status === 'live' && track('return_to_live_clicked', { from: 'clip-end', hand: hand.id })}
                  >
                    {broadcast?.status === 'live' ? '↩ Return to live' : 'Back to broadcast'}
                  </Link>
                  {more[0] && (
                    <Link className="btn btn-secondary" to={`/hands/${more[0].id}`} state={{ select: true }}>
                      Next hand
                    </Link>
                  )}
                </div>
              </>
            }
          />
          {source && !blocked && <FootageNote source={source} />}

          <div className="watch-head">
            <p className="watch-crumbs">
              <Link to={event ? `/watch/${event.id}` : '/watch'}>
                {season?.year} · Event #{event?.number} {event?.shortName}
              </Link>{' '}
              · Hand #{hand.handNumber} · {hand.level}
            </p>
            <h1 className="watch-title">{hand.title}</h1>
            <div className="hand-actions">
              {hand.clip && <SaveHandButton handId={hand.id} />}
              <GlossaryToggle compact />
            </div>
            <p className="lead">
              <GlossaryText>{hand.description}</GlossaryText>
            </p>
          </div>

          <section className="block">
            <h2 className="panel-title">Players in this hand</h2>
            <ul className="chip-players">
              {hand.playerIds.map((id) => {
                const p = lookup.player(id);
                if (!p) return null;
                return (
                  <li key={id}>
                    <Link to={`/players/${id}`} className="player-pill">
                      <Avatar player={p} size={36} />
                      <span className="player-pill-text">
                        <span className="player-pill-name">{p.name}</span>
                        <span className="muted">{id === hand.winnerId ? 'Won the pot' : p.country}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="block">
            <h2 className="panel-title">Hand history</h2>
            <ol className="streets">
              {hand.streets.map((s, i) => (
                <li key={i} className="street">
                  <span className="street-name">{s.street}</span>
                  <span className="street-body">
                    {s.board && <span className="board">{s.board}</span>}
                    <span>
                      <GlossaryText>{s.text}</GlossaryText>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="muted">
              Pot {fmtChips(hand.pot)} · Winner {winner?.name}
            </p>
            <SampleNote>Fictional hand for demo purposes.</SampleNote>
          </section>
        </section>

        <aside className="watch-aside">
          <section className="aside-block">
            <h2 className="aside-title">{related.length ? 'More from this event' : 'More hand replays'}</h2>
            {more.length ? (
              <div className="stack">
                {more.map((h) => (
                  <HandCard key={h.id} hand={h} compact />
                ))}
              </div>
            ) : (
              <EmptyState title="No other hands" />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
