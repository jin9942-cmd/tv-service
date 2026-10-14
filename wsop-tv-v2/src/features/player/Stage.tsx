// Player picture with broadcast graphics, laid out the way poker TV does it:
//  - top right: event bug (event · level · blinds/ante · players left)
//  - bottom left: the hand box — the two players in the hand with stacks (Pro adds hole cards and equity)
//  - bottom right: pot (Pro adds the board)
//  - Pro only, left: chip-count leaderboard in big blinds
// Off shows the clean picture. Real footage (or a neutral stage) sits underneath.
import type { OverlayLevel } from '../../data/types';
import { playerById } from '../../data/mock';
import { chips } from '../../lib/format';
import { cx } from '../../components/ui';
import type { SeatStack } from '../../state/stacks';
import { EQUITY } from '../../state/stacks';

/** The hand currently being played on the feature table (drives the overlays and the Current Hand tab). */
export const CURRENT_HAND = {
  number: 214,
  a: 'p04',
  b: 'p07',
  aCards: 'A♠ K♠',
  bCards: 'Q♥ Q♦',
  board: ['K♦', '9♠', '4♣', '2♥', 'J♠'],
  // Blinds 1.5M / 3M, 3M big-blind ante. Pot at the start of each street: flop, turn, river.
  pots: [47_500_000, 77_500_000, 129_500_000],
  actions: [
    'Han raises to 7.5M from the cutoff',
    'Whitfield three-bets to 20M on the button',
    'Blinds fold — Han calls',
    'Flop K♦ 9♠ 4♣ — Han checks, Whitfield bets 15M, Han calls',
    'Turn 2♥ — Han leads for 26M, Whitfield calls',
    'River J♠ — Han checks, action on Whitfield',
  ],
};

export interface StageInfo {
  event: string;
  day: string;
  level?: number;
  blinds?: { sb: number; bb: number; ante: number };
  left?: number;
}

const lastName = (id: string) => playerById(id).name.split(' ').slice(-1)[0];
const isRed = (card: string) => card.includes('♥') || card.includes('♦');

