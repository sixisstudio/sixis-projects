// Hijack Poker HH Logger — PokerStars HH text formatter
//
// Takes a finalized hand record (from hand_state.js) and produces a
// PokerStars-format hand history text block ready to append to a session file.
//
// Pure function — no I/O, no chrome.* APIs. Testable.

import { hjkToPS, hjkArrayToPS, parseWinString } from '../lib/card_codec.js';

/**
 * Render a hand record as a PokerStars HH text block.
 * @param {object} hand — finalized hand record from TableState
 * @returns {string} — PokerStars HH text, terminated with two newlines (PS separator)
 */
export function renderHand(hand) {
  const lines = [];

  // ─── Header ─────────────────────────────────────────────────────
  const handDate = formatPokerStarsDate(hand.startedAt);
  const gameDescription = hand.gameType === 'PLO'
    ? 'Omaha Pot Limit'
    : 'Omaha Pot Limit';  // TODO: handle non-PLO variants if ever in scope
  const stakeDisplay = `(${hand.currencySign}${hand.sb.toFixed(2)}/${hand.currencySign}${hand.bb.toFixed(2)} USD)`;
  lines.push(`PokerStars Hand #${hand.handNo}: ${gameDescription} ${stakeDisplay} - ${handDate}`);

  // Table line: max seats inferred from highest occupied seat (round up to 6 / 9 / 10)
  const maxSeats = inferTableSize(hand);
  lines.push(`Table 'Hijack ${hand.gameID}' ${maxSeats}-max Seat #${hand.buttonSeat} is the button`);

  // ─── Seat list ──────────────────────────────────────────────────
  const seatList = hand.seats.slice().sort((a, b) => a.seat - b.seat);
  for (const s of seatList) {
    const displayName = resolveName(s.guid, hand);
    lines.push(`Seat ${s.seat}: ${displayName} (${hand.currencySign}${s.stack.toFixed(2)} in chips)`);
  }

  // ─── Blinds (from preflop actions of kind 'blind') ──────────────
  const blindActions = (hand.streets.preflop || []).filter(a => a.kind === 'blind');
  for (const b of blindActions) {
    const seat = hand.seats.find(s => s.seat === b.seat);
    if (!seat) continue;
    const name = resolveName(seat.guid, hand);
    const blindName = b.type === 'sb' ? 'small blind' : (b.type === 'bb' ? 'big blind' : 'ante');
    lines.push(`${name}: posts ${blindName} ${hand.currencySign}${b.amount.toFixed(2)}`);
  }

  // ─── *** HOLE CARDS *** ─────────────────────────────────────────
  lines.push('*** HOLE CARDS ***');
  if (hand.hero.seat && hand.hero.cards.length) {
    const heroName = resolveName(
      (hand.seats.find(s => s.seat === hand.hero.seat) || {}).guid,
      hand
    );
    const psCards = hjkArrayToPS(hand.hero.cards);
    lines.push(`Dealt to ${heroName} [${psCards.join(' ')}]`);
  }

  // ─── Preflop actions (non-blind) ────────────────────────────────
  renderStreetActions(lines, hand, 'preflop');

  // ─── Flop ──────────────────────────────────────────────────────
  if (hand.board.flop && hand.board.flop.length === 3) {
    const flopCards = hjkArrayToPS(hand.board.flop);
    lines.push(`*** FLOP *** [${flopCards.join(' ')}]`);
    renderStreetActions(lines, hand, 'flop');
  }

  // ─── Turn ──────────────────────────────────────────────────────
  if (hand.board.turn && hand.board.turn !== 'facedown') {
    const turnCard = hjkToPS(hand.board.turn);
    const flopCards = hjkArrayToPS(hand.board.flop);
    lines.push(`*** TURN *** [${flopCards.join(' ')}] [${turnCard}]`);
    renderStreetActions(lines, hand, 'turn');
  }

  // ─── River ─────────────────────────────────────────────────────
  if (hand.board.river && hand.board.river !== 'facedown') {
    const riverCard = hjkToPS(hand.board.river);
    const flopCards = hjkArrayToPS(hand.board.flop);
    const turnCard = hjkToPS(hand.board.turn);
    lines.push(`*** RIVER *** [${flopCards.join(' ')}] [${turnCard}] [${riverCard}]`);
    renderStreetActions(lines, hand, 'river');
  }

  // ─── *** SHOW DOWN *** ──────────────────────────────────────────
  if (hand.ended === 'showdown') {
    lines.push('*** SHOW DOWN ***');
    // Villain reveals
    for (const [seatStr, cards] of Object.entries(hand.villainReveals || {})) {
      const seatId = parseInt(seatStr, 10);
      const seat = hand.seats.find(s => s.seat === seatId);
      if (!seat) continue;
      const name = resolveName(seat.guid, hand);
      const psCards = hjkArrayToPS(cards);
      const winningHand = hand.winners.includes(seatId) ? (hand.winningHands[0] && hand.winningHands[0].cards) : null;
      const handRank = winningHand ? renderHandRank(winningHand) : 'a hand';
      lines.push(`${name}: shows [${psCards.join(' ')}] (${handRank})`);
    }
    // Hero reveal (if hero went to showdown)
    if (hand.hero.cards && hand.hero.cards.length && hand.winners.includes(hand.hero.seat)) {
      const heroName = resolveName(
        (hand.seats.find(s => s.seat === hand.hero.seat) || {}).guid,
        hand
      );
      const psCards = hjkArrayToPS(hand.hero.cards);
      lines.push(`${heroName}: shows [${psCards.join(' ')}]`);
    }
    // Pot collections
    for (const w of hand.winners) {
      const seat = hand.seats.find(s => s.seat === w);
      if (!seat) continue;
      const name = resolveName(seat.guid, hand);
      const winPot = hand.pot / hand.winners.length;  // split equally — refine with pots[] data
      lines.push(`${name} collected ${hand.currencySign}${winPot.toFixed(2)} from pot`);
    }
  }

  // ─── *** SUMMARY *** ────────────────────────────────────────────
  lines.push('*** SUMMARY ***');
  lines.push(`Total pot ${hand.currencySign}${(hand.pot || 0).toFixed(2)} | Rake ${hand.currencySign}${(hand.rake || 0).toFixed(2)}`);

  // Board (only if at least flop dealt)
  if (hand.board.flop && hand.board.flop.length === 3) {
    const boardCards = [
      ...hjkArrayToPS(hand.board.flop),
      hand.board.turn && hand.board.turn !== 'facedown' ? hjkToPS(hand.board.turn) : null,
      hand.board.river && hand.board.river !== 'facedown' ? hjkToPS(hand.board.river) : null,
    ].filter(Boolean);
    lines.push(`Board [${boardCards.join(' ')}]`);
  }

  // Per-seat summary
  for (const s of seatList) {
    const name = resolveName(s.guid, hand);
    const position = describePosition(s.seat, hand);
    if (hand.winners.includes(s.seat)) {
      const winPot = hand.pot / hand.winners.length;
      const cards = (s.seat === hand.hero.seat && hand.hero.cards.length)
        ? hand.hero.cards
        : (hand.villainReveals[s.seat] || []);
      if (cards.length) {
        const psCards = hjkArrayToPS(cards);
        lines.push(`Seat ${s.seat}: ${name}${position} showed [${psCards.join(' ')}] and won (${hand.currencySign}${winPot.toFixed(2)})`);
      } else {
        lines.push(`Seat ${s.seat}: ${name}${position} won (${hand.currencySign}${winPot.toFixed(2)})`);
      }
    } else {
      const cards = (s.seat === hand.hero.seat && hand.hero.cards.length)
        ? hand.hero.cards
        : (hand.villainReveals[s.seat] || []);
      const folded = !cards.length || hand.ended === 'fold-around';
      if (cards.length) {
        const psCards = hjkArrayToPS(cards);
        lines.push(`Seat ${s.seat}: ${name}${position} mucked [${psCards.join(' ')}]`);
      } else {
        lines.push(`Seat ${s.seat}: ${name}${position} folded ${describeFoldStreet(hand, s.seat)}`);
      }
    }
  }

  return lines.join('\n') + '\n\n';
}

