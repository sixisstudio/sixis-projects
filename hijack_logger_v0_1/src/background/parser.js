// Hijack Poker HH Logger — gotOmaha frame parser
//
// Receives encoded WS frames from the service worker, dedup'd by content,
// extracts state snapshots, emits action events into the per-table state
// machine.
//
// Pure logic — no chrome.* APIs. Testable in isolation against fixture frames.

// ─── Frame decoding ──────────────────────────────────────────────────

/**
 * Decode an encoded frame payload (as produced by ws_proxy.js).
 * @param {object} encData — { type: 'string'|'arraybuffer'|'unknown', value, ... }
 * @returns {string | ArrayBuffer | null}
 */
export function decodeData(encData) {
  if (!encData) return null;
  if (encData.type === 'string') return encData.value;
  if (encData.type === 'arraybuffer') {
    const bin = atob(encData.value);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  return null;
}

/**
 * Try to parse a frame payload as a Hijack game-ws JSON event.
 * Returns { event, payload } if successful, null otherwise.
 * @param {string | ArrayBuffer | null} data
 * @returns {{event: string, payload: object} | null}
 */
export function parseGameWSFrame(data) {
  if (typeof data !== 'string') return null;
  if (!data.startsWith('{')) return null;
  let parsed;
  try { parsed = JSON.parse(data); } catch (e) { return null; }
  if (!parsed || typeof parsed.event !== 'string') return null;
  return { event: parsed.event, payload: parsed };
}

// ─── State snapshot extraction ───────────────────────────────────────

/**
 * Compute a dedupe key for a gotOmaha snapshot.
 * Two snapshots with the same key represent the same observable state.
 */
export function snapshotKey(game) {
  const cards = [game.card1, game.card2, game.card3, game.card4, game.card5].join('|');
  let pCards = '';
  for (let n = 1; n <= 10; n++) {
    pCards += (game['p' + n + 'card1'] || '') + ',' + (game['p' + n + 'card2'] || '') + ',' +
              (game['p' + n + 'card3'] || '') + ',' + (game['p' + n + 'card4'] || '') + ';';
  }
  return [
    game.gameID, game.gameNo, game.lastmove,
    game.lastaction || '', game.lastplayer || '',
    game.languageKey || '',
    cards, pCards,
  ].join('||');
}

/**
 * Extract a normalized snapshot from a gotOmaha .game object.
 * The snapshot is a flat record of all fields the state machine cares about.
 */
export function extractSnapshot(game) {
  const seats = [];
  for (let n = 1; n <= 10; n++) {
    const name = game['p' + n + 'name'];
    if (!name) continue;  // unoccupied seat
    seats.push({
      seat: n,
      guid: name,
      stack: parseFloat(game['p' + n + 'pot']) || 0,
      bet: parseFloat(game['p' + n + 'bet']) || 0,
      lbet: parseFloat(game['p' + n + 'lbet']) || 0,
      betDisplay: parseFloat(game['p' + n + 'BetDisplay']) || 0,
      action: game['p' + n + 'action'] || '',
      lastAction: game['p' + n + 'lastAction'] || '',
      status: parseInt(game['p' + n + 'status'], 10) || 0,
      sitout: game['p' + n + 'sitout'] || '0|0',
      cards: [
        game['p' + n + 'card1'] || '',
        game['p' + n + 'card2'] || '',
        game['p' + n + 'card3'] || '',
        game['p' + n + 'card4'] || '',
      ],
      potwin: parseFloat(game['p' + n + 'potwin']) || 0,
    });
  }

  // Parse chat slot → GUID→displayName map updates
  const nameHints = {};
  if (Array.isArray(game.chatMessages)) {
    for (const m of game.chatMessages) {
      if (m && m.GUID && m.displayName) nameHints[m.GUID] = m.displayName;
    }
  }

  return {
    // Identifiers
    gameID: game.gameID,
    gameNo: game.gameNo,
    lastmove: game.lastmove,  // epoch seconds

    // Format
    gameType: game.gameType,                            // "PL"
    gameTypeDisplayName: game.gameTypeDisplayName,      // "PLO"
    game: game.game,                                    // "omaha"
    blindLevels: game.blindLevels,                      // "$0.02 / $0.05 PLO"
    bb: parseFloat(game.bb) || 0,
    cardCount: parseInt(game.cardCount, 10) || 4,
    currencySign: game.currencySign || '$',

    // Position
    dealerId: parseInt(game.dealerId, 10) || 0,
    dealerSeat: parseInt(game.dealer, 10) || 0,
    bbSeat: parseInt(game.bbPlayer, 10) || 0,
    actingSeat: parseInt(game.hand, 10) || 0,

    // Last action
    lastaction: game.lastaction || '',
    lastbet: game.lastbet || '',                        // "seat|amount"
    lastplayer: parseInt(game.lastplayer, 10) || 0,
    languageKey: game.languageKey || '',
    debugMSG: game.debugMSG || '',

    // Board (raw Hijack format)
    board: [game.card1, game.card2, game.card3, game.card4, game.card5],

    // Per-seat
    seats,
    nameHints,

    // Pots / showdown
    pot: parseFloat(game.pot) || 0,
    totalPot: parseFloat(game.totalPot) || 0,
    pots: Array.isArray(game.pots) ? game.pots : [],
    rake: parseFloat(game.rake) || 0,
    showdown: game.showdown || null,
    winner: game.winner || '',                          // CSV seat IDs
    wins: [
      game.win1, game.win2, game.win3, game.win4, game.win5,
      game.win6, game.win7, game.win8, game.win9,
    ].map(s => s || ''),
    winTypes: [
      game.winType1, game.winType2, game.winType3, game.winType4, game.winType5,
      game.winType6, game.winType7, game.winType8, game.winType9,
    ].map(s => s || ''),

    // State flags
    closed: parseInt(game.closed, 10) || 0,
    closedBetting: parseInt(game.closedBetting, 10) || 0,
    isTablePaused: !!game.isTablePaused,
    hasStraddle: game.hasStraddle || '0|0',

    // High-bet pointer
    highestBetPlayer: game.highestBetPlayer || null,
  };
}

// ─── Action event derivation from snapshot diff ──────────────────────

/**
 * Derive a single action event (if any) from a snapshot, based on its
 * languageKey + lastplayer + lastbet. Returns null if no actionable
 * languageKey or if the snapshot doesn't represent a player action.
 *
 * Returned event shape:
 *   { kind: 'blind'|'deal'|'action'|'street'|'showdown'|'button',
 *     seat?: number, action?: string, amount?: number, street?: string }
 */
export function deriveActionEvent(snap, prevSnap) {
  const lk = snap.languageKey;
  if (!lk) return null;

  switch (lk) {
    case 'GAME_MSG_DEALER_BUTTON':
      return { kind: 'button', seat: snap.dealerSeat };

    case 'GAME_PLAYER_SMALL_BLIND': {
      const [sbSeat, sbAmount] = parseLastBet(snap.lastbet);
      return { kind: 'blind', type: 'sb', seat: sbSeat || snap.lastplayer, amount: sbAmount };
    }

    case 'GAME_PLAYER_BIG_BLIND': {
      const [bbSeat, bbAmount] = parseLastBet(snap.lastbet);
      return { kind: 'blind', type: 'bb', seat: bbSeat || snap.lastplayer, amount: bbAmount };
    }

    case 'GAME_MSG_DEAL_CARDS':
      return { kind: 'deal' };

    case 'GAME_PLAYER_FOLDS': {
      // Distinguish sit-out fold from regular fold via debugMSG
      const isSitOut = /sitOut_fold/.test(snap.debugMSG);
      return { kind: 'action', action: 'fold', seat: snap.lastplayer, sitout: isSitOut };
    }

    case 'GAME_PLAYER_CHECKS':
      return { kind: 'action', action: 'check', seat: snap.lastplayer };

    case 'GAME_PLAYER_CALLS': {
      const [, amount] = parseLastBet(snap.lastbet);
      return { kind: 'action', action: 'call', seat: snap.lastplayer, amount };
    }

    case 'GAME_PLAYER_BETS': {
      const [, amount] = parseLastBet(snap.lastbet);
      return { kind: 'action', action: 'bet', seat: snap.lastplayer, amount };
    }

    case 'GAME_PLAYER_RAISES': {
      const [, amount] = parseLastBet(snap.lastbet);
      return { kind: 'action', action: 'raise', seat: snap.lastplayer, amount };
    }

    case 'GAME_PLAYER_ALLIN':
    case 'GAME_PLAYER_ALL_IN': {
      const [, amount] = parseLastBet(snap.lastbet);
      return { kind: 'action', action: 'allin', seat: snap.lastplayer, amount };
    }

    case 'GAME_MSG_DEAL_FLOP':
      return { kind: 'street', street: 'flop' };
    case 'GAME_MSG_DEAL_TURN':
      return { kind: 'street', street: 'turn' };
    case 'GAME_MSG_DEAL_RIVER':
      return { kind: 'street', street: 'river' };
    case 'GAME_MSG_SHOWDOWN':
      return { kind: 'showdown' };

    default:
      // Unknown languageKey — log it for taxonomy update but don't emit
      return { kind: 'unknown_lk', lk };
  }
}

/**
 * Parse a `lastbet` string of form "seatId|amount" into [seat, amount].
 */
function parseLastBet(lastbet) {
  if (typeof lastbet !== 'string') return [0, 0];
  const parts = lastbet.split('|');
  return [parseInt(parts[0], 10) || 0, parseFloat(parts[1]) || 0];
}

/**
 * Detect street transitions from a board-card diff (not via languageKey).
 * Used as a fallback when GAME_MSG_DEAL_FLOP/TURN/RIVER events aren't emitted.
 * Returns the new street name or null if no transition.
 */
export function detectStreetTransition(snap, prevSnap) {
  if (!prevSnap) return null;
  const realCount = (b) => b.filter(c => c && c !== 'facedown').length;
  const prev = realCount(prevSnap.board);
  const curr = realCount(snap.board);
  if (prev < 3 && curr >= 3) return 'flop';
  if (prev < 4 && curr >= 4) return 'turn';
  if (prev < 5 && curr >= 5) return 'river';
  return null;
}

import { isRealCard } from '../lib/card_codec.js';

/**
 * Detect hero hole-card reveal — when hero's p{N}card slots transition from
 * empty/facedown to real card values. Returns the hero seat + cards, or null.
 * v0.2.2: uses shared isRealCard which accepts "10C"-form Tens.
 */
export function detectHeroCardReveal(snap, prevSnap, heroSeat) {
  if (!heroSeat) return null;
  const seat = snap.seats.find(s => s.seat === heroSeat);
  if (!seat) return null;
  const prevSeat = prevSnap ? prevSnap.seats.find(s => s.seat === heroSeat) : null;
  const heroReal = seat.cards.filter(isRealCard);
  const prevReal = prevSeat ? prevSeat.cards.filter(isRealCard) : [];
  if (heroReal.length > prevReal.length) {
    return { seat: heroSeat, cards: heroReal };
  }
  return null;
}

/**
 * Detect villain hole-card reveal at showdown.
 * Returns map { seatId: [cards] } of reveals not seen in prevSnap.
 * v0.2.2: uses shared isRealCard. Also returns the FULL current card set
 * (not just the delta) so consumers always have the latest count.
 */
export function detectShowdownReveals(snap, prevSnap, heroSeat) {
  const reveals = {};
  for (const seat of snap.seats) {
    if (seat.seat === heroSeat) continue;
    const real = seat.cards.filter(isRealCard);
    if (real.length === 0) continue;
    const prevSeat = prevSnap ? prevSnap.seats.find(s => s.seat === seat.seat) : null;
    const prevReal = prevSeat ? prevSeat.cards.filter(isRealCard) : [];
    if (real.length > prevReal.length) {
      reveals[seat.seat] = real;
    }
  }
  return reveals;
}
