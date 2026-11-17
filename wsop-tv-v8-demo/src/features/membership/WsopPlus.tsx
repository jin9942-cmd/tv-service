// Membership round-trip: WSOP TV → WSOP+ (join / upgrade, external-domain mock) → back to WSOP TV → re-check tier.
// WSOP TV never takes payment or shows why a payment failed — that's WSOP+'s job; WSOP TV only applies what it reads back.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MEMBERSHIP_PRICES, TIER_NAME, tierFull, type PaidTier } from '../../data/policy';
import { useApp } from '../../state/app';

const tierOf = (v: string | null): PaidTier => (v === 'premium' ? 'premium' : 'basic');

/** WSOP+ join / upgrade page (mock of another domain). The outcome comes from Demo Controls → Payment result. */
export function WsopPlusJoin() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state, set } = useApp();
  const tier = tierOf(params.get('tier'));
  const returnTo = params.get('return') || '/';
  const [busy, setBusy] = useState(false);
  const back = () => nav(`/membership/check?${new URLSearchParams({ return: returnTo })}`, { replace: true });

  const complete = () => {
    setBusy(true);
    window.setTimeout(() => {
      // WSOP+ records the membership only on success; fail / cancel leave it unchanged (WSOP+ explains why on its side).
      if (state.paymentResult === 'success') set({ wsopPlusRecord: tier });
      back();
    }, 1200);
  };

  return (
    <div className="min-h-dvh bg-ext-bg font-sans text-ext-ink">
      <div className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-2 text-xs text-black/60">
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="ml-3 flex flex-1 items-center gap-1.5 truncate rounded-md bg-black/5 px-3 py-1 font-mono">🔒 plus.wsop.example/membership/join</span>
        <span className="hidden rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white sm:inline">DEMO MOCK</span>
      </div>
      <main className="mx-auto flex max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-black tracking-tight">
            WSOP<span className="text-ext-brand">+</span>
          </p>
          <p className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-black/60 shadow-sm">
            <span className="inline-flex size-4 items-center justify-center rounded bg-black text-[9px] font-black text-[#d4af37]">G</span> GGPass · demo.viewer@example.com
          </p>
        </div>
        <section aria-labelledby="plus-title" className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-black/50">{state.scenario === 'basic' && tier === 'premium' ? 'Upgrade membership' : 'Join membership'}</p>
          <h1 id="plus-title" className="mt-1 text-xl font-bold">
            {tierFull(tier)}
          </h1>
          <p className="mt-2 text-3xl font-black">
            {MEMBERSHIP_PRICES[tier].monthly}
            <span className="text-sm font-semibold text-black/50"> / month</span>
          </p>
          <p className="mt-1 text-xs text-black/50">
            Pricing to be confirmed · billed and managed in WSOP+ · includes WSOP TV per your {TIER_NAME[tier]} tier
          </p>
          <p className="mt-4 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-xs text-black/55">
            Demo mock — no payment details are entered or stored. The result is set in WSOP TV’s Demo Controls (Payment result).
          </p>
          <button
            onClick={complete}
            disabled={busy}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ext-brand text-sm font-bold text-white hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ext-brand/30 focus-visible:outline-none disabled:opacity-70"
          >
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />}
            {busy ? 'Processing…' : 'Complete (demo)'}
          </button>
          <button onClick={back} className="mt-2 h-10 w-full rounded-lg text-sm font-semibold text-black/60 hover:bg-black/5">
            Cancel
          </button>
        </section>
      </main>
    </div>
  );
}

/** Back on WSOP TV: re-read the WSOP+ tier, apply it, and return to the content (or its gate). */
export function MembershipCheck() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state, set, toast } = useApp();
  const returnTo = params.get('return') || '/';

  useEffect(() => {
    const t = window.setTimeout(() => {
      const rec = state.wsopPlusRecord;
      if (rec) {
        set({ scenario: rec, paidTier: rec, wsopPlusRecord: null });
        toast(`${tierFull(rec)} is active — enjoy WSOP TV`);
      }
      // Not upgraded → the content's gate shows again; WSOP+ already told the viewer why.
      nav(returnTo, { replace: true });
    }, 1500);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center" role="status">
      <span className="size-9 animate-spin rounded-full border-[3px] border-gold border-t-transparent" aria-hidden />
      <p className="text-lg font-semibold">Checking your WSOP+ membership…</p>
      <p className="text-sm text-muted">You’ll be taken back in a moment.</p>
    </div>
  );
}
