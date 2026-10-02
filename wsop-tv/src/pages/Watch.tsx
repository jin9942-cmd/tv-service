import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  getBroadcastsForEvent,
  getBroadcastsSharingSource,
  getEvent,
  getHands,
  getLiveEvents,
  getPlayersByIds,
  getTickerEvents,
  getVideoSource,
  frameFor,
  streamTime,
  lookup,
} from '../data/api';
import type { Broadcast, HandRecord, Player, TournamentEvent } from '../data/types';
import { useAsync } from '../lib/useAsync';
import { Ticker } from '../components/Ticker';
import { VideoPlayer } from '../components/VideoPlayer';
import { AccessTag, EmptyState, FootageNote, Loading, PlayerLink, SampleNote, StatusBadge, Avatar } from '../components/ui';
import { HandCard } from '../components/HandCard';
import { LockIcon, useAuth, useGate } from '../state/gate';
import { ACCESS_LABEL, TIER_LABEL, checkAccess, minimumTier } from '../config/entitlements';
import { fmtChips, fmtCompact, fmtUSD, ordinal } from '../lib/format';
import { formatEventDate, formatEventTime, formatLocalTime, relativeFromNow } from '../lib/time';
import { NotFound } from './NotFound';
import { GlossaryText, GlossaryToggle } from '../components/Glossary';

/** /watch → first live event, or the "no live" state. */
export function WatchIndex() {
  const { data: live, loading } = useAsync(getLiveEvents, []);
  const { data: ticker } = useAsync(getTickerEvents, []);
  if (loading || !live) return <Loading />;
  if (live.length) return <Navigate to={`/watch/${live[0].id}`} replace />;
  const next = ticker?.find((e) => e.status === 'upcoming' && e.hasBroadcast);
  return (
    <div className="page">
      <Ticker />
      <EmptyState
        title="No live tournaments right now"
        actions={
          <>
            {next && (
              <Link className="btn btn-primary" to={`/watch/${next.id}`}>
                Next: {next.shortName}
              </Link>
            )}
            <Link className="btn btn-secondary" to="/schedule">
              Full schedule
            </Link>
            <Link className="btn btn-secondary" to="/archive">
              Watch replays
            </Link>
            <Link className="btn btn-secondary" to="/hands">
              Hand replays
            </Link>
          </>
        }
      >
        {next ? (
          <>
            Next broadcast: <strong>{next.name}</strong> — {formatEventDate(next.startAt)}, {formatEventTime(next.startAt)} (
            {formatLocalTime(next.startAt)} your time).
          </>
        ) : (
          'No broadcasts are scheduled. Browse past finals in the archive.'
        )}
      </EmptyState>
    </div>
  );
}

type Tab = 'overview' | 'players' | 'hands';

export function WatchPage() {
  const { eventId = '', broadcastId } = useParams();
  const ev = useAsync(() => getEvent(eventId), [eventId]);
  const bcs = useAsync(() => getBroadcastsForEvent(eventId), [eventId]);
  const hands = useAsync(() => getHands({ eventId }), [eventId]);

  if (ev.loading || bcs.loading || hands.loading) {
    return (
      <div className="page">
        <Ticker currentEventId={eventId} />
        <Loading label="Loading broadcast…" />
      </div>
    );
  }
  const event = ev.data;
  if (!event || event.id !== eventId) return <NotFound what="tournament" />;
  const broadcasts = bcs.data ?? [];
  const broadcast = broadcastId
    ? broadcasts.find((b) => b.id === broadcastId)
    : broadcasts.find((b) => b.id === event.defaultBroadcastId) ?? broadcasts[0];
  if (broadcastId && !broadcast) return <NotFound what="broadcast" />;

  return <WatchView key={broadcast?.id ?? event.id} event={event} broadcasts={broadcasts} broadcast={broadcast} hands={hands.data ?? []} />;
}

