// Hijack Poker HH Logger — Card format codec
//
// Hijack uses uppercase rank + uppercase suit ("KC", "TS", "AD").
// PokerStars expects uppercase rank + lowercase suit ("Kc", "Ts", "Ad").
// Ten is "T" in both.
//
// Sentinels:
//   ""            — slot unused / unoccupied seat
//   "facedown"    — slot exists but value not revealed to this client

export const SENTINEL_EMPTY = '';
export const SENTINEL_FACEDOWN = 'facedown';

const RANK_VALID = new Set(['2','3','4','5','6','7','8','9','T','J','Q','K','A']);
const SUIT_HIJACK = new Set(['H', 'S', 'D', 'C']);
const SUIT_TO_PS = { H: 'h', S: 's', D: 'd', C: 'c' };

/**
 * Convert a Hijack-format card string to PokerStars format.
 * @param {string} hjk — Hijack card like "KC", "TS", "AD"
 * @returns {string} PokerStars card like "Kc", "Ts", "Ad", or empty/facedown unchanged
 * @throws if input is malformed (not empty/facedown and not a valid card)
 */
export function hjkToPS(hjk) {
  if (hjk === SENTINEL_EMPTY || hjk === SENTINEL_FACEDOWN) return hjk;
  if (typeof hjk !== 'string' || hjk.length !== 2) {
    throw new Error(`Invalid card format: ${JSON.stringify(hjk)}`);
  }
  const rank = hjk[0];
  const suit = hjk[1];
  if (!RANK_VALID.has(rank)) throw new Error(`Invalid rank: ${rank} in ${hjk}`);
  if (!SUIT_HIJACK.has(suit)) throw new Error(`Invalid suit: ${suit} in ${hjk}`);
  return rank + SUIT_TO_PS[suit];
}

/**
 * Convert an array of Hijack cards to PokerStars format, skipping empty/facedown.
 * @param {string[]} cards
 * @returns {string[]} PS-format cards, skipping unrevealed/unused
 */
export function hjkArrayToPS(cards) {
  return cards
    .filter(c => c !== SENTINEL_EMPTY && c !== SENTINEL_FACEDOWN)
    .map(hjkToPS);
}

/**
 * Parse a Hijack 5-card-eval string like "8S,7S,6C,5D,4H" to a PS-format array.
 * @param {string} winStr
 * @returns {string[]} PS-format cards
 */
export function parseWinString(winStr) {
  if (!winStr || typeof winStr !== 'string') return [];
  return winStr.split(',').map(s => hjkToPS(s.trim())).filter(Boolean);
}

/**
 * Render a PS-format card array as a PokerStars bracketed list: "[Kc Jc 4s 2h]"
 * @param {string[]} cards
 * @returns {string}
 */
export function renderPSCards(cards) {
  return '[' + cards.join(' ') + ']';
}
