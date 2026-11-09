// WSOP+ under the WSOP TV menu (v7): the wsop.com/plus page as the WSOP team gave it — the membership banner on the
// wsop.com/plus banner image (no Sign up button), "Choose your plan" with WSOP Academy, WSOP Live and ClubGG rows for Free,
// Basic and Premium, the FAQ, and the closing band. Get Started goes through the WSOP+ join mock and comes back; nothing
// is charged in the demo.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { memberTier, useApp } from '../../state/app';
import type { PaidTier } from '../../data/policy';
import { Icon, cx } from '../../components/ui';

const PROMO = `${import.meta.env.BASE_URL}promo/`;
/** The wsop.com/plus banner and closing-band images. */
const HERO_BG = `${PROMO}plus-hero-bg.webp`;
const CTA_BG = `${PROMO}plus-cta-bg.webp`;

/** wsop.com/plus FAQ. The first answer is wsop.com's; the others are short demo answers. */
const FAQ: [string, string][] = [
  ['Which products and services are part of the WSOP+ subscription?', 'WSOP Academy, WSOP Live, and ClubGG are included in the WSOP+ subscription. Additional products and services may be added in the future.'],
  ['What subscription options does WSOP+ offer?', 'Free, WSOP+ Basic ($9.99 / month) and WSOP+ Premium ($49.99 / month). See Choose your plan above for what each includes.'],
  ['Do I need a GG Pass account to sign up for WSOP+?', 'Yes. WSOP+ runs on your GG Pass account — the same account you sign in to WSOP TV with.'],
  ['How can I manage my subscription?', 'From your WSOP+ account: change plan, update your payment method or see your billing history.'],
  ['Can I cancel my subscription at any time?', 'Yes. You keep your benefits until the end of the period you have paid for.'],
  ['Can I receive a refund on my subscription?', 'Refunds follow the WSOP+ Terms of Service.'],
];

type Col = 'free' | 'basic' | 'premium';
const PLANS: { id: Col; name: string; price: string; popular?: boolean }[] = [
  { id: 'free', name: 'Free', price: '$0.00' },
  { id: 'basic', name: 'WSOP+ Basic', price: '$9.99' },
  { id: 'premium', name: 'WSOP+ Premium', price: '$49.99', popular: true },
];
const ROWS: { product: string; items: Record<Col, string[]> }[] = [
  {
    product: 'WSOP Academy',
    items: {
      free: ['Get your free Poker IQ and see how you stack up against your friends!', 'Full access to the complete Academy curriculum: every unit, every lesson, every exam', 'Take on Finn, the first challenger in every level', 'Train daily with 10 free High Roller Table hands'],
      basic: ['Take on the named-pro challengers; Maria Ho, Michael Mizrachi, and Daniel Negreanu', '50 High Roller Table hands per day'],
      premium: ['Unlock Sharky - the apex challenger of the Academy', 'Unlimited High Roller Table hands - no daily cap'],
    },
  },
  {
    product: 'WSOP Live',
    items: {
      free: ['The official WSOP App', 'Enhance your WSOP experience'],
      basic: ['One Access per day to Plus Lounge', 'WSOP Store 5% off'],
      premium: ['Unlimited access to Plus lounge', 'Special Merchandise at WSOP Store'],
    },
  },
  {
    product: 'ClubGG',
    items: {
      free: ['Play with your friends & family'],
      basic: ['Stage 1 access once per day', 'Multi-table on PC/Mac: up to 6 tables', 'Included features: PokerCraft, Smart HUD, Rabbit Hunt, Splash, Card Squeeze'],
      premium: ['Unlimited Stage 1 access', 'Final Stage re-entry', 'Multi-table on PC/Mac: up to 12 tables', 'Included features: PokerCraft, Smart HUD, Rabbit Hunt, Splash, Card Squeeze'],
    },
  },
];
const HEAD: Record<Col, string> = {
  free: 'bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a]',
  basic: 'bg-gradient-to-b from-[#7a2418] to-[#3a1a16]',
  premium: 'bg-gradient-to-b from-[#6a2a8a] to-[#3a1d4a]',
};
const BUTTON: Record<Col, string> = { free: '', basic: 'bg-[#d6432f] hover:bg-[#e35541]', premium: 'bg-[#a43fd0] hover:bg-[#b452de]' };
const CHECK: Record<Col, string> = { free: 'text-subtle', basic: 'text-[#d6432f]', premium: 'text-[#a43fd0]' };

