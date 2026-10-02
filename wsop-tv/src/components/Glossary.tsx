// Optional "Poker terms" help: tap a highlighted term in app text to see a short definition.
// Desktop: anchored popover. Mobile (<768px): bottom sheet. Off by default; not tied to plans or badges.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, type GlossaryTerm } from '../config/glossary';
import { prefsStore, useStore } from '../state/stores';
import { track } from '../lib/analytics';

interface GlossaryApi {
  enabled: boolean;
  show: (termId: string, anchor: HTMLElement) => void;
}

const GlossaryContext = createContext<GlossaryApi>({ enabled: false, show: () => {} });

export function useGlossaryEnabled() {
  return useStore(prefsStore).glossary;
}

export function setGlossaryEnabled(on: boolean) {
  prefsStore.set((p) => ({ ...p, glossary: on }));
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const enabled = useGlossaryEnabled();
  const [open, setOpen] = useState<{ term: GlossaryTerm; anchor: HTMLElement } | null>(null);

  const show = useCallback((termId: string, anchor: HTMLElement) => {
    const term = GLOSSARY.find((t) => t.id === termId);
    if (!term) return;
    setOpen({ term, anchor });
    track('glossary_opened', { term: termId });
  }, []);

  const close = useCallback(() => {
    setOpen((cur) => {
      cur?.anchor.focus?.();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!enabled) setOpen(null);
  }, [enabled]);

  const api = useMemo(() => ({ enabled, show }), [enabled, show]);
  return (
    <GlossaryContext.Provider value={api}>
      {children}
      {open && <TermPanel term={open.term} anchor={open.anchor} onClose={close} />}
    </GlossaryContext.Provider>
  );
}

const isMobile = () => {
  try {
    return window.matchMedia('(max-width: 767px)').matches;
  } catch {
    return false;
  }
};

function TermPanel({ term, anchor, onClose }: { term: GlossaryTerm; anchor: HTMLElement; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mobile] = useState(isMobile);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (mobile) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = Math.min(320, window.innerWidth - 16);
      const h = ref.current?.offsetHeight ?? 140;
      const below = r.bottom + 8 + h < window.innerHeight;
      setPos({
        top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - h),
        left: Math.min(Math.max(8, r.left), window.innerWidth - w - 8),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, mobile]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      if (!mobile && !ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [anchor, mobile, onClose]);

  const body = (
    <div
      ref={ref}
      className={mobile ? 'term-sheet' : 'term-popover'}
      role="dialog"
      aria-modal={mobile}
      aria-labelledby="term-title"
      style={!mobile && pos ? { top: pos.top, left: pos.left } : undefined}
    >
      {mobile && <span className="sheet-handle" aria-hidden="true" />}
      <div className="term-head">
        <p id="term-title" className="term-title">
          {term.term}
        </p>
        <button ref={closeRef} className="term-close" onClick={onClose} aria-label="Close definition">
          ×
        </button>
      </div>
      <p className="term-def">{term.definition}</p>
      <p className="term-foot">
        Poker terms help is on ·{' '}
        <button className="link-inline" onClick={() => setGlossaryEnabled(false)}>
          Turn off
        </button>
      </p>
    </div>
  );

  return createPortal(
    mobile ? (
      <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {body}
      </div>
    ) : (
      body
    ),
    document.body,
  );
}

// ---- term highlighting -------------------------------------------------------

const VARIANTS = GLOSSARY.flatMap((t) => t.match.map((m) => ({ text: m, id: t.id }))).sort((a, b) => b.text.length - a.text.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERN = new RegExp(`(?<![\\w-])(${VARIANTS.map((v) => escape(v.text)).join('|')})(?![\\w-])`, 'g');
const ID_BY_TEXT = new Map(VARIANTS.map((v) => [v.text, v.id]));

/** Renders text; when Poker terms is on, known terms become tappable (first occurrence of each term). */
export function GlossaryText({ children }: { children: string }) {
  const { enabled, show } = useContext(GlossaryContext);
  if (!enabled) return <>{children}</>;

  const out: ReactNode[] = [];
  const used = new Set<string>();
  let last = 0;
  for (const m of children.matchAll(PATTERN)) {
    const id = ID_BY_TEXT.get(m[0]);
    if (!id || used.has(id)) continue;
    used.add(id);
    if (m.index! > last) out.push(children.slice(last, m.index));
    out.push(
      <button key={m.index} type="button" className="term" onClick={(e) => show(id, e.currentTarget)} aria-haspopup="dialog">
        {m[0]}
      </button>,
    );
    last = m.index! + m[0].length;
  }
  out.push(children.slice(last));
  return <>{out}</>;
}

/** On/off switch for the optional help. */
export function GlossaryToggle({ compact }: { compact?: boolean }) {
  const enabled = useGlossaryEnabled();
  return (
    <button
      type="button"
      className={`glossary-toggle ${enabled ? 'is-on' : ''} ${compact ? 'is-compact' : ''}`}
      role="switch"
      aria-checked={enabled}
      onClick={() => setGlossaryEnabled(!enabled)}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      Poker terms {compact ? '' : 'help'}
    </button>
  );
}
