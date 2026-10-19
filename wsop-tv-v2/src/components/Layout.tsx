import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../state/app';
import { Button, Icon, cx } from './ui';
import { WSOP_LOGO } from '../lib/brand';
import { LoginModal } from '../features/auth/LoginModal';
import { DemoControls } from '../features/demo/DemoControls';
import { TvPreview } from '../features/tv/TvPreview';
import { GRACE_DAYS, STORE_NAME, TRAVEL_COUNTRY, daysFromNow, fmtBillingDate } from '../data/policy';


export const NAV = [
  { to: '/', label: 'Home', icon: 'star', end: true },
  { to: '/live', label: 'Live', icon: 'play' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/series', label: 'Series & Events', icon: 'layers' },
  { to: '/players', label: 'Players', icon: 'user' },
  { to: '/hands', label: 'Hands & Clips', icon: 'grid4' },
  { to: '/archive', label: 'Archive', icon: 'grid2' },
  { to: '/my-list', label: 'My List', icon: 'plus' },
] as const;

const MOBILE_NAV = ['/', '/live', '/schedule', '/hands'];

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-black tracking-tight', size === 'lg' ? 'text-3xl' : 'text-lg')}>
      <img src={WSOP_LOGO} alt="WSOP" width={216} height={80} className={cx('w-auto', size === 'lg' ? 'h-12' : 'h-8 sm:h-9')} />
      <span className="text-gold">TV</span>
      <span className="label ml-1 hidden self-center rounded-[3px] border border-line-strong px-1 py-px text-[9px] font-bold text-muted sm:inline">Working title</span>
    </span>
  );
}

