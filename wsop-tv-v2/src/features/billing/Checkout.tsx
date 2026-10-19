// Subscription payment step — two candidate billing models side by side (decision pending):
//  - Web checkout: order review (WSOP TV) → WSOP+ payment page (separate domain, mock) → result
//  - In-app purchase: platform payment sheet (App Store / Google Play …, mock) → result
// No payment details are ever entered: every payment UI here is a mock with buttons only.
// The outcome (success / fail / cancel) comes from Demo Controls → Billing.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PRICES, STORE_NAME, fmtBillingDate, renewalDate, type PlanId } from '../../data/policy';
import { PLATFORMS } from '../../data/platforms';

import { useApp } from '../../state/app';
import { Button, Icon, Modal, Page, Placeholder, cx } from '../../components/ui';

const PLAN_NAME: Record<PlanId, string> = { monthly: 'Monthly', annual: 'Annual' };
const planOf = (v: string | null): PlanId => (v === 'monthly' ? 'monthly' : 'annual');
const qs = (o: Record<string, string>) => new URLSearchParams(o).toString();

/** Activate the subscription (demo) — shared by both billing models. */
function useActivate() {
  const { set } = useApp();
  return (plan: PlanId) => set({ scenario: 'active', plan, cancelScheduled: false });
}

// ---- Web checkout: order review ---------------------------------------------------------------

export function Checkout() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const plan = planOf(params.get('plan'));
  const returnTo = params.get('return') || '/';
  const price = PRICES[plan];
  const renews = fmtBillingDate(renewalDate(plan));
  return (
    <Page className="max-w-xl">
      <Link to="/plans" state={{ returnTo }} className="text-sm font-semibold text-muted hover:text-text">
        ← Plans
      </Link>
      <p className="label mt-4 text-gold">Step 1 of 2 · Review</p>
      <h1 className="mt-1 text-title font-black">Confirm your order</h1>
      <dl className="mt-6 divide-y divide-line rounded-panel border border-line bg-surface">
        <Line k="Plan" v={`WSOP TV ${PLAN_NAME[plan]}`} />
        <Line
          k="Price"
          v={
            <>
              {price.label} <span className="text-muted">{price.per}</span> <Placeholder />
            </>
          }
        />
        <Line k="Billed today" v={price.label} />
        <Line k="Next renewal" v={renews} />
      </dl>
      <p className="mt-4 text-sm text-muted">
        Renews automatically on {renews}. Cancel anytime before then in Account → Subscription — you keep access until the end of the billing period.
      </p>
      <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => nav(`/pay/wsop-plus?${qs({ plan, return: returnTo })}`)}>
        Continue to secure payment
      </Button>
      <p className="mt-3 text-center text-xs text-subtle">You’ll pay on WSOP+ and come straight back here. No payment is taken in this demo.</p>
    </Page>
  );
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted">{k}</dt>
      <dd className="text-right text-sm font-semibold tnum">{v}</dd>
    </div>
  );
}

// ---- Web checkout: WSOP+ payment page (external-domain mock) -----------------------------------

const METHODS = ['Saved payment method (demo)', 'PayPal (demo)', 'Bank transfer (demo)'];

