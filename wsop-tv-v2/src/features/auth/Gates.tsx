// Screens shown in place of the player when playback isn't possible (soft paywall + policy states).
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { archive } from '../../data/mock';
import { Button, Icon } from '../../components/ui';
import { MAX_STREAMS, useApp, type Gate } from '../../state/app';
import { EXPIRED_DAYS_AGO, daysFromNow, fmtBillingDate } from '../../data/policy';


function Panel({ kicker, title, body, children, icon = 'lock' }: { kicker: string; title: string; body: ReactNode; children?: ReactNode; icon?: string }) {
  return (
    <div className="stage flex size-full items-center justify-center p-6">
      <div className="max-w-md text-center" role="alert">
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-line-strong bg-black/50 text-gold">
          <Icon name={icon} />
        </span>
        <p className="label text-gold">{kicker}</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <div className="mt-2 text-sm text-muted">{body}</div>
        {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function PlaybackGate({ gate, returnTo }: { gate: Exclude<Gate, 'ok'>; returnTo: string }) {
  const { requireLogin, set, toast } = useApp();
  const nav = useNavigate();
  switch (gate) {
    case 'login':
      return (
        <Panel kicker="Sign in to watch" title="Continue with GGPASS" body="Browse freely — sign in when you're ready to watch. One GGPASS account works across the WSOP family of services.">
          <Button variant="primary" size="lg" onClick={() => requireLogin({ reason: 'Sign in to start watching.', returnTo })}>
            Continue with GGPASS
          </Button>
        </Panel>
      );
    case 'plans':
      return (
        <Panel kicker="Subscription required" title="Choose a plan to start watching" body="You're signed in with GGPASS. Pick a plan to unlock live coverage, the full archive and hand-by-hand replays.">
          <Button variant="primary" size="lg" onClick={() => nav('/plans', { state: { returnTo } })}>
            See plans
          </Button>
        </Panel>
      );
    case 'link':
      return (
        <Panel kicker="Account linking" title="Link your GGPASS account" body="Your subscription is active, but it isn't connected to a GGPASS account yet. Link once to watch on every device." icon="user">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              set({ scenario: 'active' });
              toast('GGPASS linked (demo) — enjoy the broadcast');
            }}
          >
            Link GGPASS account
          </Button>
          <Button variant="ghost" onClick={() => toast('Help article (demo)')}>
            Why do I need this?
          </Button>
        </Panel>
      );
    case 'restricted':
      return (
        <Panel kicker="Account restricted" title="Viewing isn't available on this account" body="Your GGPASS account is currently restricted, so streams can't be played. Our support team can help you review the account status.">
          <Button variant="outline" onClick={() => toast('Opens GGPASS support (demo)')}>
            Contact GGPASS support
          </Button>
        </Panel>
      );
    case 'expired':
      return (
        <Panel kicker="Subscription ended" title={`Your subscription ended on ${fmtBillingDate(daysFromNow(-EXPIRED_DAYS_AGO))}`} body="Renew to keep watching live tables and the full archive. Free highlights and sign-in content are still available.">
          <Button variant="primary" size="lg" onClick={() => nav('/plans', { state: { returnTo } })}>
            Renew
          </Button>
        </Panel>
      );
    case 'devices':
      return (
        <Panel kicker="Too many devices" title={`You're watching on ${MAX_STREAMS} devices already`} body={`Your plan allows ${MAX_STREAMS} streams at the same time. Stop playback on another device to continue here.`} icon="tv">
          <Button variant="primary" size="lg" onClick={() => nav('/devices', { state: { returnTo } })}>
            Manage devices
          </Button>
        </Panel>
      );
  }
}

/** VPN / proxy detected — a different problem from region rights, so a different message. */
export function VpnBlocked() {
  const { state, toast } = useApp();
  return (
    <Panel
      kicker="VPN or proxy detected"
      icon="shield"
      title="Turn off your VPN or proxy to watch"
      body="We can’t confirm where you’re watching from while a VPN or proxy is on. Turn it off, then try again."
    >
      <Button variant="primary" size="lg" onClick={() => toast(state.vpnDetected ? 'Still detecting a VPN or proxy' : 'Connection looks fine — starting playback')}>
        Try again
      </Button>
      <Button variant="ghost" onClick={() => toast('Help article: watching with a VPN (demo)')}>
        Why am I seeing this?
      </Button>
    </Panel>
  );
}

/** Region restriction: block message + alternatives + Notify me. */
export function RegionBlocked() {
  const { toast } = useApp();
  const nav = useNavigate();
  return (
    <div className="stage flex size-full flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
      <span className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-black/50 text-gold">
        <Icon name="globe" />
      </span>
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">This event isn't available in your region</h2>
        <p className="mt-1 text-sm text-muted">Broadcast rights for this event don't cover your location. We'll let you know if that changes.</p>
      </div>
      <Button variant="primary" onClick={() => toast("We'll notify you if this event becomes available")}>
        <Icon name="bell" size={16} /> Notify me
      </Button>
      <div className="w-full max-w-lg">
        <p className="label mb-2 text-subtle">Watch instead</p>
        <div className="grid grid-cols-3 gap-2">
          {archive.slice(0, 3).map((a) => (
            <button key={a.id} onClick={() => nav('/archive')} className="rounded-chip border border-line bg-black/40 p-2 text-left text-xs hover:border-gold">
              <span className="block text-subtle tnum">{a.year}</span>
              <span className="line-clamp-2 font-semibold">{a.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
