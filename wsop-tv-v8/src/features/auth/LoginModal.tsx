import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../state/app';
import { Button, Modal } from '../../components/ui';
import { Wordmark } from '../../components/Layout';

/** Sign-in entry: GGPASS SSO first, email sign-up as the secondary option. */
export function LoginModal() {
  const { login, closeLogin } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(false);
  if (!login) return null;
  const returnTo = login.returnTo ?? loc.pathname + loc.search;
  const go = (mode: 'signin' | 'signup') => {
    closeLogin();
    nav(`/auth/ggpass?mode=${mode}&return=${encodeURIComponent(returnTo)}`);
  };

  return (
    <Modal onClose={closeLogin} labelledBy="login-title">
      <div className="mb-5 flex items-center justify-between">
        <Wordmark />
        <button onClick={closeLogin} className="text-sm font-semibold text-muted hover:text-text">
          Close
        </button>
      </div>
      <h2 id="login-title" className="text-2xl font-black tracking-tight">
        Sign in to WSOP TV
      </h2>
      <p className="mt-1 text-sm text-muted">{login.reason}</p>
      <p className="mt-3 rounded-chip border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
        Sign in with GGPass — <b className="text-text">WSOP+ Free</b> is included with every GGPass account.
      </p>

      <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => go('signin')}>
        <GGPassMark /> Continue with GGPASS
      </Button>
      <p className="mt-2 text-center text-xs text-subtle">You'll sign in on GGPASS and come straight back here.</p>

      <div className="my-6 flex items-center gap-3 text-xs text-subtle">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {email ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go('signup');
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold">
            Email
            <input type="email" required autoComplete="off" placeholder="you@example.com" className="mt-1 h-11 w-full rounded-chip border border-line-strong bg-surface-2 px-3 text-sm font-normal placeholder:text-subtle" />
          </label>
          <p className="text-xs text-subtle">Email sign-up creates a GGPASS account. Demo only — nothing is sent or stored.</p>
          <Button type="submit" variant="outline" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setEmail(true)}>
          Sign up with email
        </Button>
      )}
      <p className="mt-6 text-center text-[11px] leading-relaxed text-subtle">By continuing you agree to the Terms of Use and Privacy Policy. Viewing service only — no real-money play.</p>
    </Modal>
  );
}

export function GGPassMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex size-5 items-center justify-center rounded-[5px] bg-ink text-[10px] font-black text-gold ${className}`} aria-hidden>
      G
    </span>
  );
}
