import { Link } from 'react-router-dom';
import type { AudioTrack, OverlayLevel } from '../data/types';
import { useApp } from '../state/app';
import { AUDIO_LABEL } from '../features/player/Controls';
import { DeviceList } from '../features/auth/Devices';
import { GGPassMark } from '../features/auth/LoginModal';
import { useState } from 'react';
import { Button, Modal, Page, Placeholder, Segmented, Switch } from '../components/ui';
import { COMPLETE_THRESHOLD, EXPIRED_DAYS_AGO, GRACE_DAYS, STORE_NAME, daysFromNow, fmtBillingDate, renewalDate } from '../data/policy';

import { dayById } from '../data/mock';

const SCENARIO_TEXT = {
  guest: 'Not signed in',
  noSub: 'No active subscription',
  active: 'Active',
  unlinked: 'Active · GGPASS not linked',
  restricted: 'Restricted',
  deviceLimit: 'Active · stream limit reached',
  expired: 'Expired',
  grace: 'Active · payment issue',
} as const;

export function Account() {
  const { state, set, toast, signedIn, requireLogin } = useApp();

  if (!signedIn)
    return (
      <Page className="max-w-xl py-20 text-center">
        <p className="label text-gold">Account</p>
        <h1 className="mt-2 text-title font-black">Sign in to manage your account</h1>
        <p className="mt-2 text-muted">Settings like Spoiler-Free Mode and followed players are saved to your account.</p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => requireLogin({ reason: 'Sign in to manage your account.', returnTo: '/account' })}>
          Continue with GGPASS
        </Button>
      </Page>
    );

  const linked = state.scenario !== 'unlinked';
  const subActive = state.scenario !== 'noSub' && state.scenario !== 'restricted' && state.scenario !== 'expired';

  return (
    <Page className="max-w-4xl space-y-8">
      <header>
        <p className="label text-gold">Account</p>
        <h1 className="mt-1 text-title font-black">Demo Viewer</h1>
        <p className="text-sm text-muted">demo.viewer@example.com</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="GGPASS">
          <div className="flex items-center gap-3">
            <GGPassMark className="size-8 text-sm" />
            <div className="flex-1">
              <p className="font-semibold">{linked ? 'Connected' : 'Not connected'}</p>
              <p className="text-xs text-muted">{state.scenario === 'restricted' ? 'Account restricted — contact GGPASS support' : 'Shared with WSOP TV: email, nickname'}</p>
            </div>
            {linked ? (
              <Button size="sm" variant="ghost" onClick={() => toast('Manage connected apps on GGPASS (demo)')}>
                Manage
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => (set({ scenario: 'active' }), toast('GGPASS linked (demo)'))}>
                Link
              </Button>
            )}
          </div>
        </Card>
        <Card title="Subscription">
          <SubscriptionStatus subActive={subActive} />
        </Card>
      </div>

      <ViewingHistory />

      <Card title="Devices">
        <DeviceList />
      </Card>

      <Card title="Viewing preferences">
        <Switch label="Spoiler-Free Mode" description="Hide results, champions, chip standings and hand outcomes everywhere until you choose to reveal them." on={state.spoilerFree} onChange={(v) => set({ spoilerFree: v })} />
        <Row label="Default overlay">
          <Segmented<OverlayLevel>
            label="Default overlay"
            size="sm"
            value={state.overlayDefault}
            onChange={(v) => set({ overlayDefault: v })}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'basic', label: 'Basic' },
              { value: 'pro', label: 'Pro' },
            ]}
          />
        </Row>
        <Row label="Default audio">
          <select value={state.audioDefault} onChange={(e) => set({ audioDefault: e.target.value as AudioTrack })} className="h-9 rounded-chip border border-line-strong bg-surface-2 px-2 text-sm" aria-label="Default audio">
            {(Object.keys(AUDIO_LABEL) as AudioTrack[]).map((a) => (
              <option key={a} value={a}>
                {AUDIO_LABEL[a]}
              </option>
            ))}
          </select>
        </Row>
        <Switch label="Captions on by default" on={state.ccDefault} onChange={(v) => set({ ccDefault: v })} />
      </Card>

      <Card title="Notifications">
        <Switch label="Live start" description="When a final table or followed event goes live" on={state.notifyLiveStart} onChange={(v) => set({ notifyLiveStart: v })} />
        <Switch label="Followed players" description="When a player you follow is on a broadcast table" on={state.notifyFollowed} onChange={(v) => set({ notifyFollowed: v })} />
      </Card>

      <Card title="Privacy">
        <p className="text-sm text-muted">Request a copy of your data or ask us to delete it. Requests are verified through GGPASS.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toast('Data download request submitted (demo)')}>
            Request data download
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast('Deletion request submitted (demo)')}>
            Request account deletion
          </Button>
        </div>
      </Card>

      <Card title="Responsible Gaming">
        <p className="text-sm text-muted">WSOP TV is a viewing service. If poker or gaming is affecting you or someone you know, support is available. Age requirements for poker-related services vary by region.</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-gold">
          {['Responsible Gaming principles', 'Find support near you', 'Self-assessment'].map((x) => (
            <a key={x} href="#rg" onClick={(e) => e.preventDefault()} className="underline-offset-4 hover:underline">
              {x}
            </a>
          ))}
        </div>
      </Card>

      <Button variant="ghost" onClick={() => (set({ scenario: 'guest' }), toast('Signed out'))}>
        Sign out
      </Button>
    </Page>
  );
}

