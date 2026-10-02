import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal(props: { onClose: () => void; labelledBy: string; variant: 'gate' | 'promo' | 'panel'; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Captured during render, before autoFocus inside the modal moves focus.
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  const { onClose } = props;
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Mount/unmount only: re-running on every parent render would bounce focus around.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      const prev = returnFocus.current;
      if (prev && prev.isConnected) prev.focus();
    };
  }, []);

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
