import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { frameFor, getHands, getTickerEvents, getVideoSource, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { HandCard } from '../components/HandCard';
import { ContinueWatching } from '../components/ContinueWatching';
import { Loading, StatusBadge, Thumb } from '../components/ui';
import { PLAN_FEATURES, TIER_LABEL, type Tier } from '../config/entitlements';
import { useAuth } from '../state/gate';
import { formatEventDate, formatEventTime } from '../lib/time';

const HERO_IMAGE = import.meta.env.BASE_URL + 'media/hero_ft.jpg';

export function Landing() {
  const { tier, setTier } = useAuth();
  const location = useLocation();
  const { data: events } = useAsync(getTickerEvents, []);
  const { data: hands } = useAsync(() => getHands({ clipsOnly: true }), []);
  const highlights = (hands ?? []).filter((h) => h.clip?.access === 'highlight');
  const live = (events ?? []).filter((e) => e.status === 'live');
  const upcoming = (events ?? []).filter((e) => e.status === 'upcoming').slice(0, 3);

  const heroSource = getVideoSource('src-ft');
  const featured = live[0];
  const [reduceMotion] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (location.hash === '#plans') document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, events]);

  return (
    <div className="page landing">
      <section className="hero-banner" aria-label="Featured">
        <div className="hero-media" aria-hidden="true">
          <img className="hero-poster" src={HERO_IMAGE} alt="" />
          {heroSource && !reduceMotion && (
            <video className="hero-video" src={`${heroSource.url}#t=110`} poster={HERO_IMAGE} muted autoPlay loop playsInline preload="metadata" />
          )}
          <div className="hero-shade" />
        </div>
        <div className="hero-content">
          {featured ? (
            <p className="hero-live-tag">
              <StatusBadge status="live" small /> #{featured.number} {featured.shortName} · {featured.dayLabel}
            </p>
          ) : (
            <p className="kicker">Demo · poker tournament streaming</p>
          )}
          <h1 className="hero-title">Follow the tournament that’s happening right now.</h1>
          <p className="hero-lead">
            Pick a live table, rewatch the key hands, jump to a player’s profile and their past final tables — all in one flow.
          </p>
          <div className="hero-actions">
            <Link to={featured ? `/watch/${featured.id}` : '/watch'} state={{ select: true }} className="btn btn-primary btn-lg">
              ▶ Watch live
            </Link>
            <a href="#highlights" className="btn btn-glass btn-lg">
              Free highlights
            </a>
          </div>
        </div>
        {heroSource && (
          <p className="hero-credit">
            Footage: {heroSource.credit} — real poker footage, not WSOP
          </p>
        )}
      </section>

      <section className="block">
        <div className="section-head">
          <h2 className="section-title">Live now</h2>
          <Link to="/schedule" className="link-more">
            Full schedule →
          </Link>
        </div>
        {!events ? (
          <Loading />
        ) : live.length ? (
          <div className="row-scroll row-live">
            {live.map((e) => {
              const main = e.defaultBroadcastId ? lookup.broadcast(e.defaultBroadcastId) : null;
              return (
                <Link key={e.id} to={`/watch/${e.id}`} state={{ select: true }} className="card live-card">
                  <Thumb seed={e.id} image={frameFor(main?.sourceId, 110)}>
                    <span className="thumb-live">
                      <StatusBadge status="live" small />
                    </span>
                    <span className="thumb-streams">
                      {e.broadcastIds.length} stream{e.broadcastIds.length > 1 ? 's' : ''}
                    </span>
                  </Thumb>
                  <div className="card-body">
                    <p className="card-title">
                      #{e.number} {e.shortName}
                    </p>
                    <p className="card-meta">{e.dayLabel}</p>
                  </div>
                </Link>
              );
            })}
            {upcoming.map((e) => (
              <Link key={e.id} to={`/watch/${e.id}`} className="card live-card is-upcoming">
                <Thumb seed={e.id}>
                  <span className="thumb-live">
                    <StatusBadge status="upcoming" small />
                  </span>
                  <span className="thumb-when">
                    {formatEventDate(e.startAt)}
                    <br />
                    {formatEventTime(e.startAt)}
                  </span>
                </Thumb>
                <div className="card-body">
                  <p className="card-title">
                    #{e.number} {e.shortName}
                  </p>
                  <p className="card-meta">{e.hasBroadcast ? e.dayLabel : `${e.dayLabel} · not broadcast`}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            No live tournaments right now. <Link to="/schedule" className="credit-link">See the schedule</Link>.
          </p>
        )}
      </section>

      <ContinueWatching />

      <section className="block" id="highlights">
        <div className="section-head">
          <h2 className="section-title">Free highlights</h2>
          <Link to="/hands" className="link-more">
            All hands →
          </Link>
        </div>
        <p className="muted">No account needed. Clips use real, openly licensed poker footage (World Poker Tour, CC BY) — not WSOP footage.</p>
        {!hands ? (
          <Loading />
        ) : (
          <div className="row-scroll">
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
          </div>
        )}
      </section>

      <section className="block">
        <h2 className="section-title">How it works</h2>
        <ol className="flow">
          <li>
            <strong>Watch</strong>
            <span>Choose a tournament and table in the ticker.</span>
          </li>
          <li>
            <strong>Replay hands</strong>
            <span>Jump to the key hands from the Hand History tab.</span>
          </li>
          <li>
            <strong>Meet players</strong>
            <span>Open a profile from any hand or chip count.</span>
          </li>
          <li>
            <strong>Past finals</strong>
            <span>Rewatch the final tables a player reached.</span>
          </li>
        </ol>
      </section>

      <section className="block" id="plans">
        <h2 className="section-title">Demo plans</h2>
        <p className="muted">
          Prices are not final — every plan is shown as a <strong>Demo plan</strong>. Nothing is charged and no payment details are collected.
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
                  {p === 'free' ? 'Demo sign-in (Free)' : `Try demo ${TIER_LABEL[p]}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
