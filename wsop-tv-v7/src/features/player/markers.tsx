// Hand types: each has a distinct glyph AND tone, so markers never rely on colour alone.
import type { HandType } from '../../data/types';
import { cx } from '../../components/ui';

export const HAND_META: Record<HandType, { label: string; short: string; tone: string; ring: string }> = {
  bluff: { label: 'Bluff', short: 'B', tone: 'bg-surface-3 text-gold-strong border border-gold', ring: 'ring-gold' },
  herocall: { label: 'Hero Call', short: 'H', tone: 'bg-surface-3 text-muted border border-line-strong', ring: 'ring-muted' },
  cooler: { label: 'Cooler', short: 'C', tone: 'bg-surface-3 text-text border border-line-strong', ring: 'ring-text' },
  badbeat: { label: 'Bad Beat', short: '!', tone: 'bg-surface-3 text-text border border-text', ring: 'ring-text' },
  bigpot: { label: 'Big Pot', short: 'P', tone: 'bg-text text-ink', ring: 'ring-text' },
  winning: { label: 'Winning Moment', short: 'W', tone: 'bg-gold text-ink', ring: 'ring-gold' },
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
