// "← Back" on every page that has one: the previous screen in history (exactly where you were, its scroll included);
// `fallback` only when the page was opened directly (no screen before it).
import { useNavigate } from 'react-router-dom';
import { cx } from './ui';

export function BackButton({ fallback = '/', className }: { fallback?: string; className?: string }) {
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav(fallback))} className={cx('text-sm text-muted hover:text-text', className)}>
      ← Back
    </button>
  );
}
