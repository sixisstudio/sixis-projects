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
  // v0.2.14: skip hands with no usable data — single-frame captures where
  // the relay dropped everything after DEALER_BUTTON. Returning empty string
  // causes the replay script to omit the hand from the .txt entirely.
  const hasAnyAction = ['preflop','flop','turn','river'].some(s =>
    (hand.streets[s] || []).some(a => a.kind === 'action')
  );
  const hasHeroCards = hand.hero && hand.hero.cards && hand.hero.cards.length > 0;
  const hasWinners = hand.winners && hand.winners.length > 0;
  if (!hasAnyAction && !hasHeroCards && !hasWinners) {
    return '';
  }
  // v0.2.16: skip hands we joined after they were already in progress —
  // partial action data produces misleading hand histories.
  if (hand.joinedMidHand) {
    return '';
  }
  // v0.2.17: skip hands where no blinds were posted (canceled hands / misdeals).
  const hasAnyBlind = (hand.streets.preflop || []).some(a => a.kind === 'blind')
    || (hand.bbSeat && hand.bb > 0) || (hand.sbSeat && hand.sb > 0);
  if (!hasAnyBlind && !hasWinners) {
    return '';
  }
  // v0.2.18: skip hands where blinds exist but no winner could be inferred.
  if (!hasWinners && hasAnyBlind) {
    return '';
  }
  // v0.2.18: skip hands where the declared winner has NO participation
  // (didn't post a blind/straddle, didn't take any action). Hijack
  // occasionally awards a fold-around pot to an idle seat — PT4 rejects
  // because the seat has $0 commit and no action.
  if (hand.winners && hand.winners.length === 1) {
    const w = hand.winners[0];
    const isBlindPoster = w === hand.sbSeat || w === hand.bbSeat || w === hand.straddleSeat;
    const hasOwnAction = ['preflop','flop','turn','river'].some(s =>
      (hand.streets[s] || []).some(a => a.kind === 'action' && a.seat === w)
    );
    if (!isBlindPoster && !hasOwnAction) {
      return '';
    }
  }

  const lines = [];

  // ─── Header ─────────────────────────────────────────────────────
  const handDate = formatPokerStarsDate(hand.startedAt);
  const gameDescription = hand.gameType === 'PLO'
    ? 'Omaha Pot Limit'
    : 'Omaha Pot Limit';  // TODO: handle non-PLO variants if ever in scope
  // v0.2.16: use canonical stake from blindLevels for the header, not the
  // possibly-jittered hand.sb/hand.bb (which can read 0 on DEAD_SB or carry
  // the straddle amount). Falls back to hand.sb/bb if blindLevels missing.
  const headerSB = (hand.stakeSB > 0 ? hand.stakeSB : hand.sb) || 0;
  const headerBB = (hand.stakeBB > 0 ? hand.stakeBB : hand.bb) || 0;
  const stakeDisplay = `(${hand.currencySign}${headerSB.toFixed(2)}/${hand.currencySign}${headerBB.toFixed(2)} USD)`;
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
  // v0.2.20: collect ALL blinds (real + synthesized) into one list, then emit
  // in strict PokerStars order: SB → BB → Straddle. Hijack frequently fires
  // BB before SB in straddle hands, and consolidates the real BB into the
  // straddle event (so the BB synthesis is needed). Emitting in canonical
  // order prevents PT4 from misinterpreting the blind positions.
  const realBlinds = (hand.streets.preflop || []).filter(a => a.kind === 'blind');
  const sawSB = realBlinds.some(b => b.type === 'sb');
  const sawBB = realBlinds.some(b => b.type === 'bb');
  const sawStraddle = realBlinds.some(b => b.type === 'straddle');

  const blinds = realBlinds.slice();
  // Synthesize SB if missing
  if (!sawSB && hand.sbSeat && hand.sb > 0) {
    blinds.push({ kind: 'blind', type: 'sb', seat: hand.sbSeat, amount: hand.sb });
  } else if (!sawSB && !hand.sbSeat && hand.bbSeat && hand.sb > 0) {
    const seatOrder = hand.seats.map(s => s.seat).sort((a, b) => a - b);
    const bbIdx = seatOrder.indexOf(hand.bbSeat);
    if (bbIdx > 0) blinds.push({ kind: 'blind', type: 'sb', seat: seatOrder[bbIdx - 1], amount: hand.sb });
  }
  // Synthesize BB if missing
  if (!sawBB && hand.bbSeat && hand.bb > 0) {
    blinds.push({ kind: 'blind', type: 'bb', seat: hand.bbSeat, amount: hand.bb });
  }

  const blindOrder = { sb: 0, bb: 1, straddle: 2 };
  blinds.sort((a, b) => (blindOrder[a.type] ?? 99) - (blindOrder[b.type] ?? 99));

  for (const b of blinds) {
    const seat = hand.seats.find(s => s.seat === b.seat);
    if (!seat) continue;
    const name = resolveName(seat.guid, hand);
    let blindName;
    if (b.type === 'sb') blindName = 'small blind';
    else if (b.type === 'bb') blindName = 'big blind';
    else if (b.type === 'straddle') blindName = 'straddle';
    else blindName = 'ante';
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

  // v0.2.7: pre-compute survival info so renderStreetActions can synthesize
  // missing calls/checks for players whose actions were dropped by the relay.
  // Without this, PT4 rejects whole streets where the relay missed an
  // intermediate call ("Invalid pot size").
  const aliveSets = {
    preflop: computeAlivePastStreet(hand, 'preflop'),
    flop: computeAlivePastStreet(hand, 'flop'),
    turn: computeAlivePastStreet(hand, 'turn'),
    river: computeAlivePastStreet(hand, 'river'),
  };

  // v0.2.15: per-seat cumulative commit across streets — used to detect
  // when a call/bet would exceed a seat's stack and should be rendered as
  // "and is all-in". PT4 rejects hands where commit > stack as "Invalid stack".
  const cumulativeBySeat = new Map();
  const startingStackBySeat = new Map();
  // v0.2.18: use originalStack (pre-bump) for all-in detection.
  for (const s of hand.seats) startingStackBySeat.set(s.seat, s.originalStack !== undefined ? s.originalStack : s.stack);

  // v0.2.23: track the position where each street's actions END, so we can
  // insert the "Uncalled bet" line RIGHT AFTER the street with the uncalled
  // aggression (not after all streets). PT4 was double-subtracting the
  // uncalled because the line appeared after the river-runout synthetic
  // checks instead of immediately after the aggression-street's actions.
  let lastStreetUncalled = null;
  let uncalledInsertPosition = -1;

  // ─── Preflop actions (non-blind) ────────────────────────────────
  const preflopResult = renderStreetActions(lines, hand, 'preflop', aliveSets.preflop, startingStackBySeat, cumulativeBySeat);
  let cumulativeContributed = preflopResult.totalContributed;
  if (preflopResult.uncalled > 0) {
    lastStreetUncalled = preflopResult;
    uncalledInsertPosition = lines.length;
  }

  // ─── Flop ──────────────────────────────────────────────────────
  let flopResult = null;
  if (hand.board.flop && hand.board.flop.length === 3) {
    const flopCards = hjkArrayToPS(hand.board.flop);
    lines.push(`*** FLOP *** [${flopCards.join(' ')}]`);
    flopResult = renderStreetActions(lines, hand, 'flop', aliveSets.flop, startingStackBySeat, cumulativeBySeat);
    cumulativeContributed += flopResult.totalContributed;
    if (flopResult.uncalled > 0) {
      lastStreetUncalled = flopResult;
      uncalledInsertPosition = lines.length;
    }
  }

  // ─── Turn ──────────────────────────────────────────────────────
  let turnResult = null;
  if (hand.board.turn && hand.board.turn !== 'facedown') {
    const turnCard = hjkToPS(hand.board.turn);
    const flopCards = hjkArrayToPS(hand.board.flop);
    lines.push(`*** TURN *** [${flopCards.join(' ')}] [${turnCard}]`);
    turnResult = renderStreetActions(lines, hand, 'turn', aliveSets.turn, startingStackBySeat, cumulativeBySeat);
    cumulativeContributed += turnResult.totalContributed;
    if (turnResult.uncalled > 0) {
      lastStreetUncalled = turnResult;
      uncalledInsertPosition = lines.length;
    }
  }

  // ─── River ─────────────────────────────────────────────────────
  let riverResult = null;
  if (hand.board.river && hand.board.river !== 'facedown') {
    const riverCard = hjkToPS(hand.board.river);
    const flopCards = hjkArrayToPS(hand.board.flop);
    const turnCard = hjkToPS(hand.board.turn);
    lines.push(`*** RIVER *** [${flopCards.join(' ')}] [${turnCard}] [${riverCard}]`);
    riverResult = renderStreetActions(lines, hand, 'river', aliveSets.river, startingStackBySeat, cumulativeBySeat);
    cumulativeContributed += riverResult.totalContributed;
    if (riverResult.uncalled > 0) {
      lastStreetUncalled = riverResult;
      uncalledInsertPosition = lines.length;
    }
  }

  // v0.2.23: insert "Uncalled bet" line at the position right after the
  // street where the uncalled aggression occurred (PokerStars convention).
  let uncalledTotal = 0;
  if (lastStreetUncalled && lastStreetUncalled.uncalled > 0 && lastStreetUncalled.uncalledSeat && uncalledInsertPosition >= 0) {
    const seat = hand.seats.find(s => s.seat === lastStreetUncalled.uncalledSeat);
    if (seat) {
      const name = resolveName(seat.guid, hand);
      const uncalledLine = `Uncalled bet (${hand.currencySign}${lastStreetUncalled.uncalled.toFixed(2)}) returned to ${name}`;
      lines.splice(uncalledInsertPosition, 0, uncalledLine);
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
    // Pot collections.
    // v0.2.19: winner identification comes from Hijack's potwinShares (only
    // seats with potwin > 0 actually collect). The amount they collect is
    // the CALLED pot, split evenly.
    // v0.2.24: if called pot is $0 (everything returned uncalled — e.g.,
    // BB walks fold-around), don't emit any collect line. The winner got
    // their money back via the Uncalled bet line, no pot to collect.
    const distributable = hand._computedCalledPot != null ? hand._computedCalledPot : (hand.pot || 0);
    if (distributable > 0) {
      const shares = splitPotCents(distributable, hand.winners.length);
      hand._winnerShares = {};
      for (let i = 0; i < hand.winners.length; i++) {
        const w = hand.winners[i];
        const seat = hand.seats.find(s => s.seat === w);
        if (!seat) continue;
        const name = resolveName(seat.guid, hand);
        const winPot = shares[i];
        hand._winnerShares[w] = winPot;
        lines.push(`${name} collected ${hand.currencySign}${winPot.toFixed(2)} from pot`);
      }
    }
    // v0.2.24: if distributable === 0, skip collect emission (BB walks).
  } else if (hand.ended === 'fold-around' && hand.winners && hand.winners.length) {
    // v0.2.11: emit collect line for fold-around winners (no SHOW DOWN header).
    const distributable = hand._computedCalledPot != null ? hand._computedCalledPot : (hand.pot || 0);
    if (distributable > 0) {
      const shares = splitPotCents(distributable, hand.winners.length);
      hand._winnerShares = {};
      for (let i = 0; i < hand.winners.length; i++) {
        const w = hand.winners[i];
        const seat = hand.seats.find(s => s.seat === w);
        if (!seat) continue;
        const name = resolveName(seat.guid, hand);
        const winPot = shares[i];
        hand._winnerShares[w] = winPot;
        lines.push(`${name} collected ${hand.currencySign}${winPot.toFixed(2)} from pot`);
      }
    }
  }

  // ─── *** SUMMARY *** ────────────────────────────────────────────
  lines.push('*** SUMMARY ***');
  // v0.2.22: revert to calledPot for "Total pot". v0.2.21's gross-pot change
  // didn't help — PT4 ignores the Total pot header and computes its own pot
  // from actions, comparing to collect lines. Revert restores PokerStars
  // convention (Total pot = called pot, after uncalled-bet subtraction).
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
  const summaryShares = hand._winnerShares || {};
  for (const s of seatList) {
    const name = resolveName(s.guid, hand);
    const position = describePosition(s.seat, hand);
    if (hand.winners.includes(s.seat)) {
      // v0.2.6: use the same integer-cent share as the SHOW DOWN section
      const winPot = summaryShares[s.seat] != null
        ? summaryShares[s.seat]
        : (distributable / Math.max(1, hand.winners.length));
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
      // v0.2.13: check if the seat folded — if so, render "folded …" and
      // don't leak their cards (especially hero's hole cards on a preflop fold).
      const seatFolded = ['preflop','flop','turn','river'].some(st =>
        (hand.streets[st] || []).some(a => a.kind === 'action' && a.action === 'fold' && a.seat === s.seat)
      );
      const cards = (s.seat === hand.hero.seat && hand.hero.cards.length)
        ? hand.hero.cards
        : (hand.villainReveals[s.seat] || []);
      if (seatFolded) {
        lines.push(`Seat ${s.seat}: ${name}${position} folded ${describeFoldStreet(hand, s.seat)}`);
      } else if (cards.length) {
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
function renderStreetActions(lines, hand, street, alivePastStreet, startingStackBySeat, cumulativeBySeat) {
  const actions = (hand.streets[street] || []).filter(a => a.kind === 'action');
  let currentHigh = 0;
  const playerCommit = new Map();
  const actedThisStreet = new Set();      // seats that appear in this street's actions
  const foldedThisStreet = new Set();     // subset that folded
  if (street === 'preflop') {
    // v0.2.9: when a straddle exists, currentHigh starts at the straddle amount
    // (not BB), and the straddler's commit is preloaded too.
    currentHigh = Math.max(hand.bb || 0, hand.straddle || 0);
    if (hand.sbSeat && hand.sb) playerCommit.set(hand.sbSeat, hand.sb);
    if (hand.bbSeat && hand.bb) playerCommit.set(hand.bbSeat, hand.bb);
    if (hand.straddleSeat && hand.straddle) playerCommit.set(hand.straddleSeat, hand.straddle);
  }
  const cs = hand.currencySign;
  const fmt = (n) => `${cs}${(n || 0).toFixed(2)}`;

  // v0.2.15: helper — remaining stack for a seat at this street, accounting
  // for prior-street commits AND prior-this-street commits.
  const remaining = (seat) => {
    if (!startingStackBySeat) return Infinity;
    const start = startingStackBySeat.get(seat) || 0;
    const priorStreets = (cumulativeBySeat && cumulativeBySeat.get(seat)) || 0;
    const thisStreet = playerCommit.get(seat) || 0;
    return Math.max(0, start - priorStreets - thisStreet);
  };

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
    actedThisStreet.add(a.seat);
    switch (a.action) {
      case 'fold':
        foldedThisStreet.add(a.seat);
        lines.push(`${name}: folds${a.sitout ? ' (sit out)' : ''}`);
        break;
      case 'check':
        lines.push(`${name}: checks`);
        break;
      case 'call': {
        const delta = Math.max(0, currentHigh - prevCommit);
        // v0.2.7: skip $0 calls entirely on post-preflop streets (frame echo).
        if (delta === 0 && street !== 'preflop') {
          break;
        }
        // v0.2.15: if call would exceed remaining stack, cap and mark all-in.
        const rem = remaining(a.seat);
        if (delta > rem && rem > 0) {
          lines.push(`${name}: calls ${fmt(rem)} and is all-in`);
          playerCommit.set(a.seat, prevCommit + rem);
          // v0.2.18: do NOT increment callersAfterAggression here. An all-in
          // for LESS than the bet doesn't fully match the aggressor — the
          // unmatched portion needs to be returned as an uncalled bet, which
          // end-of-street logic detects when callersAfterAggression === 0.
          break;
        }
        lines.push(`${name}: calls ${fmt(delta)}`);
        playerCommit.set(a.seat, currentHigh);
        if (lastAggressor && a.seat !== lastAggressor) callersAfterAggression++;
        break;
      }
      case 'bet': {
        const rem = remaining(a.seat);
        const amt = a.amount || 0;
        if (amt > rem + prevCommit && rem > 0) {
          // v0.2.15: bet exceeds stack — render as all-in for max remaining.
          const actual = prevCommit + rem;
          lines.push(`${name}: bets ${fmt(actual)} and is all-in`);
          currentHigh = actual;
          playerCommit.set(a.seat, actual);
        } else {
          lines.push(`${name}: bets ${fmt(amt)}`);
          currentHigh = amt;
          playerCommit.set(a.seat, amt);
        }
        lastAggressor = a.seat;
        callersAfterAggression = 0;
        break;
      }
      case 'raise': {
        const newTotal = a.amount || 0;
        const rem = remaining(a.seat);
        if (newTotal > prevCommit + rem && rem > 0) {
          // v0.2.15: raise exceeds stack — cap at all-in.
          const actual = prevCommit + rem;
          const inc = actual - currentHigh;
          lines.push(`${name}: raises ${fmt(Math.max(0, inc))} to ${fmt(actual)} and is all-in`);
          currentHigh = actual;
          playerCommit.set(a.seat, actual);
        } else {
          const increment = Math.max(0, newTotal - currentHigh);
          lines.push(`${name}: raises ${fmt(increment)} to ${fmt(newTotal)}`);
          currentHigh = newTotal;
          playerCommit.set(a.seat, newTotal);
        }
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

  // v0.2.7: synthesize missing actions for players who DEMONSTRABLY survived
  // this street (have an action on a later street, or appeared at showdown)
  // but had no action recorded on this street. This recovers from relay
  // frame drops where intermediate calls were lost.
  // For each survivor not seen this street:
  //   - if currentHigh > their prevCommit → synthesize "calls $delta"
  //   - else → synthesize "checks"
  // Append at end-of-street so PT4 reads it as the closing action.
  // v0.2.10: synthesize missing actions by COMMIT-LEVEL, not "did the seat
  // appear in any action". A player who bet then got raised but never explicitly
  // called (frame drop) still has commit < currentHigh — they need a synthetic
  // call. Previous logic skipped them because they had a prior action.
  if (alivePastStreet && alivePastStreet.size > 1) {
    for (const survivorSeat of alivePastStreet) {
      const seat = hand.seats.find(s => s.seat === survivorSeat);
      if (!seat) continue;
      const name = resolveName(seat.guid, hand);
      const seatCommit = playerCommit.get(survivorSeat) || 0;
      if (currentHigh > seatCommit) {
        // Survivor owes money — synthesize the call.
        const delta = currentHigh - seatCommit;
        const rem = remaining(survivorSeat);
        let isAllInForLess = false;
        if (delta > rem && rem > 0) {
          lines.push(`${name}: calls ${fmt(rem)} and is all-in`);
          playerCommit.set(survivorSeat, seatCommit + rem);
          isAllInForLess = true;  // v0.2.18: unmatched portion will be returned via end-of-street uncalled-bet detection
        } else {
          lines.push(`${name}: calls ${fmt(delta)}`);
          playerCommit.set(survivorSeat, currentHigh);
        }
        if (!isAllInForLess && lastAggressor && survivorSeat !== lastAggressor) callersAfterAggression++;
      } else if (!actedThisStreet.has(survivorSeat)) {
        // Already at currentHigh AND no action seen — synthesize a check,
        // except on preflop for SB/BB/straddler whose blind line counts as
        // their action already.
        if (street !== 'preflop' || !(survivorSeat === hand.sbSeat || survivorSeat === hand.bbSeat || survivorSeat === hand.straddleSeat)) {
          lines.push(`${name}: checks`);
        }
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
  } else if (street === 'preflop' && !lastAggressor) {
    // v0.2.24: fold-around to the highest forced bet (BB or straddler). When
    // no one voluntarily aggressed, the seat with the highest forced commit
    // wins, and their excess over second-highest is uncalled.
    let topSeat = null, topCommit = 0;
    for (const [seat, commit] of playerCommit) {
      if (commit > topCommit) { topCommit = commit; topSeat = seat; }
    }
    if (topSeat != null) {
      let secondHigh = 0;
      for (const [seat, commit] of playerCommit) {
        if (seat === topSeat) continue;
        if (commit > secondHigh) secondHigh = commit;
      }
      if (topCommit > secondHigh) {
        uncalled = topCommit - secondHigh;
        uncalledSeat = topSeat;
      }
    }
  }

  let totalContributed = 0;
  for (const c of playerCommit.values()) totalContributed += c;

  // v0.2.15: persist this street's commits into the cumulative map so the
  // next street's remaining-stack calculation is correct.
  if (cumulativeBySeat) {
    for (const [seat, commit] of playerCommit) {
      cumulativeBySeat.set(seat, (cumulativeBySeat.get(seat) || 0) + commit);
    }
  }

  return { totalContributed, playerCommit, uncalled, uncalledSeat };
}

function resolveName(guid, hand) {
  // v0.2.16: ALWAYS use GUID-derived placeholder. Chat-resolved displayNames
  // are intentionally disabled because the same player rendered as
  // "Player_U2cwI8Pu" early in a session and "gregfrater" after their first
  // chat message would split into two distinct players in PT4's database.
  // Sticking to GUID-prefix keeps identity stable across all hands.
  if (!guid) return 'Unknown';
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

/**
 * v0.2.7: Compute the set of seats that demonstrably survived past a given
 * street — i.e., have an action recorded on a later street, OR appear in
 * the showdown (winners, villain reveals, or hero with hole cards). Used
 * to synthesize missing actions when the relay drops intermediate calls.
 */
function computeAlivePastStreet(hand, street) {
  const order = ['preflop', 'flop', 'turn', 'river'];
  const idx = order.indexOf(street);
  const later = idx >= 0 ? order.slice(idx + 1) : [];
  const alive = new Set();
  for (const ls of later) {
    for (const a of (hand.streets[ls] || [])) {
      if (a.kind === 'action') alive.add(a.seat);
    }
  }
  for (const w of (hand.winners || [])) alive.add(w);
  for (const k of Object.keys(hand.villainReveals || {})) alive.add(parseInt(k, 10));
  if (hand.hero && hand.hero.seat && hand.hero.cards && hand.hero.cards.length) {
    alive.add(hand.hero.seat);
  }
  // v0.2.11: remove any seat that folded on this OR an earlier street. Without
  // this, the hero (whose hole cards are kept for the muck line) and any seat
  // appearing in villainReveals would get synthesized post-fold calls.
  const foldedBy = new Set();
  const upTo = order.slice(0, idx + 1);
  for (const s of upTo) {
    for (const a of (hand.streets[s] || [])) {
      if (a.kind === 'action' && a.action === 'fold') foldedBy.add(a.seat);
    }
  }
  for (const f of foldedBy) alive.delete(f);
  return alive;
}

/**
 * Split a pot of `amount` (in dollars, 2-decimal precision) among `nWinners`
 * such that the integer-cent sum equals the input exactly. Odd cents go to
 * the earliest winner. Returns an array of dollar amounts.
 */
function splitPotCents(amount, nWinners) {
  if (nWinners <= 0) return [];
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / nWinners);
  const remainder = totalCents - base * nWinners;
  const out = [];
  for (let i = 0; i < nWinners; i++) {
    const cents = base + (i < remainder ? 1 : 0);
    out.push(cents / 100);
  }
  return out;
}

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
