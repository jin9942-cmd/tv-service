import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal(props: { onClose: () => void; labelledBy: string; variant: 'gate' | 'promo' | 'panel'; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { onClose } = props;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      prev?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`modal modal-${props.variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.labelledBy}
        tabIndex={-1}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {props.children}
      </div>
    </div>,
    document.body,
  );
}
