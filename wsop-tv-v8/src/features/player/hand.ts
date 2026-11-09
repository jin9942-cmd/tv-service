// The hand in progress on a broadcast: the same AK-vs-QQ hand, played by that table's two biggest stacks and sized in
// big blinds, so pots and bets always fit the blinds of the broadcast (Day 1 hundreds of chips, final tables millions).
import { HERO_DAY_ID, bbFor, playerById, seatsFor } from '../../data/mock';
import { chips } from '../../lib/format';

export interface CurrentHand {
  number: number;
  a: string;
  b: string;
  aCards: string;
  bCards: string;
  board: string[];
  /** Pot at the start of each street: flop, turn, river. */
  pots: number[];
  actions: string[];
}

export function handFor(dayId: string): CurrentHand {
  const seats = [...seatsFor(dayId)].sort((x, y) => y.stack - x.stack);
  const bb = bbFor(dayId);
  const [a, b] = [seats[0].playerId, seats[1].playerId];
  const A = playerById(a).name.split(' ').slice(-1)[0];
  const B = playerById(b).name.split(' ').slice(-1)[0];
  const c = (bbs: number) => chips(Math.round((bbs * bb) / (bb / 2)) * (bb / 2));
  return {
    number: dayId === HERO_DAY_ID ? 214 : 40 + (dayId.length * 13) % 180,
    a,
    b,
    aCards: 'A♠ K♠',
    bCards: 'Q♥ Q♦',
    board: ['K♦', '9♠', '4♣', '2♥', 'J♠'],
    // 2.5x open, 3-bet to 6.67bb, flop 5bb, turn 8.67bb with a big-blind ante: 15.8 → 25.8 → 43.2 bb.
    pots: [47.5 / 3, 77.5 / 3, 129.5 / 3].map((x) => Math.round(x * bb)),
    actions: [
      `${A} raises to ${c(2.5)} from the cutoff`,
      `${B} three-bets to ${c(20 / 3)} on the button`,
      `Blinds fold — ${A} calls`,
      `Flop K♦ 9♠ 4♣ — ${A} checks, ${B} bets ${c(5)}, ${A} calls`,
      `Turn 2♥ — ${A} leads for ${c(26 / 3)}, ${B} calls`,
      `River J♠ — ${A} checks, action on ${B}`,
    ],
  };
}
