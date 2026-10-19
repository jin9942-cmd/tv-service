import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../state/app';
import { AccessBadge, Button, Icon, Page, Placeholder, cx } from '../../components/ui';
import { PRICES } from '../../data/policy';
import { IapSheet } from '../billing/Checkout';

const PERKS = ['Every live table, including delayed final tables', 'Full archive and hand-by-hand replays', 'Basic & Pro data overlays', 'Multiview on supported devices', 'Watch on web, mobile and TV'];

export function Plans() {
  const { state, signedIn, requireLogin } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const ls = loc.state as { returnTo?: string; openSheet?: boolean; plan?: 'monthly' | 'annual' } | null;
  const returnTo = ls?.returnTo ?? '/';
  const [plan, setPlan] = useState<'monthly' | 'annual'>(ls?.plan ?? state.plan ?? 'annual');
  const [sheet, setSheet] = useState(!!ls?.openSheet);

  // Choosing a plan now goes through a payment step (web checkout or in-app purchase — Demo Controls → Billing).
  const subscribe = () => {
    if (!signedIn) return requireLogin({ reason: 'Sign in with GGPASS before choosing a plan.', returnTo: '/plans' });
    if (state.billingMode === 'web') return nav(`/checkout?${new URLSearchParams({ plan, return: returnTo })}`);
    setSheet(true);
  };

  return (
    <Page className="max-w-3xl">
      <p className="label text-gold">Subscription</p>
      <h1 className="mt-1 text-title font-black">{state.scenario === 'expired' ? 'Renew your subscription' : 'Choose your plan'}</h1>
      <p className="mt-1 text-muted">One subscription, every bracelet event.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
        {(
          [
            { id: 'monthly', name: 'Monthly', price: PRICES.monthly.label, per: PRICES.monthly.per, note: 'Cancel anytime' },
            { id: 'annual', name: 'Annual', price: PRICES.annual.label, per: PRICES.annual.per, note: 'Best value · 2 months free' },
          ] as const
        ).map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={plan === p.id}
            onClick={() => setPlan(p.id)}
            className={cx('rounded-panel border p-5 text-left transition-colors duration-150', plan === p.id ? 'border-gold bg-gold-dim' : 'border-line bg-surface hover:border-line-strong')}
          >
            <span className="flex items-center justify-between">
              <span className="text-lg font-bold">{p.name}</span>
              <span className={cx('flex size-5 items-center justify-center rounded-full border', plan === p.id ? 'border-gold bg-gold text-ink' : 'border-line-strong')}>{plan === p.id && <Icon name="check" size={13} />}</span>
            </span>
            <span className="mt-3 block text-3xl font-black tnum">
              {p.price} <span className="text-sm font-semibold text-muted">{p.per}</span> <Placeholder />
            </span>
            <span className="mt-1 block text-xs text-muted">{p.note}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-2">
        {PERKS.map((x) => (
          <li key={x} className="flex items-center gap-2 text-sm">
            <Icon name="check" size={16} className="text-gold" /> {x}
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-panel border border-line bg-surface p-4">
        <p className="label text-subtle">Free without a subscription</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <AccessBadge access="free" /> Highlight clips — no account needed
          </li>
          <li className="flex items-center gap-2">
            <AccessBadge access="signin" /> Selected classics, replays and hands with a free GGPASS account
          </li>
          <li className="flex items-center gap-2">
            <AccessBadge access="subscriber" /> Everything else, including every live table
          </li>
        </ul>
      </div>

      <Button variant="primary" size="lg" className="mt-8 w-full sm:w-auto" onClick={subscribe}>
        Continue with {plan === 'annual' ? 'Annual' : 'Monthly'}
      </Button>
      {sheet && <IapSheet plan={plan} returnTo={returnTo} onClose={() => setSheet(false)} />}
      <p className="mt-3 text-xs text-subtle">Prices are placeholders. Payments are handled according to the policy of the platform you subscribe on. No payment is taken in this demo.</p>
    </Page>
  );
}
