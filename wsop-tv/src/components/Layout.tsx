import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TIER_LABEL, TIER_ORDER, type Tier } from '../config/entitlements';
import { useAuth, useGate } from '../state/gate';
import { demoStore, useStore, authStore, progressStore } from '../state/stores';
import { clearAll } from '../lib/storage';
import { Modal } from './Modal';
import { PromoModal } from './PromoModal';
import { BadgeToast } from './Badges';
import { badgeProgress, resetActivity, useActivity } from '../state/activity';
import { analyticsLog } from '../lib/analytics';

const NAV = [
  { to: '/watch', label: 'Live', icon: 'M4 6h16v10H4zM8 20h8M12 16v4' },
  { to: '/hands', label: 'Hands', icon: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6' },
  { to: '/schedule', label: 'Schedule', icon: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4' },
  { to: '/archive', label: 'Archive', icon: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4' },
  { to: '/players', label: 'Players', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0' },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="demo-strip" role="note">
        <strong>DEMO</strong> · Prototype for UX testing. Not affiliated with or operated by WSOP. Sample data and sample videos only.
      </div>
      <Header />
      <main id="main" className="main">
        {children}
      </main>
      <footer className="footer">
        <p>
          WSOP TV <span className="demo-badge">Demo</span> — fictional players and sample results. Video is real poker footage under
          Creative Commons licences (World Poker Tour, CC BY 3.0; Texas Hold ’em table cam, CC BY-SA 4.0) via Wikimedia Commons — not
          WSOP footage. No AWS, GGPass, WSOP+, EBS, analytics or payment system is contacted.
        </p>
      </footer>
      <BottomNav />
      <DemoTools />
      <PromoModal />
      <BadgeToast />
    </div>
  );
}

function Header() {
  const auth = useAuth();
  const gate = useGate();
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" aria-label="WSOP TV demo home">
          <span className="logo-mark">WSOP</span>
          <span className="logo-tv">TV</span>
          <span className="demo-badge">Demo</span>
        </Link>
        <nav className="top-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="top-nav-link">
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/me" className="top-nav-link">
            My WSOP
          </NavLink>
        </nav>
        <div className="header-user">
          {auth.tier === 'guest' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => gate.requireSignIn({ signInFor: 'continue' })}
              title="Demo GGPass sign-in — no credentials collected"
              disabled={gate.isOpen}
            >
              Sign in
            </button>
          ) : (
            <Link to="/me" className="user-chip" title="My WSOP">
              <span className="user-dot" />
              <span className="user-plan">My WSOP</span>
              <span className="user-tier">{auth.tier === 'free' ? 'Free' : TIER_LABEL[auth.tier]}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main (mobile)">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} className="bottom-nav-link">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Demo tools: switch plan/state without any real account. */
function DemoTools() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const demo = useStore(demoStore);
  const activity = useActivity();
  const log = useStore(analyticsLog);

  return (
    <>
      <button className="demo-fab" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true">⚙</span> Demo tools
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} labelledBy="demo-tools-title" variant="panel">
          <p className="modal-kicker">Testing only</p>
          <h2 id="demo-tools-title" className="modal-title">
            Demo tools
          </h2>
          <fieldset className="fieldset">
            <legend>Sign-in (GGPass) / WSOP+ plan</legend>
            <div className="seg">
              {TIER_ORDER.map((t: Tier) => (
                <button key={t} className={`seg-btn ${auth.tier === t ? 'is-on' : ''}`} aria-pressed={auth.tier === t} onClick={() => auth.setTier(t)}>
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="fineprint">
              Guest = signed out. Free = signed in, no WSOP+ plan. Standard / Platinum = demo WSOP+ plans. Access policy:{' '}
              <code>src/config/entitlements.ts</code>. Changing the plan never changes badges.
            </p>
          </fieldset>
          <fieldset className="fieldset">
            <legend>Simulations</legend>
            <label className="switch">
              <input type="checkbox" checked={demo.noLive} onChange={(e) => demoStore.set({ ...demo, noLive: e.target.checked })} />
              <span>No live tournaments right now</span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={demo.forceVideoError}
                onChange={(e) => demoStore.set({ ...demo, forceVideoError: e.target.checked })}
              />
              <span>Force sample video failure</span>
            </label>
          </fieldset>
          <fieldset className="fieldset">
            <legend>Activity &amp; badges</legend>
            <ul className="demo-badges">
              {badgeProgress(activity).map((p) => (
                <li key={p.badge.id}>
                  <span>{p.badge.name}</span>
                  <span className={p.earnedAt ? 'demo-ok' : 'muted'}>
                    {p.earnedAt ? 'Earned' : `${p.current}/${p.target} ${p.unit}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="fineprint">
              Watch time {Math.floor(activity.watch.totalSeconds)}s · rules in <code>src/config/badges.ts</code>. Only counts while signed in, the
              page is visible and video is actually playing (one tab at a time).
            </p>
            <button className="btn btn-secondary btn-block" onClick={resetActivity}>
              Reset activity (saves, follows, watch time, badges)
            </button>
          </fieldset>
          <details className="fieldset demo-log">
            <summary>Analytics log (local only · {log.length})</summary>
            {log.length ? (
              <ol>
                {log.slice(0, 15).map((e, i) => (
                  <li key={i}>
                    <code>{e.name}</code> <span className="muted">{Object.entries(e.props).map(([k, v]) => `${k}=${v}`).join(' ')}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="fineprint">No events yet. Nothing is sent to any server.</p>
            )}
          </details>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              clearAll();
              resetActivity();
              analyticsLog.reset();
              authStore.reset();
              demoStore.reset();
              progressStore.reset();
              setOpen(false);
            }}
          >
            Reset everything (sign out, clear all demo data)
          </button>
        </Modal>
      )}
    </>
  );
}
