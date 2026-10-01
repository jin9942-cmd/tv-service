// Promotional modal: shown once per session to guests after some browsing.
// Deliberately styled/labelled differently from the playback-permission modal (state/gate.tsx).
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { useAuth, useGate } from '../state/gate';

const KEY = 'wsoptv.demo.promoShown';
const PAGES_BEFORE_PROMO = 4;

function alreadyShown() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function PromoModal() {
  const { tier } = useAuth();
  const gate = useGate();
  const location = useLocation();
  const seen = useRef(new Set<string>());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    seen.current.add(location.pathname);
    if (tier !== 'guest' || gate.isOpen || alreadyShown()) return;
    if (seen.current.size >= PAGES_BEFORE_PROMO) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [location.pathname, tier, gate.isOpen]);

  // Never stack on top of the playback modal.
  useEffect(() => {
    if (gate.isOpen) setOpen(false);
  }, [gate.isOpen]);

  if (!open) return null;
  const close = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Modal onClose={close} labelledBy="promo-title" variant="promo">
      <p className="modal-kicker promo-kicker">Promotion · you can keep browsing</p>
      <h2 id="promo-title" className="modal-title">
        Follow every table, live
      </h2>
      <p className="modal-body">
        Demo plans unlock the main feature-table stream, full replays and extra table cameras. Nothing is charged — this is a
        prototype.
      </p>
      <div className="modal-actions">
        <Link to="/#plans" className="btn btn-primary btn-block" onClick={close}>
          See demo plans
        </Link>
        <button className="btn btn-ghost btn-block" onClick={close}>
          No thanks
        </button>
      </div>
    </Modal>
  );
}