export function Layout() {
  const { state, set, toast, signedIn, requireLogin, login, toasts } = useApp();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-chip bg-gold px-3 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>

      {!signedIn && (
        <div className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-gutter py-2 sm:px-6 lg:px-8">
            <p className="text-[13px] text-muted">
              <span className="hidden sm:inline">Watch every bracelet event live and on demand. </span>One account with GGPASS.
            </p>
            <Button size="sm" variant="primary" onClick={() => requireLogin({ reason: 'Sign in to watch live coverage and keep your progress.' })}>
              Continue with GGPASS
            </Button>
          </div>
        </div>
      )}

      {/* Payment issue: watching continues during the grace period */}
      {state.scenario === 'grace' && (
        <div className="border-b border-delayed/40 bg-delayed/10" role="status">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-2 px-gutter py-2 sm:px-6 lg:px-8">
            <p className="text-[13px]">
              <b>Update your payment method to keep watching.</b> <span className="text-muted">Your access continues until {fmtBillingDate(daysFromNow(GRACE_DAYS))}.</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                state.billingMode === 'web'
                  ? nav(`/pay/wsop-plus?${new URLSearchParams({ plan: state.plan ?? 'annual', method: 'change', return: loc.pathname })}`)
                  : toast(`Opens ${STORE_NAME[state.platform]} subscriptions (demo)`)
              }
            >
              Update payment
            </Button>
          </div>
        </div>
      )}
      {/* Travelling: wording stays non-committal — the rights policy (subscription country vs. location) isn't decided */}
      {state.abroad && !state.abroadDismissed && (
        <div className="border-b border-line bg-surface-2" role="status">
          <div className="mx-auto flex max-w-content items-center gap-3 px-gutter py-2 sm:px-6 lg:px-8">
            <Icon name="globe" size={16} className="text-gold" />
            <p className="flex-1 text-[13px]">You’re watching from {TRAVEL_COUNTRY}. Some events may not be available.</p>
            <button onClick={() => set({ abroadDismissed: true })} aria-label="Dismiss" className="rounded-chip p-1.5 text-muted hover:text-text">
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-header max-w-content items-center gap-4 px-gutter sm:px-6 lg:px-8">
          <NavLink to="/" aria-label="WSOP TV home" className="shrink-0">
            <Wordmark />
          </NavLink>
          <nav aria-label="Main" className="hidden flex-1 items-center gap-0.5 xl:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={'end' in n}
                className={({ isActive }) => cx('rounded-chip px-2.5 py-1.5 text-[13.5px] font-semibold transition-colors duration-150', isActive ? 'text-text' : 'text-muted hover:text-text')}
              >
                {({ isActive }) => (
                  <span className={cx('relative', isActive && 'after:absolute after:-bottom-[13px] after:left-0 after:h-0.5 after:w-full after:bg-gold')}>{n.label}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NavLink to="/search" aria-label="Search" title="Search" className={({ isActive }) => cx('rounded-chip p-2 transition-colors duration-150', isActive ? 'text-gold' : 'text-muted hover:text-text')}>
              <Icon name="search" />
            </NavLink>
            <Button size="sm" variant={state.tvPreview ? 'primary' : 'outline'} onClick={() => set({ tvPreview: !state.tvPreview })} aria-pressed={state.tvPreview}>
              <Icon name="tv" size={16} /> <span className="hidden sm:inline">TV Preview</span>
            </Button>
            {signedIn ? (
              <NavLink to="/account" className="flex items-center gap-2 rounded-full border border-line-strong py-1 pr-3 pl-1 text-[13px] font-semibold hover:border-gold" aria-label="Account">
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold">DV</span>
                <span className="hidden md:inline">Account</span>
              </NavLink>
            ) : (
              <Button size="sm" variant="ghost" className="hidden md:inline-flex" onClick={() => requireLogin({ reason: 'Sign in to WSOP TV.' })}>
                Sign in
              </Button>
            )}
            <button className="rounded-chip p-2 text-muted hover:text-text xl:hidden" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
        {menu && (
          <nav aria-label="Main (menu)" className="border-t border-line bg-surface xl:hidden">
            <ul className="mx-auto grid max-w-content grid-cols-2 gap-1 px-gutter py-3 sm:grid-cols-4 sm:px-6">
              {[...NAV, { to: '/search', label: 'Search', icon: 'search' }, { to: '/account', label: 'Account', icon: 'user' }].map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex items-center gap-2 rounded-chip px-3 py-2.5 text-sm font-semibold', isActive ? 'bg-surface-3 text-text' : 'text-muted hover:text-text')}>
                    <Icon name={n.icon} size={16} /> {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <Footer />

      {/* Mobile bottom navigation */}
      <nav aria-label="Main (mobile)" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bg/95 backdrop-blur md:hidden">
        {NAV.filter((n) => MOBILE_NAV.includes(n.to)).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold', isActive ? 'text-gold' : 'text-muted')}>
            <Icon name={n.icon} size={20} />
            {n.label.replace(' & Clips', '')}
          </NavLink>
        ))}
        <button className="flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold text-muted" onClick={() => setMenu(true)} aria-label="More">
          <Icon name="menu" size={20} />
          More
        </button>
      </nav>

      {login && <LoginModal />}
      {state.tvPreview && <TvPreview />}
      <DemoControls />

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-full border border-line-strong bg-surface-2 px-4 py-2 text-sm shadow-xl">
            {t.text}
            {t.action && (
              <button onClick={t.action.onClick} className="pointer-events-auto font-bold text-gold-strong hover:underline">
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-content gap-6 px-gutter py-8 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-md text-muted">
            The official home of the mind sport — live and on-demand coverage of championship poker. Viewing service only. Demo build with fictional players and events.
          </p>
        </div>
        <div>
          <p className="label mb-2 text-subtle">Responsible Gaming</p>
          <p className="text-muted">Poker is a game of skill and strategy. Play responsibly. Age requirements for poker-related services vary by region.</p>
          <a href="#help" onClick={(e) => e.preventDefault()} className="mt-2 inline-block font-semibold text-gold underline-offset-4 hover:underline">
            Need help? Find support resources
          </a>
        </div>
        <div>
          <p className="label mb-2 text-subtle">Service</p>
          <ul className="space-y-1.5 text-muted">
            {['Help Center', 'Terms of Use', 'Privacy Policy', 'Accessibility'].map((x) => (
              <li key={x}>
                <a href="#legal" onClick={(e) => e.preventDefault()} className="hover:text-text">
                  {x}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-line px-gutter py-4 text-center text-xs text-subtle">WSOP TV (working title) · Interactive demo · All players, events and results are fictional.</p>
    </footer>
  );
}