// ─── Helpers ──────────────────────────────────────────────────────

function renderStreetActions(lines, hand, street) {
  const actions = (hand.streets[street] || []).filter(a => a.kind === 'action');
  for (const a of actions) {
    const seat = hand.seats.find(s => s.seat === a.seat);
    if (!seat) continue;
    const name = resolveName(seat.guid, hand);
    switch (a.action) {
      case 'fold':
        lines.push(`${name}: folds${a.sitout ? ' (sit out)' : ''}`);
        break;
      case 'check':
        lines.push(`${name}: checks`);
        break;
      case 'call':
        lines.push(`${name}: calls ${hand.currencySign}${(a.amount || 0).toFixed(2)}`);
        break;
      case 'bet':
        lines.push(`${name}: bets ${hand.currencySign}${(a.amount || 0).toFixed(2)}`);
        break;
      case 'raise':
        // PokerStars format: "raises $X to $Y"
        // We only know the final bet amount; compute "raise by" delta if available
        lines.push(`${name}: raises to ${hand.currencySign}${(a.amount || 0).toFixed(2)}`);
        break;
      case 'allin':
        lines.push(`${name}: bets ${hand.currencySign}${(a.amount || 0).toFixed(2)} and is all-in`);
        break;
    }
  }
}

function resolveName(guid, hand) {
  if (!guid) return 'Unknown';
  const nameMap = hand.nameMap || {};
  if (nameMap[guid]) return nameMap[guid];
  // Fallback: Player_<short-guid>
  return 'Player_' + guid.slice(0, 8);
}

function inferTableSize(hand) {
  const maxSeat = hand.seats.length ? Math.max(...hand.seats.map(s => s.seat)) : 6;
  if (maxSeat <= 2) return 2;
  if (maxSeat <= 6) return 6;
  if (maxSeat <= 9) return 9;
  return 10;
}

function describePosition(seat, hand) {
  if (seat === hand.buttonSeat) return ' (button)';
  if (seat === hand.sbSeat) return ' (small blind)';
  if (seat === hand.bbSeat) return ' (big blind)';
  return '';
}

function describeFoldStreet(hand, seat) {
  // Scan streets in reverse order to find the last action by this seat
  for (const street of ['river', 'turn', 'flop', 'preflop']) {
    const acts = hand.streets[street] || [];
    if (acts.some(a => a.kind === 'action' && a.seat === seat)) {
      // PokerStars phrasing: "folded before Flop" / "on the Flop" / "on the Turn" / "on the River"
      if (street === 'preflop') return 'before Flop';
      return 'on the ' + capitalize(street);
    }
  }
  return 'before Flop';
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderHandRank(cardStr) {
  // Hand-rank derivation is complex (would require a poker eval library).
  // For v1, just return a placeholder. HM3 derives ranks itself from the cards.
  return 'shows hand';
}

function formatPokerStarsDate(epochSeconds) {
  if (!epochSeconds) return '2026/01/01 00:00:00 ET';
  const d = new Date(epochSeconds * 1000);
  // Format as ET regardless of local timezone (PokerStars convention)
  // Use Intl with America/New_York
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t) => (parts.find(p => p.type === t) || {}).value;
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')} ET`;
}
