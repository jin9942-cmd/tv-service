// Playback-permission flow (login → upgrade → back to the same content).
// Separate from the promotional modal in components/PromoModal.tsx.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ACCESS_LABEL,
  PLAN_FEATURES,
  TIER_LABEL,
  TIER_ORDER,
  canAccess,
  minimumTier,
  type AccessLevel,
  type Tier,
} from '../config/entitlements';
import { authStore, useStore } from './stores';
import { Modal } from '../components/Modal';

interface GateRequest {
  level: AccessLevel;
  contentTitle: string;
}

interface GateApi {
  tier: Tier;
  open: (req: GateRequest) => void;
  isOpen: boolean;
}

const GateContext = createContext<GateApi | null>(null);

export function useGate(): GateApi {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('GateProvider missing');
  return ctx;
}

export function useAuth() {
  const auth = useStore(authStore);
  return {
    ...auth,
    signIn: (tier: Tier = 'free') => authStore.set({ tier, displayName: 'Demo Viewer' }),
    setTier: (tier: Tier) => authStore.set({ tier, displayName: tier === 'guest' ? null : 'Demo Viewer' }),
    signOut: () => authStore.set({ tier: 'guest', displayName: null }),
  };
}

export function GateProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [rawReq, setReq] = useState<(GateRequest & { path: string }) | null>(null);
  const location = useLocation();
  // A request belongs to the page it was made on: leaving the page cancels it and content stays locked.
  const req = rawReq && rawReq.path === location.pathname ? rawReq : null;

  // Close automatically once the user has enough access → player unlocks in place.
  useEffect(() => {
    if (req && canAccess(auth.tier, req.level)) setReq(null);
  }, [auth.tier, req]);

  const open = useCallback((r: GateRequest) => setReq({ ...r, path: window.location.pathname }), []);
  const api = useMemo(() => ({ tier: auth.tier, open, isOpen: !!req }), [auth.tier, open, req]);

  return (
    <GateContext.Provider value={api}>
      {children}
      {req && <GateModal req={req} tier={auth.tier} onClose={() => setReq(null)} onSignIn={() => auth.signIn('free')} onUpgrade={auth.setTier} />}
    </GateContext.Provider>
  );
}

function GateModal(props: {
  req: GateRequest;
  tier: Tier;
  onClose: () => void;
  onSignIn: () => void;
  onUpgrade: (t: Tier) => void;
}) {
  const { req, tier } = props;
  const required = minimumTier(req.level);
  const step = tier === 'guest' ? 'login' : 'upgrade';
  const plans = TIER_ORDER.filter((t) => t !== 'guest' && TIER_ORDER.indexOf(t) >= TIER_ORDER.indexOf(required)) as Exclude<Tier, 'guest'>[];

  return (
    <Modal onClose={props.onClose} labelledBy="gate-title" variant="gate">
      <p className="modal-kicker">
        <LockIcon /> Playback requires {step === 'login' ? 'sign-in' : `${TIER_LABEL[required]} plan`}
      </p>
      <h2 id="gate-title" className="modal-title">
        {step === 'login' ? 'Sign in to watch' : `Upgrade to ${TIER_LABEL[required]}`}
      </h2>
      <p className="modal-body">
        <strong>{req.contentTitle}</strong> is a <em>{ACCESS_LABEL[req.level]}</em> and needs the{' '}
        <strong>{TIER_LABEL[required]}</strong> plan or higher.{' '}
        {step === 'upgrade' && <>You are on <strong>{TIER_LABEL[tier]}</strong>. </>}
        After {step === 'login' ? 'signing in' : 'upgrading'} you return to this video.
      </p>

      {step === 'login' ? (
        <div className="modal-actions">
          <button className="btn btn-primary btn-block" onClick={props.onSignIn} autoFocus>
            Demo sign-in as “Demo Viewer” (Free)
          </button>
          <p className="fineprint">
            Demo only — no email, password, GGPass or other account is used. You can switch plans any time in Demo tools.
          </p>
        </div>
      ) : (
        <div className="plan-options">
          {plans.map((p) => (
            <button key={p} className={`plan-option ${p === required ? 'is-recommended' : ''}`} onClick={() => props.onUpgrade(p)}>
              <span className="plan-option-head">
                <span className="plan-option-name">{TIER_LABEL[p]}</span>
                <span className="plan-price">Demo plan</span>
              </span>
              <span className="plan-option-feat">{PLAN_FEATURES[p].slice(1).join(' · ')}</span>
              <span className="plan-option-cta">Activate demo {TIER_LABEL[p]}</span>
            </button>
          ))}
          <p className="fineprint">No payment is taken. Plans and prices are placeholders.</p>
        </div>
      )}
      <button className="btn btn-ghost btn-block" onClick={props.onClose}>
        Not now — keep browsing
      </button>
    </Modal>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="icon-inline">
      <path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z" />
    </svg>
  );
}
