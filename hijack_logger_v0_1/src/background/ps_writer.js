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
  // v0.2.3: if we never saw blind events (parser joined mid-hand), synthesize
  // them from hand.sbSeat / hand.bbSeat / hand.sb / hand.bb so PokerTracker
  // can compute the pot correctly. Without these lines PT4 reports
  // "Invalid pot size" because the action sum doesn't reach the SB+BB starting
  // pot. Synthesized blind lines use the BB position (snap.bbSeat) we know
  // from the snapshot.
  const blindActions = (hand.streets.preflop || []).filter(a => a.kind === 'blind');
  const sawSB = blindActions.some(b => b.type === 'sb');
  const sawBB = blindActions.some(b => b.type === 'bb');

  if (!sawSB && hand.sbSeat && hand.sb > 0) {
    const seat = hand.seats.find(s => s.seat === hand.sbSeat);
    if (seat) {
      const name = resolveName(seat.guid, hand);
      lines.push(`${name}: posts small blind ${hand.currencySign}${hand.sb.toFixed(2)}`);
    }
  }
  if (!sawBB && hand.bbSeat && hand.bb > 0) {
    const seat = hand.seats.find(s => s.seat === hand.bbSeat);
    if (seat) {
      const name = resolveName(seat.guid, hand);
      lines.push(`${name}: posts big blind ${hand.currencySign}${hand.bb.toFixed(2)}`);
    }
  }
  // Also handle the case where bb is known but sbSeat isn't — compute SB seat
  // as the seat one before bbSeat (skipping unoccupied seats). Common when
  // we joined mid-preflop and saw bbSeat from snap but no SB event yet.
  if (!sawSB && !hand.sbSeat && hand.bbSeat && hand.sb > 0) {
    const seatOrder = hand.seats.map(s => s.seat).sort((a, b) => a - b);
    const bbIdx = seatOrder.indexOf(hand.bbSeat);
    if (bbIdx > 0) {
      const sbSeatId = seatOrder[bbIdx - 1];
      const seat = hand.seats.find(s => s.seat === sbSeatId);
      if (seat) {
        const name = resolveName(seat.guid, hand);
        lines.push(`${name}: posts small blind ${hand.currencySign}${hand.sb.toFixed(2)}`);
      }
    }
  }

  // Then render any blind actions we DID see (in case both synthesis + actuals
  // need to coexist, e.g., a late-joining player posting SB out of position)
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
  const preflopResult = renderStreetActions(lines, hand, 'preflop');
  let cumulativeContributed = preflopResult.totalContributed;
  let lastStreetUncalled = preflopResult;

  // ─── Flop ──────────────────────────────────────────────────────
  let flopResult = null;
  if (hand.board.flop && hand.board.flop.length === 3) {
    const flopCards = hjkArrayToPS(hand.board.flop);
    lines.push(`*** FLOP *** [${flopCards.join(' ')}]`);
    flopResult = renderStreetActions(lines, hand, 'flop');
    cumulativeContributed += flopResult.totalContributed;
    lastStreetUncalled = flopResult;
  }

  // ─── Turn ──────────────────────────────────────────────────────
  let turnResult = null;
  if (hand.board.turn && hand.board.turn !== 'facedown') {
    const turnCard = hjkToPS(hand.board.turn);
    const flopCards = hjkArrayToPS(hand.board.flop);
    lines.push(`*** TURN *** [${flopCards.join(' ')}] [${turnCard}]`);
    turnResult = renderStreetActions(lines, hand, 'turn');
    cumulativeContributed += turnResult.totalContributed;
    lastStreetUncalled = turnResult;
  }

  // ─── River ─────────────────────────────────────────────────────
  let riverResult = null;
  if (hand.board.river && hand.board.river !== 'facedown') {
    const riverCard = hjkToPS(hand.board.river);
    const flopCards = hjkArrayToPS(hand.board.flop);
    const turnCard = hjkToPS(hand.board.turn);
    lines.push(`*** RIVER *** [${flopCards.join(' ')}] [${turnCard}] [${riverCard}]`);
    riverResult = renderStreetActions(lines, hand, 'river');
    cumulativeContributed += riverResult.totalContributed;
    lastStreetUncalled = riverResult;
  }

  // v0.2.5: emit "Uncalled bet" line for the LAST street that had an uncalled
  // aggression. PokerStars convention: if a player makes the final bet/raise
  // and no one calls, the excess is returned. PT4/HM3 subtract this from the
  // pot total to compute the actual called pot.
  let uncalledTotal = 0;
  if (lastStreetUncalled && lastStreetUncalled.uncalled > 0 && lastStreetUncalled.uncalledSeat) {
    const seat = hand.seats.find(s => s.seat === lastStreetUncalled.uncalledSeat);
    if (seat) {
      const name = resolveName(seat.guid, hand);
      lines.push(`Uncalled bet (${hand.currencySign}${lastStreetUncalled.uncalled.toFixed(2)}) returned to ${name}`);
      uncalledTotal = lastStreetUncalled.uncalled;
    }
  }

  // Compute the CALLED pot — what we'll report as Total pot
  const calledPot = Math.max(0, cumulativeContributed - uncalledTotal);
  hand._computedCalledPot = calledPot;
  hand._computedUncalled = uncalledTotal;

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
    // Pot collections — use computed called-pot, not Hijack's snap.totalPot.
    const distributable = hand._computedCalledPot || hand.pot || 0;
    for (const w of hand.winners) {
      const seat = hand.seats.find(s => s.seat === w);
      if (!seat) continue;
      const name = resolveName(seat.guid, hand);
      const winPot = distributable / hand.winners.length;
      lines.push(`${name} collected ${hand.currencySign}${winPot.toFixed(2)} from pot`);
    }
  } else if (hand.ended === 'fold-around' && hand._computedCalledPot && hand._computedUncalled) {
    // Fold-around with the uncalled winner — pot goes to the aggressor.
    // The uncalled-bet line already returned the excess; whatever's left
    // (blinds + earlier-street calls) is the winning collection.
    // hand.winners may be empty in this case; infer from lastAggressor.
    // (Skipped if winners are set — handled by the showdown branch above.)
  }

  // ─── *** SUMMARY *** ────────────────────────────────────────────
  lines.push('*** SUMMARY ***');
  // v0.2.5: Total pot is the CALLED pot (what actually got distributed),
  // not Hijack's snap.totalPot (which includes uncalled bets).
  const reportedPot = hand._computedCalledPot != null ? hand._computedCalledPot : (hand.pot || 0);
  lines.push(`Total pot ${hand.currencySign}${reportedPot.toFixed(2)} | Rake ${hand.currencySign}${(hand.rake || 0).toFixed(2)}`);

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
  const distributable = hand._computedCalledPot != null ? hand._computedCalledPot : (hand.pot || 0);
  for (const s of seatList) {
    const name = resolveName(s.guid, hand);
    const position = describePosition(s.seat, hand);
    if (hand.winners.includes(s.seat)) {
      const winPot = distributable / Math.max(1, hand.winners.length);
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

/**
 * Render a street's actions AND compute per-street betting state.
 * Returns { totalContributed, perPlayerCommit, lastAggressor, lastAggressorBet,
 *           uncalled, uncalledSeat } so the caller can emit Uncalled-bet lines
 * + a correct Total-pot summary.
 */
function renderStreetActions(lines, hand, street) {
  const actions = (hand.streets[street] || []).filter(a => a.kind === 'action');
  let currentHigh = 0;
  const playerCommit = new Map();
  if (street === 'preflop') {
    currentHigh = hand.bb || 0;
    if (hand.sbSeat && hand.sb) playerCommit.set(hand.sbSeat, hand.sb);
    if (hand.bbSeat && hand.bb) playerCommit.set(hand.bbSeat, hand.bb);
  }
  const cs = hand.currencySign;
  const fmt = (n) => `${cs}${(n || 0).toFixed(2)}`;

  // v0.2.5: track the last aggressor (bettor/raiser) of the street so we can
  // detect an uncalled bet. After all actions are processed, if the last
  // aggressor's commit is higher than the next-highest commit, the difference
  // is an uncalled bet that PokerStars convention returns to them.
  let lastAggressor = null;
  let callersAfterAggression = 0;

  for (const a of actions) {
    const seat = hand.seats.find(s => s.seat === a.seat);
    if (!seat) continue;
    const name = resolveName(seat.guid, hand);
    const prevCommit = playerCommit.get(a.seat) || 0;
    switch (a.action) {
      case 'fold':
        lines.push(`${name}: folds${a.sitout ? ' (sit out)' : ''}`);
        break;
      case 'check':
        lines.push(`${name}: checks`);
        break;
      case 'call': {
        const delta = Math.max(0, currentHigh - prevCommit);
        lines.push(`${name}: calls ${fmt(delta)}`);
        playerCommit.set(a.seat, currentHigh);
        if (lastAggressor && a.seat !== lastAggressor) callersAfterAggression++;
        break;
      }
      case 'bet': {
        lines.push(`${name}: bets ${fmt(a.amount)}`);
        currentHigh = a.amount || 0;
        playerCommit.set(a.seat, a.amount || 0);
        lastAggressor = a.seat;
        callersAfterAggression = 0;
        break;
      }
      case 'raise': {
        const newTotal = a.amount || 0;
        const increment = Math.max(0, newTotal - currentHigh);
        lines.push(`${name}: raises ${fmt(increment)} to ${fmt(newTotal)}`);
        currentHigh = newTotal;
        playerCommit.set(a.seat, newTotal);
        lastAggressor = a.seat;
        callersAfterAggression = 0;
        break;
      }
      case 'allin': {
        const amt = a.amount || 0;
        if (currentHigh === 0) {
          lines.push(`${name}: bets ${fmt(amt)} and is all-in`);
          lastAggressor = a.seat;
          callersAfterAggression = 0;
        } else if (amt > currentHigh) {
          const increment = amt - currentHigh;
          lines.push(`${name}: raises ${fmt(increment)} to ${fmt(amt)} and is all-in`);
          lastAggressor = a.seat;
          callersAfterAggression = 0;
        } else {
          const delta = Math.max(0, amt - prevCommit);
          lines.push(`${name}: calls ${fmt(delta)} and is all-in`);
          if (lastAggressor && a.seat !== lastAggressor) callersAfterAggression++;
        }
        currentHigh = Math.max(currentHigh, amt);
        playerCommit.set(a.seat, Math.max(playerCommit.get(a.seat) || 0, amt));
        break;
      }
    }
  }

  // Compute uncalled bet (if any). For PokerStars convention: when only one
  // player is at the highest commit level on a street, the difference between
  // their commit and the next-highest is "uncalled" and returned.
  let uncalled = 0;
  let uncalledSeat = null;
  if (lastAggressor && callersAfterAggression === 0) {
    const aggressorCommit = playerCommit.get(lastAggressor) || 0;
    let secondHigh = 0;
    for (const [seat, commit] of playerCommit) {
      if (seat === lastAggressor) continue;
      if (commit > secondHigh) secondHigh = commit;
    }
    if (aggressorCommit > secondHigh) {
      uncalled = aggressorCommit - secondHigh;
      uncalledSeat = lastAggressor;
    }
  }

  let totalContributed = 0;
  for (const c of playerCommit.values()) totalContributed += c;

  return { totalContributed, playerCommit, uncalled, uncalledSeat };
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