/** Viewing history: what Continue Watching is built from. Clearing it can't be undone. */
function ViewingHistory() {
  const { state, set, toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  const entries = Object.entries(state.progress).filter(([id]) => dayById(id));
  return (
    <Card title="Viewing history">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {entries.length ? `${entries.length} broadcast${entries.length === 1 ? '' : 's'} with saved progress` : 'No viewing history'}
          </p>
          <p className="text-xs text-muted">
            Broadcasts leave Continue Watching once you’ve watched {Math.round(COMPLETE_THRESHOLD * 100)}% <Placeholder />
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={!entries.length} onClick={() => setConfirm(true)}>
          Clear all
        </Button>
      </div>
      {confirm && (
        <Modal title="Clear viewing history?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-muted">This removes every broadcast from Continue Watching and resets where you left off. It can’t be undone.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => (set({ progress: {} }), setConfirm(false), toast('Viewing history cleared'))}>
              Clear all
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

/** Subscription status incl. scheduled cancellation, expiry and payment issues, and where to manage it. */
function SubscriptionStatus({ subActive }: { subActive: boolean }) {
  const { state, set, toast } = useApp();
  const plan = state.plan ?? 'annual';
  const ends = fmtBillingDate(renewalDate(plan));
  const store = STORE_NAME[state.platform];
  const status =
    state.scenario === 'expired'
      ? { title: 'Expired', sub: `Your subscription ended on ${fmtBillingDate(daysFromNow(-EXPIRED_DAYS_AGO))}` }
      : state.scenario === 'grace'
        ? { title: 'Payment issue', sub: `Update your payment method by ${fmtBillingDate(daysFromNow(GRACE_DAYS))} to keep watching` }
        : subActive && state.cancelScheduled
          ? { title: 'Cancellation scheduled', sub: `Ends on ${ends} · you can keep watching until then` }
          : { title: SCENARIO_TEXT[state.scenario], sub: subActive ? `${plan === 'monthly' ? 'Monthly' : 'Annual'} plan · renews ${ends}` : 'Choose a plan to watch live coverage' };
  return (
    <>
      <p className="font-semibold">{status.title}</p>
      <p className="text-xs text-muted">{status.sub}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to="/plans" className="text-sm font-semibold text-gold hover:underline">
          {state.scenario === 'expired' ? 'Renew' : subActive ? 'Change plan' : 'See plans'}
        </Link>
        {subActive &&
          (state.cancelScheduled ? (
            <Button size="sm" variant="outline" onClick={() => (set({ cancelScheduled: false }), toast('Subscription resumed'))}>
              Resume
            </Button>
          ) : (
            <button onClick={() => (set({ cancelScheduled: true }), toast(`Cancellation scheduled · access until ${ends} (demo)`))} className="text-sm font-semibold text-muted hover:text-text">
              Cancel subscription
            </button>
          ))}
      </div>
      {(subActive || state.scenario === 'expired') && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
          <b className="text-text">Manage subscription:</b>{' '}
          {state.billingMode === 'web' ? (
            <>
              billing is handled by WSOP+.{' '}
              <button onClick={() => toast('Opens your WSOP+ account (demo)')} className="font-semibold text-gold hover:underline">
                Manage on WSOP+
              </button>
            </>
          ) : (
            <>billing is handled by the platform you subscribed on — manage it in your {store} subscriptions.</>
          )}
        </p>
      )}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </div>
  );
}
