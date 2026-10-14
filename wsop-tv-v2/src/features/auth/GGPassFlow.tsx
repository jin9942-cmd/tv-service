// Mock of the external GGPASS domain: sign-in → consent → redirect back.
// Deliberately a different (light) visual tone so it reads as another site. No credentials are collected.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../state/app';

type Step = 'signin' | 'consent' | 'return';

export function GGPassFlow() {
  const [params] = useSearchParams();
  const returnTo = params.get('return') || '/';
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [step, setStep] = useState<Step>('signin');
  const { set, toast } = useApp();
  const nav = useNavigate();

  useEffect(() => {
    if (step !== 'return') return;
    const t = window.setTimeout(() => {
      // New SSO users arrive without a subscription → the plan picker appears at play time.
      set((s) => ({ scenario: s.scenario === 'guest' ? 'noSub' : s.scenario }));
      toast('Signed in with GGPASS');
      nav(returnTo, { replace: true });
    }, 1400);
    return () => window.clearTimeout(t);
  }, [step, set, toast, nav, returnTo]);

  return (
    <div className="min-h-dvh bg-ext-bg font-sans text-ext-ink">
      {/* fake browser address bar to signal "you are on another domain" */}
      <div className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-2 text-xs text-black/60">
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="ml-3 flex flex-1 items-center gap-1.5 rounded-md bg-black/5 px-3 py-1 font-mono">🔒 accounts.ggpass.example/{step === 'consent' ? 'oauth/consent' : 'login'}</span>
        <span className="hidden rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white sm:inline">DEMO MOCK</span>
      </div>

      <main className="mx-auto flex max-w-md flex-col px-6 py-12">
        <p className="text-2xl font-black tracking-tight text-ext-brand">GGPASS</p>
        {step === 'signin' && (
          <section aria-labelledby="gg-title" className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h1 id="gg-title" className="text-xl font-bold">
              {mode === 'signup' ? 'Create your GGPASS account' : 'Sign in to continue to WSOP TV'}
            </h1>
            <p className="mt-1 text-sm text-black/60">One account for the WSOP family of services.</p>
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-sm text-black/50">demo.viewer@example.com</div>
              <div className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-sm text-black/40">••••••••••</div>
            </div>
            <p className="mt-2 text-xs text-black/50">Demo mock — fields are pre-filled placeholders; nothing is entered or sent.</p>
            <button onClick={() => setStep('consent')} className="mt-6 h-11 w-full rounded-lg bg-ext-brand text-sm font-bold text-white hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ext-brand/30 focus-visible:outline-none">
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <button onClick={() => nav(returnTo)} className="mt-2 h-10 w-full rounded-lg text-sm font-semibold text-black/60 hover:bg-black/5">
              Cancel and return to WSOP TV
            </button>
          </section>
        )}

        {step === 'consent' && (
          <section aria-labelledby="gg-consent" className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h1 id="gg-consent" className="text-xl font-bold">
              WSOP TV wants to access your GGPASS account
            </h1>
            <p className="mt-3 text-sm text-black/70">This will share only:</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-ext-brand">✓</span> Email address
              </li>
              <li className="flex items-center gap-2">
                <span className="text-ext-brand">✓</span> Nickname
              </li>
            </ul>
            <p className="mt-3 text-xs text-black/50">WSOP TV won't see your password or any other account details. You can revoke access anytime in GGPASS settings.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={() => nav(returnTo)} className="h-11 rounded-lg border border-black/15 text-sm font-semibold hover:bg-black/5">
                Deny
              </button>
              <button onClick={() => setStep('return')} className="h-11 rounded-lg bg-ext-brand text-sm font-bold text-white hover:brightness-110">
                Allow
              </button>
            </div>
          </section>
        )}

        {step === 'return' && (
          <section className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm" role="status">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-ext-brand border-t-transparent" aria-hidden />
            <p className="mt-4 font-semibold">Returning to WSOP TV…</p>
            <p className="mt-1 text-xs text-black/50">Redirecting with an authorization code (OAuth 2.0 / OIDC, assumed)</p>
          </section>
        )}
      </main>
    </div>
  );
}
