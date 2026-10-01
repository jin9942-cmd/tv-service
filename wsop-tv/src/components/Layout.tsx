import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TIER_LABEL, TIER_ORDER, type Tier } from '../config/entitlements';
import { useAuth, useGate } from '../state/gate';
import { demoStore, useStore, authStore, progressStore } from '../state/stores';
import { clearAll } from '../lib/storage';
import { Modal } from './Modal';
import { PromoModal } from './PromoModal';

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
          WSOP TV <span className="demo-badge">Demo</span> — fictional players, sample results and open-licence sample films
          (Blender Foundation, MDN). No AWS, GGPass, EBS or payment system is connected.
        </p>
      </footer>
      <BottomNav />
      <DemoTools />
      <PromoModal />
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
        </nav>
        <div className="header-user">
          {auth.tier === 'guest' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => auth.signIn('free')}
              title="Demo sign-in — no credentials collected"
              disabled={gate.isOpen}
            >
              Sign in
            </button>
          ) : (
            <span className="user-chip" title="Current demo plan">
              <span className="user-dot" />
              <span className="user-plan">{TIER_LABEL[auth.tier]}</span>
            </span>
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
            <legend>User state / plan</legend>
            <div className="seg">
              {TIER_ORDER.map((t: Tier) => (
                <button key={t} className={`seg-btn ${auth.tier === t ? 'is-on' : ''}`} aria-pressed={auth.tier === t} onClick={() => auth.setTier(t)}>
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="fineprint">
              Guest: highlights · Free: + free VOD · Standard: + main live & paid VOD · Platinum: + additional tables. Policy lives in{' '}
              <code>src/config/entitlements.ts</code>.
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
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              clearAll();
              authStore.reset();
              demoStore.reset();
              progressStore.reset();
              setOpen(false);
            }}
          >
            Reset demo (sign out, clear continue-watching)
          </button>
        </Modal>
      )}
    </>
  );
}
