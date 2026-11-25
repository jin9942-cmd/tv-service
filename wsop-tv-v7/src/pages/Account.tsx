import { useNavigate } from 'react-router-dom';
import { memberTier, useApp } from '../state/app';
import { DeviceList } from '../features/auth/Devices';
import { GGPassMark } from '../features/auth/LoginModal';
import { Button, Page, Placeholder, Switch } from '../components/ui';
import { GRACE_DAYS, NEXT_PAYMENT_DAYS, daysFromNow, fmtBillingDate, tierFull } from '../data/policy';
import { PLATFORMS } from '../data/platforms';

/**
 * Account (My menu): who is signed in (GGPass), the WSOP+ membership and devices. The apps (mobile, tablet, TV) add
 * notifications and help & legal; on the web those links are in the footer and there are no push notifications.
 * Audio and captions follow the player's last choice, so there are no viewing preferences here.
 */
export function Account() {
  const { state, set, toast, signedIn, requireLogin } = useApp();

  if (!signedIn)
    return (
      <Page className="max-w-xl py-20 text-center">
        <p className="label text-gold">Account</p>
        <h1 className="mt-2 text-title font-black">Sign in to manage your account</h1>
        <p className="mt-2 text-muted">Your WSOP+ membership and devices are managed here.</p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => requireLogin({ reason: 'Sign in to manage your account.', returnTo: '/account' })}>
          Continue with GGPASS
        </Button>
      </Page>
    );

  const linked = state.scenario !== 'unlinked';
  const app = PLATFORMS[state.platform].kind !== 'web';

  return (
    <Page className="max-w-4xl space-y-8">
      <header>
        <p className="label text-gold">Account</p>
        <h1 className="mt-1 text-title font-black">Demo Viewer</h1>
        <p className="text-sm text-muted">demo.viewer@example.com</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="GGPASS">
          <div className="flex items-center gap-3">
            <GGPassMark className="size-8 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{linked ? 'Signed in with GGPass' : 'Not connected'}</p>
              <p className="text-xs text-muted">{state.scenario === 'restricted' ? 'Account restricted — contact GGPASS support' : 'demo.viewer@example.com'}</p>
            </div>
            {linked ? (
              <Button size="sm" variant="ghost" onClick={() => toast('Opens your GGPass account (demo)')}>
                Manage in GGPass
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => (set((x) => ({ scenario: x.paidTier })), toast('GGPASS linked (demo)'))}>
                Link
              </Button>
            )}
          </div>
        </Card>
        <Card title="WSOP+ membership">
          <Membership />
        </Card>
      </div>

      <Card title="Devices">
        <DeviceList />
      </Card>

      {app && (
        <Card title="Notifications">
          <Switch label="Broadcast reminders" description="When a broadcast you set a reminder for goes live" on={state.notifyLiveStart} onChange={(v) => set({ notifyLiveStart: v })} />
        </Card>
      )}

      {app && (
      <Card title="Help & legal">
        <ul className="divide-y divide-line">
          {['Help Center', 'Terms of Use', 'Privacy Policy', 'Responsible Gaming', 'Delete account (GGPass)'].map((x) => (
            <li key={x}>
              <button onClick={() => toast(`Opens ${x} (demo)`)} className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold hover:text-gold">
                {x}
                <span className="text-muted" aria-hidden>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">App version 1.0.0 (demo)</p>
      </Card>
      )}

      <Button variant="ghost" onClick={() => (set({ scenario: 'guest' }), toast('Signed out'))}>
        Sign out
      </Button>
    </Page>
  );
}

/** WSOP+ membership as WSOP TV reads it. Joining, upgrading, billing and cancelling all happen in WSOP+. */
function Membership() {
  const { state, toast } = useApp();
  const nav = useNavigate();
  const tier = memberTier(state);
  const paid = tier === 'basic' || tier === 'premium';
  const next = tier === 'basic' ? 'premium' : tier === 'wsopFree' ? 'basic' : null;
  const manage = (
    <button onClick={() => toast('Opens your WSOP+ membership (demo)')} className="text-sm font-semibold text-gold hover:underline">
      Manage in WSOP+
    </button>
  );
  if (state.scenario === 'expired')
    return (
      <>
        <p className="font-semibold">Your {tierFull(state.paidTier)} membership ended</p>
        <p className="text-xs text-muted">You still have WSOP+ Free with your GGPass account.</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button size="sm" variant="primary" onClick={() => nav(`/wsop-plus/join?${new URLSearchParams({ tier: state.paidTier, return: '/account' })}`)}>
            Renew in WSOP+
          </Button>
          {manage}
        </div>
      </>
    );
  return (
    <>
      <p className="flex items-center gap-2 font-semibold">
        {tier === 'free' ? 'No WSOP+ membership' : tierFull(tier)}
        {state.scenario === 'grace' && <span className="label rounded-[3px] border border-delayed px-1 text-[9px] text-delayed">Payment issue</span>}
      </p>
      <p className="text-xs text-muted">
        {state.scenario === 'grace' ? (
          <>Update your payment method in WSOP+ by {fmtBillingDate(daysFromNow(GRACE_DAYS))} to keep watching.</>
        ) : paid ? (
          <>
            Next payment {fmtBillingDate(daysFromNow(NEXT_PAYMENT_DAYS))} <Placeholder /> · billed by WSOP+
          </>
        ) : (
          'Included with your GGPass account'
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {next && (
          <Button size="sm" variant="primary" onClick={() => nav('/plans')}>
            {next === 'premium' ? 'Upgrade to Premium' : 'See WSOP+ plans'}
          </Button>
        )}
        {manage}
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5">
      <h2 className="label mb-3 text-subtle">{title}</h2>
      {children}
    </section>
  );
}
