// WSOP+ membership comparison. WSOP TV has no plans or payments of its own: it shows what each WSOP+ tier includes
// on WSOP TV (from the "included from" setting) and sends the viewer to WSOP+ to join or upgrade.
import { useLocation, useNavigate } from 'react-router-dom';
import type { Access } from '../../data/types';
import { PLATFORMS } from '../../data/platforms';
import {
  INCLUDED_FROM_LABEL,
  MEMBERSHIP_PRICES,
  SHOW_ANNUAL,
  TIER_NAME,
  atLeast,
  requiredTier,
  tierFull,
  tvCoverage,
  type PaidTier,
  type Tier,
} from '../../data/policy';
import { memberTier, useApp } from '../../state/app';
import { Button, Icon, Page, cx } from '../../components/ui';

const COLUMNS: Exclude<Tier, 'free'>[] = ['wsopFree', 'basic', 'premium'];

export function Plans() {
  const { state, toast, signedIn, requireLogin } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const ls = loc.state as { returnTo?: string; required?: Tier; access?: Access } | null;
  const returnTo = ls?.returnTo ?? '/';
  const required: Tier | undefined = ls?.required ?? (ls?.access ? requiredTier(ls.access, state.includedFrom) : undefined);
  const have = memberTier(state);
  const ended = state.scenario === 'expired';
  const app = PLATFORMS[state.platform].kind === 'mobile' || PLATFORMS[state.platform].kind === 'tablet';

  const go = (tier: PaidTier) => {
    if (!signedIn) return requireLogin({ reason: 'WSOP+ runs on your GGPass account. Sign in first, then choose a membership.', returnTo: '/plans' });
    nav(`/wsop-plus/join?${new URLSearchParams({ tier, return: returnTo })}`);
  };

  const cta = (tier: Exclude<Tier, 'free'>) => {
    if (tier === 'wsopFree') {
      if (!signedIn) return { label: 'Sign in with GGPass', onClick: () => requireLogin({ reason: 'Sign in with GGPass to get WSOP+ Free.', returnTo: '/plans' }) };
      return null;
    }
    if (ended && tier === state.paidTier) return { label: `Renew ${TIER_NAME[tier]}`, onClick: () => go(tier) };
    if (atLeast(have, tier)) return null;
    return { label: have === 'basic' || (ended && state.paidTier === 'basic') ? `Upgrade to ${TIER_NAME[tier]}` : `Join ${tierFull(tier)}`, onClick: () => go(tier) };
  };

  return (
    <Page className="max-w-5xl">
      <p className="label text-gold">WSOP+ membership</p>
      <h1 className="mt-1 text-title font-black">WSOP TV is included with WSOP+</h1>
      <p className="mt-1 text-muted">One GGPass account, one membership. Joining, billing and cancelling all happen in WSOP+ — WSOP TV simply reads your tier.</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
        <span className="label rounded-[3px] border border-dashed border-line-strong px-1 py-px text-[9px]">Placeholder</span>
        Tier names, prices and what each tier covers aren’t final · WSOP TV currently included from: <b className="text-muted">{INCLUDED_FROM_LABEL[state.includedFrom]}</b>
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {COLUMNS.map((tier) => {
          const current = signedIn && !ended && have === tier;
          const needed = required === tier;
          const action = cta(tier);
          return (
            <section
              key={tier}
              aria-label={tierFull(tier)}
              className={cx('flex flex-col rounded-panel border p-5', needed ? 'border-gold bg-gold-dim ring-1 ring-gold' : current ? 'border-line-strong bg-surface' : 'border-line bg-surface')}
            >
              <div className="flex min-h-6 flex-wrap items-center gap-2">
                {current && <span className="label rounded-[3px] bg-surface-3 px-1.5 py-0.5 text-[10px] text-text">Current plan</span>}
                {needed && <span className="label rounded-[3px] bg-gold px-1.5 py-0.5 text-[10px] text-ink">Required to watch this</span>}
                {ended && tier === state.paidTier && <span className="label rounded-[3px] border border-line-strong px-1.5 py-0.5 text-[10px] text-muted">Ended</span>}
              </div>
              <h2 className="mt-2 text-lg font-bold">
                WSOP<span className="text-gold">+</span> {TIER_NAME[tier]}
              </h2>
              <p className="mt-2 text-3xl font-black tnum">
                {MEMBERSHIP_PRICES[tier].monthly}
                <span className="text-sm font-semibold text-muted"> / month</span>
              </p>
              {SHOW_ANNUAL && tier !== 'wsopFree' && <p className="text-xs text-muted">or {MEMBERSHIP_PRICES[tier].annual} / year</p>}
              <p className="mt-1 text-[11px] text-subtle">{tier === 'wsopFree' ? 'Included with every GGPass account' : 'Pricing to be confirmed'}</p>

              <p className="label mt-5 text-[10px] text-subtle">On WSOP TV</p>
              <ul className="mt-2 flex-1 space-y-2">
                {tvCoverage(tier, state.includedFrom).map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm">
                    <Icon name="check" size={16} className="mt-0.5 shrink-0 text-gold" /> {x}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                Plus other WSOP+ benefits ·{' '}
                <button onClick={() => toast('WSOP+ benefits page (demo)')} className="font-semibold text-gold hover:underline">
                  See WSOP+
                </button>
              </p>

              <div className="mt-4">
                {action ? (
                  <Button variant={needed || tier === 'basic' ? 'primary' : 'outline'} className="w-full" onClick={action.onClick}>
                    {action.label}
                  </Button>
                ) : (
                  <p className="flex h-10 items-center justify-center rounded-chip bg-surface-2 text-sm font-semibold text-muted">{current ? 'Your current plan' : 'Included'}</p>
                )}
                {action && tier !== 'wsopFree' && app && (
                  <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-center text-[11px] text-muted">
                    Opens WSOP+ in your browser
                    <span className="label rounded-[3px] border border-dashed border-line-strong px-1 text-[9px] text-subtle">Store policy check pending</span>
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-subtle">Continue to WSOP+ to join or upgrade; you’ll come straight back and WSOP TV re-checks your membership. No payment is taken in this demo.</p>
    </Page>
  );
}