export function WsopPlusPage() {
  const { state, signedIn, requireLogin } = useApp();
  const nav = useNavigate();
  const have = memberTier(state);
  const start = (tier: PaidTier) => {
    if (!signedIn) return requireLogin({ reason: 'WSOP+ runs on your GGPass account. Sign in first, then choose a membership.', returnTo: '/wsop-plus' });
    nav(`/wsop-plus/join?${new URLSearchParams({ tier, return: '/wsop-plus' })}`);
  };
  return (
    <>
      <section aria-label="WSOP+ membership" className="relative overflow-hidden">
        <img src={HERO_BG} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative mx-auto flex max-w-content flex-col items-center px-gutter py-16 text-center sm:py-20">
          <h1 className="text-[2.6rem] leading-none text-[#e0402c] sm:text-[4.2rem]">WSOP+ Membership</h1>
          <p className="mt-3 font-display text-[1.6rem] leading-tight uppercase sm:text-[2.6rem]">Get the best out of your WSOP experience</p>
          <p className="mt-4 max-w-md text-sm text-white/85">One subscription gives you access to more across poker — live events, learning, watching, staking, and playing online.</p>
        </div>
      </section>

      <section aria-label="Choose your plan" className="mx-auto max-w-[70rem] px-gutter py-14 sm:px-6">
        <h2 className="text-center text-2xl sm:text-3xl">Choose your plan</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-separate border-spacing-[3px] text-left text-[13px]">
            <thead>
              <tr>
                <th className="w-[16%] bg-surface-2" aria-hidden />
                {PLANS.map((p) => {
                  // Only the tier held now says so; every other paid column keeps Get Started, as on wsop.com.
                  const mine = p.id !== 'free' && signedIn && have === p.id;
                  return (
                    <th key={p.id} scope="col" className={cx('w-[28%] p-5 align-top font-normal', HEAD[p.id])}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-lg font-semibold">{p.name}</span>
                        {p.popular && <span className="rounded-[4px] bg-[#c9a961]/25 px-2 py-0.5 text-[11px] font-semibold text-[#e9d29a]">Most Popular</span>}
                      </span>
                      <span className="mt-1 block">
                        <span className="font-display text-[2.4rem] leading-none">{p.price}</span>
                        <span className="ml-1.5 text-xs text-white/60">/ Month</span>
                      </span>
                      {p.id !== 'free' &&
                        (mine ? (
                          <span className="mt-5 flex h-10 items-center justify-center bg-white/10 text-sm font-bold">Current plan</span>
                        ) : (
                          <button onClick={() => start(p.id as PaidTier)} className={cx('mt-5 h-10 w-full text-sm font-bold text-white', BUTTON[p.id])}>
                            Get Started
                          </button>
                        ))}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.product}>
                  <th scope="row" className="bg-surface-2 px-5 py-4 text-sm font-bold">
                    {r.product}
                  </th>
                  {PLANS.map((p) => (
                    <td key={p.id} className="bg-surface px-5 py-4 align-top">
                      <ul className="space-y-2.5">
                        {r.items[p.id].map((x) => (
                          <li key={x} className="flex gap-2 text-text/85">
                            <Icon name="check" size={14} className={cx('mt-0.5 shrink-0', CHECK[p.id])} />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-8 text-center text-[13px] text-text/80">Be on the lookout! New subscriber benefits coming soon!</p>
      </section>
      <Faq />

      <section aria-label="Your seat at the table is waiting" className="relative overflow-hidden">
        <img src={CTA_BG} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-black/40" aria-hidden />
        <div className="relative mx-auto max-w-content px-gutter py-14 text-center">
          <h2 className="text-2xl sm:text-4xl">Your seat at the table is waiting</h2>
          <p className="mt-2 text-sm text-white/85">Subscribe today to get the best out of your WSOP experience</p>
        </div>
      </section>
    </>
  );
}

/** Frequently asked questions: one open at a time, the first open to start. */
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section aria-label="Frequently asked questions" className="mx-auto max-w-[56rem] px-gutter pb-16 sm:px-6">
      <h2 className="text-center text-2xl sm:text-3xl">Frequently asked questions</h2>
      <ul className="mt-8 border-t border-line">
        {FAQ.map(([q, a], i) => (
          <li key={q} className="border-b border-line">
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-3 py-5 text-left text-[15px] font-medium">
              {q}
              <Icon name="chevron" size={18} className={cx('shrink-0 transition-transform', open === i ? '-rotate-90' : 'rotate-90')} />
            </button>
            {open === i && <p className="px-3 pb-5 text-sm leading-relaxed text-muted">• {a}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
