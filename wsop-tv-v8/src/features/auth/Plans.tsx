// WSOP+ inside WSOP TV (v7): the membership page under the TV menu (wsop.com/plus can't be framed). What WSOP+ is, the
// three tiers with what each includes on WSOP TV and across WSOP+, and short answers. WSOP TV has no plans or payments
// of its own: joining or upgrading goes to WSOP+ and comes back.
import { useLocation, useNavigate } from 'react-router-dom';
import type { Access } from '../../data/types';
import { PLATFORMS } from '../../data/platforms';
import {
  INCLUDED_FROM_LABEL,
  PRESENTATION,
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

/** What else each tier brings across WSOP+ (WSOP Academy, WSOP Live, ClubGG), in short. */
const ACROSS: Record<Exclude<Tier, 'free'>, string[]> = {
  wsopFree: ['Your Poker IQ, and the full WSOP Academy curriculum', 'The first Academy challenger', '10 High Roller Table hands a day', 'The official WSOP app', 'Play with friends and family on ClubGG'],
  basic: ['The named-pro Academy challengers', '50 High Roller Table hands a day', 'Plus Lounge once a day · Stage 1 once a day', '5% off at the WSOP Store', 'Multi-table on PC/Mac, up to 6 tables', 'PokerCraft, Smart HUD, Rabbit Hunt and more'],
  premium: ['The apex Academy challenger', 'Unlimited High Roller Table hands', 'Unlimited Plus Lounge and Stage 1 · Final Stage re-entry', 'Special merchandise at the WSOP Store', 'Multi-table on PC/Mac, up to 12 tables', 'PokerCraft, Smart HUD, Rabbit Hunt and more'],
};
const PRODUCTS: [string, string, string][] = [
  ['WSOP TV', 'Live final tables, full replays and hands', 'tv'],
  ['WSOP Academy', 'Lessons, exams and pro challengers', 'star'],
  ['WSOP Live', 'Live events and the official app', 'calendar'],
  ['ClubGG', 'Play online with friends', 'play'],
];
const FAQ: [string, string][] = [
  ['What does WSOP+ include?', 'WSOP TV, WSOP Academy, WSOP Live and ClubGG, under one membership. More may be added later.'],
  ['Do I need a GGPass account?', 'Yes. WSOP+ runs on your GGPass account — the same sign-in as WSOP TV.'],
  ['Where do I manage or cancel?', 'In WSOP+. Changes apply to WSOP TV straight away; you can cancel at any time.'],
];

export function Plans() {
  const { state, signedIn, requireLogin } = useApp();
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
      <h1 className="mt-1 text-title font-black">More of WSOP, in one membership</h1>
      <p className="mt-1 text-muted">One GGPass account, one subscription: watching, learning, live events and playing online. WSOP TV is part of it.</p>
      <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Included products">
        {PRODUCTS.map(([name, d, icon]) => (
          <li key={name} className="flex items-center gap-3 rounded-panel border border-line bg-surface p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-gold">
              <Icon name={icon} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block font-bold">{name}</span>
              <span className="block text-xs text-muted">{d}</span>
            </span>
          </li>
        ))}
      </ul>
      {!PRESENTATION && <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
        <span className="label rounded-[3px] border border-dashed border-line-strong px-1 py-px text-[9px]">Placeholder</span>
        Tier names, prices and what each tier covers aren’t final · WSOP TV currently included from: <b className="text-muted">{INCLUDED_FROM_LABEL[state.includedFrom]}</b>
      </p>}

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
              <p className="label mt-5 text-[10px] text-subtle">Across WSOP+</p>
              <ul className="mt-2 space-y-2">
                {ACROSS[tier].map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-text/85">
                    <Icon name="check" size={16} className="mt-0.5 shrink-0 text-subtle" /> {x}
                  </li>
                ))}
              </ul>

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
                    {!PRESENTATION && <span className="label rounded-[3px] border border-dashed border-line-strong px-1 text-[9px] text-subtle">Store policy check pending</span>}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section aria-label="Questions" className="mt-10">
        <h2 className="text-xl sm:text-2xl">Questions</h2>
        <dl className="mt-3 divide-y divide-line rounded-panel border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <div key={q} className="px-4 py-3">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-6 text-xs text-subtle">Continue to WSOP+ to join or upgrade; you’ll come straight back and WSOP TV re-checks your membership. No payment is taken in this demo.</p>
    </Page>
  );
}
