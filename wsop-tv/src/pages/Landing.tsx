import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { frameFor, getArchive, getHands, getLiveChannels, getPlayers, getTickerEvents, getVideoSource, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { HandCard } from '../components/HandCard';
import { ContinueWatching } from '../components/ContinueWatching';
import { AccessTag, Avatar, Loading, StatusBadge, Thumb } from '../components/ui';
import { PLAN_FEATURES, TIER_LABEL, type Tier } from '../config/entitlements';
import { useAuth } from '../state/gate';
import { formatEventDate, formatEventTime, formatLocalTime, relativeFromNow } from '../lib/time';
import { fmtChips } from '../lib/format';
import type { Broadcast, TournamentEvent } from '../data/types';

const HERO_IMAGE = import.meta.env.BASE_URL + 'media/hero_ft.jpg';
/** Shown when nothing is live: the most recent Main Event final table replay. */
const FALLBACK_FEATURE = { eventId: 'ev-2025-main', broadcastId: 'bc-2025-main-ft' };

export function Landing() {
  const { tier, setTier } = useAuth();
  const location = useLocation();
  const { data: events } = useAsync(getTickerEvents, []);
  const { data: channels } = useAsync(getLiveChannels, []);
  const { data: hands } = useAsync(() => getHands({ clipsOnly: true }), []);
  const { data: archive } = useAsync(() => getArchive(), []);
  const { data: players } = useAsync(getPlayers, []);
  const [reduceMotion] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  const live = (events ?? []).filter((e) => e.status === 'live');
  const upcoming = (events ?? []).filter((e) => e.status === 'upcoming');
  const highlights = (hands ?? []).filter((h) => h.clip?.access === 'highlight');
  const finals = (archive ?? []).filter((a) => a.kind === 'Final Table');

  useEffect(() => {
    if (location.hash === '#plans') document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, events]);

  return (
    <div className="page landing">
      <Billboard live={live[0]} channels={channels} loading={!events} reduceMotion={reduceMotion} />

      <ContinueWatching />

      <Rail title="Coming up" more={{ to: '/schedule', label: 'Full schedule' }}>
        {!events ? (
          <Loading />
        ) : upcoming.length ? (
          upcoming.map((e) => <UpcomingCard key={e.id} event={e} />)
        ) : (
          <p className="muted">No upcoming events scheduled.</p>
        )}
      </Rail>

      <Rail id="highlights" title="Free highlights" note="No account needed" more={{ to: '/hands', label: 'All hands' }}>
        {!hands ? (
          <Loading />
        ) : (
          <>
            {highlights.map((h) => (
              <HandCard key={h.id} hand={h} />
            ))}
            <Link to="/watch/ev-2025-main/bc-2025-main-hl" className="card">
              <Thumb seed="ar-2025-main-hl" image={frameFor('src-int')} sub="2025 · Highlights">
                <span className="thumb-duration">1:31</span>
              </Thumb>
              <div className="card-body">
                <div className="card-tags">
                  <span className="tag tag-free">Free</span>
                </div>
                <p className="card-title">2025 Main Event highlights reel</p>
                <p className="card-meta">{lookup.season('s2025')?.name}</p>
              </div>
            </Link>
          </>
        )}
      </Rail>

      <Rail title="Relive the finals" more={{ to: '/archive', label: 'Archive' }} wide>
        {!archive ? (
          <Loading />
        ) : (
          finals.map((a) => {
            const ev = lookup.event(a.eventId);
            const champ = ev?.results?.find((r) => r.place === 1);
            const champion = champ ? lookup.player(champ.playerId) : null;
            const b = lookup.broadcast(a.broadcastId);
            return (
              <Link key={a.id} to={`/watch/${a.eventId}/${a.broadcastId}`} state={{ select: true }} className="card final-card">
                <Thumb seed={a.id} image={frameFor(b?.sourceId, 260)}>
                  <span className="final-card-year">{lookup.season(a.seasonId)?.year}</span>
                  <span className="thumb-duration">{a.durationLabel}</span>
                </Thumb>
                <div className="card-body">
                  <div className="card-tags">
                    <span className="tag">Replay</span>
                    <AccessTag level={a.access} tier={tier} />
                  </div>
                  <p className="card-title">{ev?.name}</p>
                  <p className="card-meta">{champion ? `Won by ${champion.name}` : a.title}</p>
                </div>
              </Link>
            );
          })
        )}
      </Rail>

      <Rail title="Featured players" more={{ to: '/players', label: 'All players' }}>
        {!players ? (
          <Loading />
        ) : (
          players.map((p) => (
            <Link key={p.id} to={`/players/${p.id}`} className="player-tile">
              <Avatar player={p} size={88} />
              <span className="player-tile-name">{p.name}</span>
              <span className="card-meta">
                {p.countryCode} · {p.bracelets} bracelet{p.bracelets === 1 ? '' : 's'}
              </span>
            </Link>
          ))
        )}
      </Rail>

      <section className="block" id="plans">
        <div className="section-head">
          <h2 className="section-title">WSOP+ plans (demo)</h2>
        </div>
        <p className="muted small">
          Sign-in uses <strong>GGPass</strong>; subscriptions and payment will be handled by <strong>WSOP+</strong> (integration planned). Plan
          names, prices and benefits are placeholders — nothing is charged and no payment details are collected.
        </p>
        <div className="plans">
          {(['free', 'standard', 'platinum'] as Exclude<Tier, 'guest'>[]).map((p) => (
            <div key={p} className={`plan ${p === 'standard' ? 'is-featured' : ''} ${tier === p ? 'is-current' : ''}`}>
              <p className="plan-name">{TIER_LABEL[p]}</p>
              <p className="plan-price">Demo plan</p>
              <ul className="plan-feat">
                {PLAN_FEATURES[p].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {tier === p ? (
                <span className="btn btn-ghost btn-block" aria-disabled="true">
                  Current plan
                </span>
              ) : (
                <button className={`btn btn-block ${p === 'standard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTier(p)}>
                  {p === 'free' ? 'Sign in with GGPass (demo)' : `Try demo ${TIER_LABEL[p]}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Full-width featured stream with the live channel rail over its lower edge. */
function Billboard({
  live,
  channels,
  loading,
  reduceMotion,
}: {
  live?: TournamentEvent;
  channels?: Broadcast[];
  loading: boolean;
  reduceMotion: boolean;
}) {
  const { tier } = useAuth();
  const event = live ?? lookup.event(FALLBACK_FEATURE.eventId);
  const broadcast = lookup.broadcast(live?.defaultBroadcastId ?? FALLBACK_FEATURE.broadcastId);
  const source = broadcast ? getVideoSource(broadcast.sourceId) : null;
  const poster = source?.id === 'src-ft' ? HERO_IMAGE : frameFor(source?.id, 110);
  const isLive = !!live;
  const season = event ? lookup.season(event.seasonId) : null;
  const watchUrl = event && broadcast ? `/watch/${event.id}/${broadcast.id}` : '/watch';

  return (
    <section className="billboard" aria-label="Featured">
      <div className="hero-media" aria-hidden="true">
        {poster && <img className="hero-poster" src={poster} alt="" />}
        {source && !reduceMotion && (
          <video key={source.id} className="hero-video" src={`${source.url}#t=110`} poster={poster} muted autoPlay loop playsInline preload="metadata" />
        )}
        <div className="hero-shade" />
      </div>

      <div className="billboard-content">
        {event && (
          <>
            <p className="billboard-eyebrow">
              {isLive ? <StatusBadge status="live" small /> : <span className="replay-flag">Replay · {season?.year}</span>}
              <span>{isLive ? 'Featured now' : 'No live tournaments right now'}</span>
            </p>
            <h1 className="billboard-title">{event.shortName}</h1>
            <p className="billboard-meta">
              <span>{season?.name}</span>
              <span>Event #{event.number}</span>
              <span>{event.dayLabel}</span>
              {isLive && event.playersLeft !== undefined && <span>{fmtChips(event.playersLeft)} players left</span>}
              {isLive && event.blinds && <span className="meta-wide">Blinds {event.blinds.split(' ·')[0]}</span>}
            </p>
            <p className="billboard-lead">{event.description}</p>
            <div className="hero-actions">
              <Link to={watchUrl} state={{ select: true }} className="btn btn-primary btn-lg">
                ▶ {isLive ? 'Watch live' : 'Watch replay'}
              </Link>
              <Link to={`/watch/${event.id}?tab=hands`} className="btn btn-glass btn-lg">
                Key hands
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="billboard-channels">
        <p className="billboard-channels-title">{isLive ? 'Live channels' : 'Schedule'}</p>
        <div className="channel-row">
          {loading || !channels ? (
            <Loading />
          ) : channels.length ? (
            channels.map((b) => {
              const ev = lookup.event(b.eventId);
              return (
                <Link key={b.id} to={`/watch/${b.eventId}/${b.id}`} state={{ select: true }} className={`channel-card ${b.status === 'live' ? '' : 'is-offline'}`}>
                  <Thumb seed={b.id} image={frameFor(b.sourceId, 110)}>
                    <span className="thumb-live">
                      <StatusBadge status={b.status} small />
                    </span>
                    <span className="channel-lock">
                      <AccessTag level={b.access} tier={tier} />
                    </span>
                  </Thumb>
                  <span className="channel-name">{ev?.shortName}</span>
                  <span className="channel-sub">{b.title}</span>
                </Link>
              );
            })
          ) : (
            <Link to="/schedule" className="channel-card channel-empty">
              <span className="channel-name">Next broadcasts</span>
              <span className="channel-sub">Open the schedule →</span>
            </Link>
          )}
        </div>
      </div>

      {source && <p className="hero-credit">Footage: {source.credit} — real poker footage, not WSOP</p>}
    </section>
  );
}

function UpcomingCard({ event }: { event: TournamentEvent }) {
  const b = event.defaultBroadcastId ? lookup.broadcast(event.defaultBroadcastId) : null;
  const start = b?.startAt ?? event.startAt;
  return (
    <Link to={`/watch/${event.id}`} className="card upcoming-card">
      <Thumb seed={event.id} image={b ? frameFor(b.sourceId, 40) : undefined}>
        <span className="upcoming-when">
          <span className="upcoming-date">{formatEventDate(start)}</span>
          <span className="upcoming-time">{formatEventTime(start)}</span>
        </span>
        <span className="thumb-live">
          <StatusBadge status="upcoming" small />
        </span>
      </Thumb>
      <div className="card-body">
        <p className="card-title">
          #{event.number} {event.shortName}
        </p>
        <p className="card-meta">
          {event.hasBroadcast ? `${event.dayLabel} · starts ${relativeFromNow(start)}` : `${event.dayLabel} · not broadcast`}
        </p>
        <p className="card-meta">{formatLocalTime(start)} your time</p>
      </div>
    </Link>
  );
}

function Rail(props: {
  id?: string;
  title: string;
  note?: string;
  more?: { to: string; label: string };
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="block rail" id={props.id}>
      <div className="section-head">
        <h2 className="section-title">
          {props.title}
          {props.note && <span className="rail-note">{props.note}</span>}
        </h2>
        {props.more && (
          <Link to={props.more.to} className="link-more">
            {props.more.label} →
          </Link>
        )}
      </div>
      <div className={`row-scroll ${props.wide ? 'row-wide' : ''}`}>{props.children}</div>
    </section>
  );
}