function WatchView({
  event,
  broadcasts,
  broadcast,
  hands,
}: {
  event: TournamentEvent;
  broadcasts: Broadcast[];
  broadcast: Broadcast | undefined;
  hands: HandRecord[];
}) {
  const { tier } = useAuth();
  const gate = useGate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = (['overview', 'players', 'hands'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  const season = lookup.season(event.seasonId);
  const isReplay = broadcast?.status === 'replay';

  const playerIds = [
    ...(event.leaderboard ?? []).map((l) => l.playerId),
    ...(event.results ?? []).map((r) => r.playerId),
    ...(broadcast?.seats ?? []).map((s) => s.playerId),
  ];
  const players = useAsync(() => getPlayersByIds(playerIds), [event.id, broadcast?.id]);

  const playable = broadcast && (broadcast.status === 'live' || broadcast.status === 'replay');
  const access = broadcast ? checkAccess(tier, broadcast.access) : { kind: 'ok' as const };
  const contentTitle = broadcast ? `${season?.year} ${event.shortName} — ${broadcast.title}` : event.name;
  const openGate = () => broadcast && gate.open({ level: broadcast.access, contentTitle });

  // Auto-open the permission modal only when the user actively selected this content (not on direct URL loads).
  const autoOpened = useRef(false);
  const selected = (location.state as { select?: boolean } | null)?.select;
  useEffect(() => {
    if (selected && playable && access.kind !== 'ok' && !autoOpened.current) {
      autoOpened.current = true;
      openGate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, playable, access.kind]);

  const source = broadcast ? getVideoSource(broadcast.sourceId) : null;
  const sharing = broadcast && playable ? getBroadcastsSharingSource(broadcast) : [];

  let blocked: ReactNode = null;
  if (!broadcast) {
    blocked = (
      <StateOverlay title={event.hasBroadcast ? 'No stream available' : 'No broadcast planned'}>
        {event.hasBroadcast ? 'This tournament has no stream yet.' : `${event.dayLabel} of this event is not broadcast. Coverage may start at a later day.`}
        <OverlayLinks />
      </StateOverlay>
    );
  } else if (broadcast.status === 'scheduled') {
    blocked = (
      <StateOverlay title={`Starts ${relativeFromNow(broadcast.startAt)}`}>
        {formatEventDate(broadcast.startAt)} · {formatEventTime(broadcast.startAt)} ({formatLocalTime(broadcast.startAt)} your time)
        <OverlayLinks />
      </StateOverlay>
    );
  } else if (broadcast.status === 'late-start') {
    blocked = (
      <StateOverlay title="Stream starting late" tone="warn">
        {broadcast.statusNote} New start: {formatEventTime(broadcast.startAt)} ({formatLocalTime(broadcast.startAt)} your time).
        <OverlayLinks event={event} />
      </StateOverlay>
    );
  } else if (broadcast.status === 'interrupted') {
    blocked = (
      <StateOverlay title="Broadcast interrupted" tone="warn">
        {broadcast.statusNote}
        <OverlayLinks event={event} />
      </StateOverlay>
    );
  } else if (broadcast.status === 'ended') {
    blocked = (
      <StateOverlay title="This broadcast has ended">
        {broadcast.statusNote}
        <OverlayLinks event={event} />
      </StateOverlay>
    );
  } else if (access.kind !== 'ok') {
    blocked = (
      <StateOverlay title={access.kind === 'login' ? 'Sign in to watch' : `${TIER_LABEL[access.required]} plan required`} lock>
        {ACCESS_LABEL[broadcast.access]} · available on {TIER_LABEL[minimumTier(broadcast.access)]} and above.
        <div className="overlay-actions">
          <button className="btn btn-primary" onClick={openGate}>
            {access.kind === 'login' ? 'Sign in (demo)' : `Upgrade to ${TIER_LABEL[access.required]}`}
          </button>
        </div>
      </StateOverlay>
    );
  }

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === 'overview') next.delete('tab');
    else next.set('tab', t);
    setParams(next, { replace: true, state: location.state });
  };

  const tabHands = broadcast ? hands.filter((h) => h.broadcastId === broadcast.id) : hands;
  const clips = hands.filter((h) => h.clip);

  return (
    <div className="page watch-page">
      <Ticker currentEventId={event.id} />

      <div className="watch-grid">
        <section className="watch-main" aria-label="Player">
          <VideoPlayer
            source={source}
            mode={isReplay ? 'vod' : 'live'}
            delayMinutes={broadcast?.delayMinutes}
            liveStartAt={broadcast?.startAt}
            blocked={blocked}
            label={contentTitle}
            poster={frameFor(broadcast?.sourceId)}
            activity={broadcast && playable ? { broadcastId: broadcast.id, isFinal: broadcast.title === 'Final Table' } : undefined}
            progress={
              isReplay && broadcast
                ? {
                    key: `bc:${broadcast.id}`,
                    title: contentTitle,
                    subtitle: 'Replay',
                    url: `/watch/${event.id}/${broadcast.id}`,
                    image: frameFor(broadcast.sourceId),
                  }
                : undefined
            }
          />
          {source && playable && !blocked && (
            <>
              <FootageNote source={source} />
              {sharing.length > 0 && (
                <SampleNote>
                  Same footage is also used by: {sharing.map((s) => `${lookup.event(s.eventId)?.shortName} · ${s.title}`).join(', ')}.
                </SampleNote>
              )}
            </>
          )}

          <div className="watch-head">
            <div className="watch-badges">
              {broadcast && !isReplay && <StatusBadge status={broadcast.status} delay={broadcast.delayMinutes} />}
              {isReplay && <span className="replay-flag">Replay · {season?.year}</span>}
              <span className="watch-crumbs">
                {season?.name} · Event #{event.number} · {event.dayLabel}
                {broadcast && broadcast.table !== event.dayLabel && ` · ${broadcast.table}`}
              </span>
            </div>
            <h1 className="watch-title">{event.name}</h1>
            {broadcast?.status === 'live' && (
              <DelayNote broadcast={broadcast} />
            )}
          </div>

          {broadcasts.length > 1 && (
            <div className="only-mobile">
              <StreamSelector event={event} broadcasts={broadcasts} current={broadcast} />
            </div>
          )}

          <div className="tabs" role="tablist" aria-label="Broadcast details">
            {(
              [
                ['overview', 'Overview'],
                ['players', 'Players'],
                ['hands', 'Hand History'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                className={`tab ${tab === id ? 'is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
                {id === 'hands' && tabHands.length > 0 && <span className="tab-count">{tabHands.length}</span>}
              </button>
            ))}
          </div>
          <div className="tab-tools">
            <GlossaryToggle compact />
          </div>
          <div className="tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'overview' && <Overview event={event} broadcast={broadcast} />}
            {tab === 'players' && <PlayersTab event={event} broadcast={broadcast} players={players.data} />}
            {tab === 'hands' && (
              <HandHistory hands={tabHands} players={players.data} event={event} delayMinutes={broadcast?.status === 'live' ? broadcast.delayMinutes : undefined} />
            )}
          </div>
        </section>

        <aside className="watch-aside">
          {broadcasts.length > 1 && (
            <div className="only-desktop">
              <StreamSelector event={event} broadcasts={broadcasts} current={broadcast} />
            </div>
          )}
          <section className="aside-block">
            <h2 className="aside-title">Hand replays from this event</h2>
            {clips.length ? (
              <div className="stack">
                {clips.map((h) => (
                  <HandCard key={h.id} hand={h} compact />
                ))}
              </div>
            ) : (
              <EmptyState title="No hand replays yet" actions={<Link className="btn btn-secondary" to="/hands">Browse all hands</Link>}>
                Clips are added after key hands are reviewed.
              </EmptyState>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Explains the broadcast delay and shows what time the stream is currently at. */
function DelayNote({ broadcast }: { broadcast: Broadcast }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const d = broadcast.delayMinutes ?? 0;
  if (!d) return <p className="watch-sub">Simulated live stream from recorded footage.</p>;
  const at = streamTime(broadcast.id, now).toISOString();
  return (
    <p className="watch-sub">
      <strong>{d}-minute broadcast delay.</strong> The stream is showing play from about {formatEventTime(at)} (
      {formatLocalTime(at)} your time); the tournament floor is {d} minutes ahead. Chip counts and hands below follow the stream.
      Simulated with recorded footage.
    </p>
  );
}

function StateOverlay({ title, tone, lock, children }: { title: string; tone?: 'warn'; lock?: boolean; children: ReactNode }) {
  return (
    <div className={`state-overlay ${tone === 'warn' ? 'is-warn' : ''}`}>
      <p className="overlay-title">
        {lock && <LockIcon />} {title}
      </p>
      <div className="overlay-text">{children}</div>
    </div>
  );
}

function OverlayLinks({ event }: { event?: TournamentEvent }) {
  return (
    <div className="overlay-actions">
      {event && event.defaultBroadcastId && (
        <Link className="btn btn-secondary btn-sm" to={`/watch/${event.id}`} state={{ select: true }}>
          Main table
        </Link>
      )}
      <Link className="btn btn-secondary btn-sm" to="/schedule">
        Schedule
      </Link>
      <Link className="btn btn-secondary btn-sm" to="/archive">
        Archive
      </Link>
    </div>
  );
}

function StreamSelector({ event, broadcasts, current }: { event: TournamentEvent; broadcasts: Broadcast[]; current?: Broadcast }) {
  const { tier } = useAuth();
  return (
    <section className="aside-block">
      <h2 className="aside-title">
        {event.status === 'ended' && broadcasts.some((b) => b.status === 'replay') ? 'Videos' : 'Streams'} · {broadcasts.length}
      </h2>
      <div className="stream-list" role="list">
        {broadcasts.map((b) => {
          const selected = b.id === current?.id;
          const sharing = getBroadcastsSharingSource(b);
          return (
            <Link
              role="listitem"
              key={b.id}
              to={`/watch/${event.id}/${b.id}`}
              state={{ select: true }}
              className={`stream-card ${selected ? 'is-selected' : ''}`}
              aria-current={selected ? 'true' : undefined}
            >
              <span className="stream-top">
                <StatusBadge status={b.status} small delay={b.delayMinutes} />
                <AccessTag level={b.access} tier={tier} />
              </span>
              <span className="stream-title">{b.title}</span>
              <span className="stream-meta">
                {b.kind === 'main' ? 'Main stream' : 'Additional'} · {b.seats.length ? `${b.seats.length} featured players` : b.table}
              </span>
              {sharing.length > 0 && <span className="stream-note">Same footage as {sharing.map((s) => lookup.event(s.eventId)?.shortName + ' · ' + s.title).join(', ')}</span>}
              {selected && <span className="stream-now">Now watching</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Overview({ event, broadcast }: { event: TournamentEvent; broadcast?: Broadcast }) {
  const champion = event.results?.find((r) => r.place === 1);
  const champ = champion ? lookup.player(champion.playerId) : null;
  return (
    <div>
      <p className="lead">
        <GlossaryText>{event.description}</GlossaryText>
      </p>
      <dl className="facts">
        <Fact label="Buy-in" value={fmtUSD(event.buyIn)} />
        {event.entries && <Fact label="Entries" value={fmtChips(event.entries)} />}
        {event.prizePool && <Fact label="Prize pool" value={fmtUSD(event.prizePool)} />}
        {event.playersLeft !== undefined && event.status === 'live' && <Fact label="Players left" value={event.playersLeft} />}
        {event.level && event.status === 'live' && <Fact label="Level" value={<GlossaryText>{event.level}</GlossaryText>} />}
        {event.blinds && event.status === 'live' && <Fact label="Blinds" value={<GlossaryText>{event.blinds}</GlossaryText>} />}
        {champ && <Fact label="Champion" value={<PlayerLink player={champ} />} />}
        <Fact
          label={event.status === 'upcoming' ? 'Starts' : 'Started'}
          value={
            <>
              {formatEventDate(event.startAt)}, {formatEventTime(event.startAt)}
              <span className="muted"> · {formatLocalTime(event.startAt)} your time</span>
            </>
          }
        />
        {broadcast?.status === 'live' && broadcast.delayMinutes ? (
          <Fact label="Broadcast delay" value={<GlossaryText>{`${broadcast.delayMinutes}-minute delay`}</GlossaryText>} />
        ) : null}
        <Fact label="Venue" value={event.venue} />
      </dl>
      <SampleNote>Tournament figures are sample data, not an EBS / live-reporting feed.</SampleNote>
    </div>
  );
}

function PlayersTab({ event, broadcast, players }: { event: TournamentEvent; broadcast?: Broadcast; players?: Record<string, Player> }) {
  if (!players) return <Loading />;
  const seatIds = new Set(broadcast?.seats.map((s) => s.playerId));

  if (event.results?.length) {
    return (
      <div>
        <h3 className="panel-title">Final results</h3>
        <ol className="rank-list">
          {event.results.map((r) => {
            const p = players[r.playerId];
            const seat = broadcast?.seats.find((s) => s.playerId === r.playerId);
            return (
              <li key={r.playerId} className="rank-row">
                <span className="rank">{ordinal(r.place)}</span>
                {p && <Avatar player={p} size={36} />}
                <span className="rank-name">
                  <PlayerLink player={p} />
                  {seat && <span className="muted rank-sub">Started FT with {fmtCompact(seat.chips)}</span>}
                </span>
                <span className="rank-chips">{fmtUSD(r.prize)}</span>
              </li>
            );
          })}
        </ol>
        <SampleNote>Results are fictional sample data.</SampleNote>
      </div>
    );
  }

  const board = event.leaderboard ?? [];
  if (!board.length) {
    return <EmptyState title="No chip counts yet">Chip counts appear once play begins.</EmptyState>;
  }
  return (
    <div>
      <h3 className="panel-title">Chip counts{event.playersLeft ? ` · top of ${event.playersLeft} remaining` : ''}</h3>
      {broadcast?.delayMinutes ? (
        <p className="muted small sync-note">As of stream time ({broadcast.delayMinutes}-min delay) — counts never run ahead of the broadcast.</p>
      ) : null}
      <ol className="rank-list">
        {board.map((l, i) => {
          const p = players[l.playerId];
          return (
            <li key={l.playerId} className="rank-row">
              <span className="rank">{i + 1}</span>
              {p && <Avatar player={p} size={36} />}
              <span className="rank-name">
                <PlayerLink player={p} />
                <span className="muted rank-sub">
                  {p?.countryCode}
                  {seatIds.has(l.playerId) && <span className="at-table"> · On this stream</span>}
                </span>
              </span>
              <span className="rank-chips">
                <span className="chips-full">{fmtChips(l.chips)}</span>
                <span className="chips-compact">{fmtCompact(l.chips)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <SampleNote>Chip counts are sample data, not live from EBS.</SampleNote>
    </div>
  );
}

function HandHistory({
  hands,
  players,
  event,
  delayMinutes,
}: {
  hands: HandRecord[];
  players?: Record<string, Player>;
  event: TournamentEvent;
  delayMinutes?: number;
}) {
  if (!hands.length) {
    return (
      <EmptyState
        title="No hands recorded for this stream"
        actions={
          <>
            <Link className="btn btn-secondary" to="/hands">
              Browse hand replays
            </Link>
            {event.defaultBroadcastId && (
              <Link className="btn btn-secondary" to={`/watch/${event.id}?tab=hands`}>
                Main table hands
              </Link>
            )}
          </>
        }
      >
        Hand histories appear here as key hands are logged.
      </EmptyState>
    );
  }
  return (
    <div>
      <ul className="hand-list">
        {hands.map((h) => (
          <li key={h.id} className="hand-row">
            <div className="hand-row-main">
              <p className="hand-row-num">
                Hand #{h.handNumber} · {h.level}
              </p>
              <p className="hand-row-title">{h.title}</p>
              <p className="hand-row-sum">
                <GlossaryText>{h.summary}</GlossaryText>
              </p>
              <p className="hand-row-players">
                {h.playerIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ' vs '}
                    <PlayerLink player={players?.[id] ?? lookup.player(id)} />
                  </span>
                ))}
                <span className="muted"> · Pot {fmtCompact(h.pot)}</span>
              </p>
            </div>
            {h.clip ? (
              <Link className="btn btn-secondary btn-sm" to={`/hands/${h.id}`} state={{ select: true }}>
                ▶ Replay
              </Link>
            ) : (
              <span className="muted hand-noclip">No clip yet</span>
            )}
          </li>
        ))}
      </ul>
      {delayMinutes ? (
        <p className="muted small sync-note">Hands appear here once they have aired on the {delayMinutes}-min delayed broadcast.</p>
      ) : null}
      <SampleNote>Hand records are sample data, not an EBS feed.</SampleNote>
    </div>
  );
}