export function WsopPlusPay() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state, toast } = useApp();
  const activate = useActivate();
  const plan = planOf(params.get('plan'));
  const returnTo = params.get('return') || '/';
  const [method, setMethod] = useState(0);
  const [changing, setChanging] = useState(params.get('method') === 'change');
  const [busy, setBusy] = useState(false);

  const pay = () => {
    setBusy(true);
    window.setTimeout(() => {
      if (state.paymentResult === 'cancel') {
        toast('Payment cancelled');
        return nav('/plans', { state: { returnTo } });
      }
      if (state.paymentResult === 'success') activate(plan);
      nav(`/checkout/result?${qs({ status: state.paymentResult, plan, via: 'web', return: returnTo })}`, { replace: true });
    }, 1300);
  };

  return (
    <div className="min-h-dvh bg-ext-bg font-sans text-ext-ink">
      <div className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-2 text-xs text-black/60">
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="ml-3 flex flex-1 items-center gap-1.5 truncate rounded-md bg-black/5 px-3 py-1 font-mono">🔒 pay.wsopplus.example/checkout</span>
        <span className="hidden rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white sm:inline">DEMO MOCK</span>
      </div>
      <main className="mx-auto flex max-w-md flex-col px-6 py-10">
        <p className="text-2xl font-black tracking-tight">
          WSOP<span className="text-ext-brand">+</span>
        </p>
        <section aria-labelledby="pay-title" className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-black/50">Step 2 of 2 · Payment</p>
          <h1 id="pay-title" className="mt-1 text-xl font-bold">
            WSOP TV {PLAN_NAME[plan]}
          </h1>
          <p className="mt-1 text-sm text-black/60">
            {PRICES[plan].label} {PRICES[plan].per} · renews {fmtBillingDate(renewalDate(plan))} <span className="rounded border border-dashed border-black/30 px-1 text-[10px]">PLACEHOLDER</span>
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Pay with</p>
              {!changing && (
                <button onClick={() => setChanging(true)} className="text-sm font-semibold text-ext-brand hover:underline">
                  Change
                </button>
              )}
            </div>
            {changing ? (
              <div role="radiogroup" aria-label="Payment method" className="mt-2 space-y-2">
                {METHODS.map((m, i) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={method === i}
                    onClick={() => (setMethod(i), setChanging(false))}
                    className={cx('flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm', method === i ? 'border-ext-brand bg-ext-brand/5' : 'border-black/10 hover:bg-black/5')}
                  >
                    {m}
                    {method === i && <span className="text-ext-brand">✓</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-sm">{METHODS[method]}</p>
            )}
            <p className="mt-2 text-xs text-black/50">Demo mock — no card or account details are entered or stored.</p>
          </div>

          <button
            onClick={pay}
            disabled={busy}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ext-brand text-sm font-bold text-white hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ext-brand/30 focus-visible:outline-none disabled:opacity-70"
          >
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />}
            {busy ? 'Processing…' : `Pay ${PRICES[plan].label} (demo)`}
          </button>
          <button onClick={() => nav('/plans', { state: { returnTo } })} className="mt-2 h-10 w-full rounded-lg text-sm font-semibold text-black/60 hover:bg-black/5">
            Cancel and return to WSOP TV
          </button>
        </section>
      </main>
    </div>
  );
}

// ---- In-app purchase: platform payment sheet --------------------------------------------------

export function IapSheet({ plan, returnTo, onClose }: { plan: PlanId; returnTo: string; onClose: () => void }) {
  const { state, toast } = useApp();
  const nav = useNavigate();
  const activate = useActivate();
  const [busy, setBusy] = useState(false);
  const store = STORE_NAME[state.platform];
  const noIap = PLATFORMS[state.platform].kind === 'web';

  const buy = () => {
    setBusy(true);
    window.setTimeout(() => {
      if (state.paymentResult === 'cancel') {
        onClose();
        return toast('Purchase cancelled');
      }
      if (state.paymentResult === 'success') activate(plan);
      nav(`/checkout/result?${qs({ status: state.paymentResult, plan, via: 'iap', return: returnTo })}`);
    }, 1300);
  };

  return (
    <Modal onClose={onClose} labelledBy="iap-title">
      {noIap ? (
        <>
          <h2 id="iap-title" className="text-xl font-bold">
            In-app purchase isn’t available in a browser
          </h2>
          <p className="mt-2 text-sm text-muted">Pick iOS, iPadOS or Android (Demo Controls → Platform) to see the store sheet, or use web checkout here.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => nav(`/checkout?${qs({ plan, return: returnTo })}`)}>
              Use web checkout
            </Button>
          </div>
        </>
      ) : (
        <div className="-m-6 rounded-t-panel bg-[#f2f2f4] p-6 text-[#111] sm:rounded-panel">
          <div className="flex items-center justify-between">
            <p id="iap-title" className="text-sm font-bold">
              {store}
            </p>
            <span className="rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">DEMO MOCK</span>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white p-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#0b0b0f] text-xs font-black text-[#d4af37]">TV</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">WSOP TV {PLAN_NAME[plan]}</p>
              <p className="text-xs text-black/55">Subscription · renews {fmtBillingDate(renewalDate(plan))}</p>
            </div>
            <p className="text-right text-sm font-bold">
              {PRICES[plan].label}
              <span className="block text-[10px] font-semibold text-black/45">PLACEHOLDER</span>
            </p>
          </div>
          <p className="mt-3 text-xs text-black/55">Billed to your {store} account. Manage or cancel anytime in your {store} subscriptions.</p>
          <button onClick={buy} disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a73e8] text-[15px] font-bold text-white disabled:opacity-70">
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />}
            {busy ? 'Confirming…' : 'Subscribe'}
          </button>
          <button onClick={onClose} className="mt-2 h-10 w-full rounded-xl text-sm font-semibold text-black/60 hover:bg-black/5">
            Cancel
          </button>
        </div>
      )}
    </Modal>
  );
}

