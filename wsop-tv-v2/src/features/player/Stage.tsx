// Player mock: a charcoal "stage" with a table outline and broadcast overlays. No video files, no felt, no props.
import type { OverlayLevel } from '../../data/types';
import { playerById } from '../../data/mock';
import { chips } from '../../lib/format';
import { cx } from '../../components/ui';
import type { SeatStack } from '../../state/stacks';
import { EQUITY } from '../../state/stacks';

/** The hand currently being played on the feature table (drives Basic/Pro overlays and the Current Hand tab). */
export const CURRENT_HAND = {
  number: 214,
  a: 'p04',
  b: 'p07',
  aCards: 'A♠ K♠',
  bCards: 'Q♥ Q♦',
  board: ['K♦', '9♠', '4♣', '2♥', 'J♠'],
  pots: [12_400_000, 31_800_000, 64_500_000],
  actions: [
    'Han raises to 4.8M from the cutoff',
    'Whitfield three-bets to 12.4M',
    'Han calls',
    'Flop K♦ 9♠ 4♣ — Whitfield bets 9.6M, Han calls',
    'Turn 2♥ — Whitfield checks, Han bets 16.4M, Whitfield calls',
    'River J♠ — action on Whitfield',
  ],
};

const SEAT_POS = [
  [50, 79],
  [20, 72],
  [12, 44],
  [34, 13],
  [50, 10],
  [76, 16],
  [88, 44],
];

export function Stage({
  overlay,
  tableName,
  seats,
  playing,
  phase,
  caption,
  compact,
  hue = 220,
  muted,
  media,
}: {
  overlay: OverlayLevel;
  tableName: string;
  seats: SeatStack[];
  playing: boolean;
  /** 0 flop, 1 turn, 2 river */
  phase: number;
  caption?: string | null;
  compact?: boolean;
  hue?: number;
  muted?: boolean;
  /** Real footage behind the overlays (v1 look): a still, and a looping muted video while it plays. */
  media?: { poster: string; video?: string; start?: number };
}) {
  const h = CURRENT_HAND;
  const eq = EQUITY[phase];
  const shownBoard = h.board.slice(0, phase === 0 ? 3 : phase === 1 ? 4 : 5);
  const seatOrder = [...seats].sort((x, y) => x.playerId.localeCompare(y.playerId));

  return (
    <div className="stage relative size-full overflow-hidden" style={{ ['--stage-a' as string]: `hsl(${hue} 14% 15%)`, ['--stage-b' as string]: `hsl(${hue} 18% 6%)` }}>
      {media ? (
        <>
          <img src={media.poster} alt="" className="absolute inset-0 size-full object-cover" />
          {media.video && playing && <video key={media.video} className="absolute inset-0 size-full object-cover" src={`${media.video}#t=${media.start ?? 0}`} poster={media.poster} autoPlay loop muted playsInline />}
          {/* keep overlays readable over real footage */}
          <div className={cx('absolute inset-0', overlay === 'off' ? 'bg-black/5' : 'bg-gradient-to-b from-black/45 via-black/15 to-black/55')} />
        </>
      ) : (
        /* table outline */
        <div className="absolute top-[22%] left-[17%] h-[56%] w-[66%] rounded-[50%] border border-white/12 shadow-[inset_0_0_80px_rgb(0_0_0/0.6)]">
          <div className="absolute inset-[7%] rounded-[50%] border border-gold/20" />
        </div>
      )}
      {!compact && <span className="label absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-white/45">{tableName}</span>}

      {/* playback pulse (shows the mock is "running") */}
      {playing && (
        <span className="absolute right-3 bottom-3 flex items-end gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <i key={i} className="live-dot block w-1 rounded-sm bg-white/40" style={{ height: 6 + i * 4, animationDelay: `${i * 0.2}s` }} />
          ))}
        </span>
      )}
      {muted && !compact && <span className="label absolute right-3 bottom-3 text-[10px] text-white/50">Muted</span>}

      {overlay !== 'off' && (
        <>
          {/* pot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className={cx('label text-white/60', compact ? 'text-[8px]' : 'text-[10px]')}>Pot</p>
            <p className={cx('font-black tnum', compact ? 'text-sm' : 'text-lg sm:text-2xl')}>{chips(h.pots[phase])}</p>
            {overlay === 'pro' && !compact && (
              <p className="mt-1 flex justify-center gap-1 tnum">
                {shownBoard.map((c) => (
                  <span key={c} className="rounded-[3px] bg-white/90 px-1 text-[11px] font-bold text-ink">
                    {c}
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* seats */}
          {seatOrder.map((s, i) => {
            const p = playerById(s.playerId);
            const inHand = s.playerId === h.a || s.playerId === h.b;
            const [x, y] = SEAT_POS[i % SEAT_POS.length];
            return (
              <div
                key={s.playerId}
                className={cx('absolute -translate-x-1/2 -translate-y-1/2 rounded-chip border text-center backdrop-blur-sm', compact ? 'px-1 py-0.5' : 'px-1.5 py-0.5 sm:px-2 sm:py-1', inHand ? 'border-gold/70 bg-black/70' : 'border-white/10 bg-black/55')}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <p className={cx('font-semibold whitespace-nowrap', compact ? 'text-[8px]' : 'text-[9px] sm:text-[11px]')}>{compact ? p.name.split(' ').slice(-1)[0] : p.name}</p>
                {overlay === 'pro' && !compact && (
                  <>
                    <p className="hidden text-[10px] text-white/70 tnum sm:block">{chips(s.stack)}</p>
                    {inHand && <p className="text-[10px] font-bold text-gold-strong tnum">{s.playerId === h.a ? h.aCards : h.bCards}</p>}
                  </>
                )}
              </div>
            );
          })}

          {/* Pro: equity bar + hand history */}
          {overlay === 'pro' && !compact && (
            <>
              <div className="absolute top-[27%] left-1/2 w-[40%] -translate-x-1/2" aria-label={`Equity: ${playerById(h.a).name} ${eq.a}%, ${playerById(h.b).name} ${eq.b}%`}>
                <div className="flex justify-between text-[10px] font-semibold tnum">
                  <span>
                    {playerById(h.a).name.split(' ').slice(-1)} {eq.a}%
                  </span>
                  <span className="text-white/60">{eq.phase}</span>
                  <span>
                    {eq.b}% {playerById(h.b).name.split(' ').slice(-1)}
                  </span>
                </div>
                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/15">
                  <i className="block bg-gold transition-[width] duration-500" style={{ width: `${eq.a}%` }} />
                  <i className="block flex-1 bg-white/55" />
                </div>
              </div>
              <div className="absolute top-12 left-3 hidden w-[22%] rounded-chip border border-white/10 bg-black/65 p-2 md:block">
                <p className="label mb-1 text-[9px] text-gold">Hand #{h.number}</p>
                <ul className="space-y-0.5 text-[10px] leading-snug text-white/80">
                  {h.actions.slice(0, 3 + phase).slice(-3).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      )}

      {caption && !compact && (
        <p className="absolute bottom-[31%] left-1/2 max-w-[80%] -translate-x-1/2 rounded-[3px] bg-black/80 px-2 py-0.5 text-center text-[13px] leading-snug">{caption}</p>
      )}
    </div>
  );
}
