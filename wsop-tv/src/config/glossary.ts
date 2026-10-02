// Optional beginner help. Short, neutral definitions shown when "Poker terms" is switched on.
// Matching is done on text the app renders itself — video graphics are never analysed.

export interface GlossaryTerm {
  id: string;
  term: string;
  /** Text variants matched in copy (case-sensitive unless noted in `ci`). */
  match: string[];
  ci?: boolean;
  definition: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { id: 'bb', term: 'BB (Big blind)', match: ['BB', 'big blind'], definition: 'The larger forced bet posted before cards are dealt. Stack sizes are often counted in big blinds.' },
  { id: 'sb', term: 'SB (Small blind)', match: ['SB', 'small blind'], definition: 'The smaller forced bet, posted by the player to the left of the button.' },
  { id: 'btn', term: 'BTN (Button)', match: ['BTN', 'button'], definition: 'The dealer position. It acts last after the flop, which is an advantage.' },
  { id: 'blinds', term: 'Blinds', match: ['blinds', 'Blinds'], definition: 'The two forced bets (small and big blind) that start the pot each hand. They rise at every level.' },
  { id: 'ante', term: 'Ante', match: ['ante'], definition: 'A small forced bet added to the pot before the deal, on top of the blinds.' },
  { id: 'stack', term: 'Stack', match: ['stack', 'Stack', 'stacks'], definition: 'The chips a player has in front of them.' },
  { id: 'all-in', term: 'All-in', match: ['all in', 'All in', 'all-in', 'All-in', 'shoves', 'jams', 'shove'], definition: 'Betting every chip you have. Shove and jam mean the same thing.' },
  { id: 'check-raise', term: 'Check-raise', match: ['check-raise', 'check-raises', 'check-raised'], definition: 'Checking first, then raising after an opponent bets — usually a sign of strength or a strong bluff.' },
  { id: '3-bet', term: '3-bet / 4-bet', match: ['3-bets', '3-bet', '4-bets', '4-bet'], definition: 'A re-raise before the flop. The opening raise is the 2nd bet, a re-raise is the 3rd, and so on.' },
  { id: 'c-bet', term: 'C-bet', match: ['c-bets', 'c-bet'], definition: 'Continuation bet: the preflop raiser bets again on the flop.' },
  { id: 'flop', term: 'Flop / Turn / River', match: ['flop', 'Flop', 'turn', 'river'], definition: 'The three shared-card stages: three cards on the flop, a fourth on the turn, a fifth on the river.' },
  { id: 'set', term: 'Set', match: ['set', 'sets'], definition: 'Three of a kind made with a pocket pair plus one matching board card.' },
  { id: 'cooler', term: 'Cooler', match: ['cooler'], definition: 'A hand where both players hold very strong cards, so a big pot is almost unavoidable.' },
  { id: 'bubble', term: 'Bubble', match: ['bubble', 'Bubble'], definition: 'The last place before the prize money. Busting on the bubble wins nothing.' },
  { id: 'heads-up', term: 'Heads-up', match: ['Heads-up', 'heads-up'], definition: 'Only two players left in a hand or in the tournament.' },
  { id: 'delay', term: 'Broadcast delay', match: ['broadcast delay', 'delay'], definition: 'Poker streams air some minutes after the action (often around 30). That lets the broadcast show hole cards without giving players at the table any information.' },
  { id: 'final-table', term: 'Final table', match: ['final table', 'Final Table', 'final-table'], definition: 'The last table of a tournament, usually 9 players or fewer, where the top prizes are decided.' },
  { id: 'chip-leader', term: 'Chip leader', match: ['chip leader'], definition: 'The player with the most chips at that moment.' },
  { id: 'pot', term: 'Pot', match: ['pot', 'Pot'], definition: 'All chips bet in the current hand. The winner takes the pot.' },
  { id: 'level', term: 'Level', match: ['Level'], definition: 'A period of play with fixed blinds and ante. Blinds increase when a new level starts.' },
  { id: 'buy-in', term: 'Buy-in', match: ['Buy-in', 'buy-in'], definition: 'The entry fee for a tournament.' },
];