// ---- Result (both models) -----------------------------------------------------------------------

export function CheckoutResult() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { state, toast } = useApp();
  const status = params.get('status') === 'success' ? 'success' : 'fail';
  const plan = planOf(params.get('plan'));
  const via = params.get('via') === 'iap' ? 'iap' : 'web';
  const returnTo = params.get('return') || '/';
  const store = STORE_NAME[state.platform];
  const [left, setLeft] = useState(4);

  // Success → back to the content the purchase started from.
  useEffect(() => {
    if (status !== 'success') return;
    if (left <= 0) return void nav(returnTo, { replace: true });
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [status, left, nav, returnTo, loc.key]);

  if (status === 'success')
    return (
      <Page className="max-w-xl py-16 text-center" >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ok/15 text-ok">
          <Icon name="check" size={30} />
        </span>
        <h1 className="mt-4 text-title font-black">You’re subscribed</h1>
        <p className="mt-2 text-muted">
          WSOP TV {PLAN_NAME[plan]} is active · renews {fmtBillingDate(renewalDate(plan))}
          {via === 'iap' && ` · billed by ${store}`}
        </p>
        <p className="mt-6 text-sm text-subtle" role="status">
          Taking you back in {left}s…
        </p>
        <Button variant="primary" size="lg" className="mt-3" onClick={() => nav(returnTo, { replace: true })}>
          Continue watching
        </Button>
      </Page>
    );

  return (
    <Page className="max-w-xl py-16 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-live/15 text-live">
        <Icon name="close" size={28} />
      </span>
      <h1 className="mt-4 text-title font-black">Payment didn’t go through</h1>
      <p className="mt-2 text-muted" role="alert">
        {via === 'web' ? 'Your payment method was declined. Nothing was charged.' : `${store} couldn’t complete the purchase. Nothing was charged.`}
        <span className="mt-1 block text-xs text-subtle">Reason shown is a demo example.</span>
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={() => (via === 'web' ? nav(`/pay/wsop-plus?${qs({ plan, return: returnTo })}`) : nav('/plans', { state: { returnTo, openSheet: true, plan } }))}>
          Try again
        </Button>
        <Button
          variant="outline"
          onClick={() => (via === 'web' ? nav(`/pay/wsop-plus?${qs({ plan, return: returnTo, method: 'change' })}`) : toast(`Opens ${store} payment settings (demo)`))}
        >
          <Icon name="card" size={16} /> Change payment method
        </Button>
      </div>
      <Link to="/plans" state={{ returnTo }} className="mt-5 inline-block text-sm font-semibold text-muted hover:text-text">
        Back to plans
      </Link>
    </Page>
  );
}
