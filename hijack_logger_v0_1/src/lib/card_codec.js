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
 *
 * Hijack uses either 1-char ranks ("KC", "AD", "9H") OR 2-char "10" for Ten
 * ("10C", "10S"). PokerStars always uses single-char "T" for Ten. We accept
 * both Hijack forms and always emit single-char rank.
 *
 * @param {string} hjk — Hijack card: "KC", "9H", "10S", etc. (or empty/facedown)
 * @returns {string} PokerStars card: "Kc", "9h", "Ts" — or empty/facedown unchanged
 * @throws if input is malformed
 */
export function hjkToPS(hjk) {
  if (hjk === SENTINEL_EMPTY || hjk === SENTINEL_FACEDOWN) return hjk;
  if (typeof hjk !== 'string') {
    throw new Error(`Invalid card format: ${JSON.stringify(hjk)}`);
  }
  let rank, suit;
  if (hjk.length === 2) {
    rank = hjk[0];
    suit = hjk[1];
  } else if (hjk.length === 3 && hjk.startsWith('10')) {
    // "10C", "10S", "10D", "10H" — normalize Ten to single-char "T"
    rank = 'T';
    suit = hjk[2];
  } else {
    throw new Error(`Invalid card format: ${JSON.stringify(hjk)}`);
  }
  if (!RANK_VALID.has(rank)) throw new Error(`Invalid rank: ${rank} in ${JSON.stringify(hjk)}`);
  if (!SUIT_HIJACK.has(suit)) throw new Error(`Invalid suit: ${suit} in ${JSON.stringify(hjk)}`);
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