function Card({ c, size = 'sm' }: { c: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('inline-flex items-center justify-center rounded-[3px] bg-white font-bold tnum', size === 'md' ? 'h-6 w-[18px] text-[11px] sm:h-7 sm:w-5 sm:text-xs' : 'h-5 w-4 text-[10px]', isRed(c) ? 'text-[#c0262d]' : 'text-ink')}>
      {c}
    </span>
  );
}

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
  info,
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
  /** Real footage behind the graphics: a still, and a looping muted video while it plays. */
  media?: { poster: string; video?: string; start?: number };
  /** Event context for the bug (top right). */
  info?: StageInfo;
}) {
  const h = CURRENT_HAND;
  const eq = EQUITY[phase];
  const shownBoard = h.board.slice(0, phase === 0 ? 3 : phase === 1 ? 4 : 5);
  const stackOf = (id: string) => seats.find((s) => s.playerId === id)?.stack ?? 0;
  const bb = info?.blinds?.bb;
  const inBb = (n: number) => (bb ? `${Math.round(n / bb)} bb` : '');
  const leaders = [...seats].sort((x, y) => y.stack - x.stack);

  return (
    <div className="stage relative size-full overflow-hidden" style={{ ['--stage-a' as string]: `hsl(${hue} 14% 15%)`, ['--stage-b' as string]: `hsl(${hue} 18% 6%)` }}>
      {media ? (
        <>
          <img src={media.poster} alt="" className="absolute inset-0 size-full object-cover" />
          {media.video && playing && <video key={media.video} className="absolute inset-0 size-full object-cover" src={`${media.video}#t=${media.start ?? 0}`} poster={media.poster} autoPlay loop muted playsInline />}
        </>
      ) : (
        <div className="absolute top-[22%] left-[17%] h-[56%] w-[66%] rounded-[50%] border border-white/12 shadow-[inset_0_0_80px_rgb(0_0_0/0.6)]">
          <div className="absolute inset-[7%] rounded-[50%] border border-gold/20" />
        </div>
      )}

      {muted && !compact && <span className="label absolute top-3 right-3 rounded-[3px] bg-black/60 px-1.5 py-0.5 text-[10px] text-white/70">Muted</span>}

      {/* Multiview tiles: just the feed name and pot */}
      {compact && overlay !== 'off' && (
        <span className="absolute right-1.5 bottom-1.5 rounded-[3px] bg-black/75 px-1.5 py-0.5 text-[9px] font-bold tnum">Pot {chips(h.pots[phase])}</span>
      )}

      {!compact && overlay !== 'off' && (
        <>
          {/* event bug */}
          {info && (
            <div className="absolute top-3 right-3 hidden overflow-hidden rounded-[4px] text-right shadow-lg sm:block">
              <p className="bg-gold px-2.5 py-1 text-[10px] font-black tracking-wide text-ink uppercase">
                {info.event} · {info.day}
              </p>
              <p className="bg-black/80 px-2.5 py-1 text-[10px] font-semibold text-white/90 tnum">
                {info.level ? `Level ${info.level}` : tableName}
                {info.blinds && ` · ${chips(info.blinds.sb)}/${chips(info.blinds.bb)} (${chips(info.blinds.ante)} ante)`}
                {info.left ? ` · ${info.left} left` : ''}
              </p>
            </div>
          )}

          {/* Pro: chip counts in big blinds */}
          {overlay === 'pro' && (
            <div className="absolute top-12 left-3 hidden w-[24%] max-w-56 overflow-hidden rounded-[4px] bg-black/75 shadow-lg md:block">
              <p className="label bg-white/10 px-2 py-1 text-[9px] text-gold-strong">Chip counts</p>
              <ol className="px-2 py-1">
                {leaders.map((s, i) => (
                  <li key={s.playerId} className={cx('flex items-center gap-1.5 py-[3px] text-[10px] tnum', (s.playerId === h.a || s.playerId === h.b) && 'text-gold-strong')}>
                    <span className="w-3 text-white/50">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{lastName(s.playerId)}</span>
                    <span>{chips(s.stack)}</span>
                    {bb && <span className="w-9 text-right text-white/55">{inBb(s.stack)}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* hand box: the two players in the hand */}
          <div className="absolute bottom-3 left-3 w-[46%] max-w-80 overflow-hidden rounded-[4px] shadow-lg sm:bottom-[19%]">
            {[
              { id: h.a, cards: h.aCards, eq: eq.a },
              { id: h.b, cards: h.bCards, eq: eq.b },
            ].map((row) => (
              <div key={row.id} className="flex items-center gap-2 border-b border-white/10 bg-black/80 px-2 py-1 last:border-0 sm:py-1.5">
                {overlay === 'pro' && (
                  <span className="flex gap-0.5">
                    {row.cards.split(' ').map((c) => (
                      <Card key={c} c={c} size="md" />
                    ))}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold sm:text-[13px]">{playerById(row.id).name}</span>
                  <span className="block text-[10px] text-white/65 tnum">
                    {chips(stackOf(row.id))}
                    {bb && ` · ${inBb(stackOf(row.id))}`}
                  </span>
                </span>
                {overlay === 'pro' && <span className={cx('text-sm font-black tnum sm:text-base', row.eq >= 50 ? 'text-gold-strong' : 'text-white/80')}>{row.eq}%</span>}
              </div>
            ))}
          </div>

          {/* pot (+ board on Pro) */}
          <div className="absolute right-3 bottom-3 overflow-hidden rounded-[4px] text-right shadow-lg sm:bottom-[19%]">
            {overlay === 'pro' && (
              <p className="flex justify-end gap-0.5 bg-black/80 px-2 pt-1.5 pb-1">
                {shownBoard.map((c) => (
                  <Card key={c} c={c} />
                ))}
              </p>
            )}
            <p className="bg-black/80 px-2.5 py-1">
              <span className="label mr-1.5 text-[9px] text-white/60">Pot</span>
              <span className="text-sm font-black tnum sm:text-base">{chips(h.pots[phase])}</span>
            </p>
          </div>
        </>
      )}

      {caption && !compact && (
        <p className="absolute bottom-[38%] left-1/2 max-w-[80%] -translate-x-1/2 rounded-[3px] bg-black/80 px-2 py-0.5 text-center text-[13px] leading-snug sm:bottom-[42%]">{caption}</p>
      )}
    </div>
  );
}
