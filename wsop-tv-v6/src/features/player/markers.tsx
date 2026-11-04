// Hand types: each has a distinct glyph AND tone, so markers never rely on colour alone.
import type { HandType } from '../../data/types';
import { cx } from '../../components/ui';

export const HAND_META: Record<HandType, { label: string; short: string; tone: string; ring: string }> = {
  allin: { label: 'All-in', short: 'A', tone: 'bg-gold text-ink', ring: 'ring-gold' },
  bigpot: { label: 'Big Pot', short: 'P', tone: 'bg-text text-ink', ring: 'ring-text' },
  bluff: { label: 'Bluff', short: 'B', tone: 'bg-surface-3 text-gold-strong border border-gold', ring: 'ring-gold' },
  badbeat: { label: 'Bad Beat', short: '!', tone: 'bg-surface-3 text-text border border-text', ring: 'ring-text' },
  herofold: { label: 'Hero Fold', short: 'F', tone: 'bg-surface-3 text-muted border border-line-strong', ring: 'ring-muted' },
};

/** Marker glyph: shape differs per type (circle / square / diamond). */
export function HandGlyph({ type, size = 18, className }: { type: HandType; size?: number; className?: string }) {
  const m = HAND_META[type];
  const shape = type === 'bigpot' ? 'rounded-[3px]' : type === 'badbeat' || type === 'bluff' ? 'rotate-45 rounded-[2px]' : 'rounded-full';
  return (
    <span className={cx('inline-flex items-center justify-center', className)} style={{ width: size, height: size }} aria-hidden>
      <span className={cx('flex size-full items-center justify-center text-[10px] leading-none font-black', shape, m.tone)}>
        <span className={type === 'badbeat' || type === 'bluff' ? '-rotate-45' : ''}>{m.short}</span>
      </span>
    </span>
  );
}

export function HandTypeTag({ type }: { type: HandType }) {
  return (
    <span className="label inline-flex items-center gap-1.5 text-[10px] text-muted">
      <HandGlyph type={type} size={14} /> {HAND_META[type].label}
    </span>
  );
}
