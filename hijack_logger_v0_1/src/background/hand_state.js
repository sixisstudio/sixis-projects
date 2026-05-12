// Hijack Poker HH Logger — Per-table hand state machine
//
// One instance per (tabId, gameID). Consumes state snapshots + action events,
// builds hand records, emits completed records to the writer.
//
// State machine:
//   IDLE → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → COMPLETE → IDLE (next hand)

import {
  snapshotKey, extractSnapshot, deriveActionEvent,
  detectStreetTransition, detectHeroCardReveal, detectShowdownReveals,
} from './parser.js';

/**
 * Compute likely SB/BB seats from dealer position + occupied seats.
 * Cash-game rotation: SB = next occupied seat clockwise after dealer, BB =
 * the one after that. Heads-up special case: dealer is SB, the other player
 * is BB. Returns {sb, bb} both nullable.
 */
export function computeBlindSeats(dealerSeat, seatsArr) {
  if (!dealerSeat || !Array.isArray(seatsArr) || seatsArr.length === 0) {
    return { sb: null, bb: null };
  }
  const occupied = seatsArr.map(s => s.seat).filter(Boolean).sort((a, b) => a - b);
  const dealerIdx = occupied.indexOf(dealerSeat);
  if (dealerIdx < 0 || occupied.length < 2) return { sb: null, bb: null };
  if (occupied.length === 2) {
    // Heads-up: dealer posts SB, the other player posts BB
    return { sb: dealerSeat, bb: occupied[(dealerIdx + 1) % 2] };
  }
  return {
    sb: occupied[(dealerIdx + 1) % occupied.length],
    bb: occupied[(dealerIdx + 2) % occupied.length],
  };
}

const STATE = {
  IDLE: 'idle',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  COMPLETE: 'complete',
};

export class TableState {
  constructor({ gameID, heroSeatResolver, onHandComplete, onAction, onDegraded }) {
    this.gameID = gameID;
    this.heroSeatResolver = heroSeatResolver;  // (snap) → number — given a snapshot, decide which seat is hero
    this.onHandComplete = onHandComplete;       // (record) → void
    this.onAction = onAction || (() => {});     // (event) → void — for debug/popup
    this.onDegraded = onDegraded || (() => {}); // (reason) → void

    this.state = STATE.IDLE;
    this.currentHand = null;       // building hand record
    this.lastSnapKey = null;        // dedupe
    this.lastSnap = null;           // for diffs
    this.nameMap = new Map();       // GUID → displayName (accumulated)
    this.heroSeat = null;           // resolved once per hand
    this.heroResolvedDuringPreflop = false; // v0.2.6: spectator detection
    this.lastActionSig = null;       // v0.2.6: dedupe identical action events
  }

  /**
   * Process a parsed gotOmaha event payload.
   * @param {object} payload — { event:'gotOmaha', game: {...} }
   */
  process(payload) {
    if (!payload || payload.event !== 'gotOmaha' || !payload.game) return;
    const game = payload.game;
    if (game.gameID !== this.gameID) return;  // wrong table

    const key = snapshotKey(game);
    if (key === this.lastSnapKey) return;
    this.lastSnapKey = key;

    const snap = extractSnapshot(game);
    const prev = this.lastSnap;

    // Update name map from chat-derived hints
    for (const [guid, name] of Object.entries(snap.nameHints)) {
      this.nameMap.set(guid, name);
    }

    // Detect hand boundary via gameNo change
    if (this.currentHand && snap.gameNo !== this.currentHand.handNo) {
      // Prior hand wasn't cleanly closed (no showdown event seen). Finalize it.
      this._finalizeHand('gamenum_advance');
    }

    // Start a new hand if needed
    if (!this.currentHand || snap.gameNo !== this.currentHand.handNo) {
      this._startHand(snap);
    }

    // Resolve hero seat — keep trying until non-zero (cards haven't appeared yet)
    // v0.2.6: only ACCEPT a hero candidate during preflop (before any board cards).
    // If we first see a seat with cards AFTER the flop, that's a villain reveal at
    // showdown — we're spectating, not playing. Don't stamp a fake hero.
    if (!this.heroSeat) {
      try {
        const candidate = this.heroSeatResolver(snap, this.nameMap);
        if (candidate) {
          const boardCardCount = (snap.board || []).filter(c => c && c !== 'facedown').length;
          if (boardCardCount === 0) {
            this.heroSeat = candidate;
            this.heroResolvedDuringPreflop = true;
          }
          // else: spectator — leave heroSeat null, no "Dealt to" line will be emitted
        }
      } catch (e) { /* swallow */ }
    }

    // Detect hero hole-card reveal
    const heroReveal = detectHeroCardReveal(snap, prev, this.heroSeat);
    if (heroReveal && this.currentHand && !this.currentHand.hero.cards.length) {
      this.currentHand.hero.cards = heroReveal.cards.slice();
      this.currentHand.hero.seat = heroReveal.seat;
      this.onAction({ kind: 'hero_reveal', seat: heroReveal.seat });
    }

    // Detect villain showdown reveals
    const villainReveals = detectShowdownReveals(snap, prev, this.heroSeat);
    for (const [seat, cards] of Object.entries(villainReveals)) {
      this.currentHand.villainReveals[seat] = cards;
    }

    // Derive action event from languageKey
    const ev = deriveActionEvent(snap, prev);
    if (ev) {
      this._applyActionEvent(snap, ev);
      this.onAction(ev);
    }

    // Detect street transition by board-card delta (fallback if no GAME_MSG_DEAL_X)
    // v0.2.6: when the board jumps multiple streets at once (e.g., all-in →
    // dealer runs out 5 cards in one snap), open EACH skipped street so the
    // writer doesn't emit a malformed "RIVER [] [] [Qs]" with empty flop/turn.
    if (this.currentHand) {
      const realCount = (b) => (b || []).filter(c => c && c !== 'facedown').length;
      const prevCount = prev ? realCount(prev.board) : 0;
      const currCount = realCount(snap.board);
      if (currCount > prevCount) {
        if (prevCount < 3 && currCount >= 3 && this.currentHand.streets.flop === undefined) {
          this._beginStreet('flop', snap);
        }
        if (prevCount < 4 && currCount >= 4 && this.currentHand.streets.turn === undefined) {
          this._beginStreet('turn', snap);
        }
        if (prevCount < 5 && currCount >= 5 && this.currentHand.streets.river === undefined) {
          this._beginStreet('river', snap);
        }
      }
    }

    // Detect showdown via winner field appearing
    if (snap.winner && this.currentHand && this.currentHand.state !== STATE.SHOWDOWN && this.currentHand.state !== STATE.COMPLETE) {
      this._enterShowdown(snap);
    }

    // Snapshot pot info each tick
    if (this.currentHand) {
      const observedPot = snap.totalPot || snap.pot;
      if (observedPot > this.currentHand.lastPot) this.currentHand.lastPot = observedPot;
      this.currentHand.lastMove = snap.lastmove;
    }

    this.lastSnap = snap;
  }

  // ─── Internal state transitions ─────────────────────────────────────

  _startHand(snap) {
    // Capture initial table state — seats, stacks, button, blinds
    this.heroSeat = 0;
    // v0.2.3: default SB to floor(BB/2) via integer-cents math (avoids the
    // (bb/2).toFixed(2) rounding bug for BB=$0.05 -> "$0.03"). If we later
    // see GAME_PLAYER_SMALL_BLIND, hand.sb gets overwritten with the actual
    // observed amount.
    const bbCents = Math.round((snap.bb || 0) * 100);
    const defaultSBCents = Math.floor(bbCents / 2);
    // v0.2.4: compute SB/BB seats deterministically from dealer + occupied
    // seats. Cash games rotate clockwise: SB = next occupied seat after
    // dealer, BB = the one after that. We DO NOT trust snap.bbSeat (game
    // .bbPlayer field) because Hijack reports stale values in the first
    // frame of a new hand — the field updates by GAME_MSG_DEAL_CARDS but
    // _startHand fires on GAME_MSG_DEALER_BUTTON. Direct observation:
    // for hand 105097, first frame had bbPlayer=1 (stale from prior hand),
    // second frame had bbPlayer=2 (correct), and the actual BB was indeed
    // seat 2 per the dealer-rotation rule.
    const computed = computeBlindSeats(snap.dealerSeat, snap.seats);
    this.currentHand = {
      gameID: snap.gameID,
      handNo: snap.gameNo,
      state: STATE.IDLE,
      startedAt: snap.lastmove,
      lastMove: snap.lastmove,
      buttonSeat: snap.dealerSeat,
      bbSeat: computed.bb,    // refined when GAME_PLAYER_BIG_BLIND fires
      sbSeat: computed.sb,    // refined when GAME_PLAYER_SMALL_BLIND fires
      bb: snap.bb,             // refined when GAME_PLAYER_BIG_BLIND fires
      sb: defaultSBCents / 100, // refined when GAME_PLAYER_SMALL_BLIND fires
      straddleSeat: null,      // v0.2.9: set when GAME_PLAYER_BIG_BLIND fires for straddler
      straddle: 0,
      blindLevels: snap.blindLevels,
      gameType: snap.gameTypeDisplayName,
      currencySign: snap.currencySign,
      seats: this._snapshotSeats(snap),
      hero: { seat: 0, cards: [] },
      villainReveals: {},  // seatId → [cards]
      streets: {
        preflop: [],
      },
      board: { flop: [], turn: '', river: '' },
      pots: [],
      pot: 0,
      lastPot: 0,
      ended: null,         // 'showdown' | 'fold-around'
      winners: [],
      winningHands: [],
      rake: 0,
      degraded: false,
      degradedReason: null,
    };
    this.state = STATE.PREFLOP;
    this.currentHand.state = STATE.PREFLOP;
  }

  _snapshotSeats(snap) {
    // Initial seat snapshot at hand start — names, stacks, position
    return snap.seats.map(s => ({
      seat: s.seat,
      guid: s.guid,
      stack: s.stack,
      isHero: false,  // set later when heroSeat resolved
      status: s.status,
    }));
  }

  _applyActionEvent(snap, ev) {
    if (!this.currentHand) return;
    const hand = this.currentHand;
    const street = this._currentStreet();

    switch (ev.kind) {
      case 'button':
        // Button move — usually fires at start; record but don't add to actions
        hand.buttonSeat = ev.seat;
        break;
      case 'blind':
        if (ev.type === 'sb') { hand.sbSeat = ev.seat; hand.sb = ev.amount; }
        if (ev.type === 'bb') { hand.bbSeat = ev.seat; hand.bb = ev.amount; }
        if (ev.type === 'straddle') { hand.straddleSeat = ev.seat; hand.straddle = ev.amount; }
        hand.streets.preflop.push({
          kind: 'blind', type: ev.type, seat: ev.seat, amount: ev.amount,
        });
        break;
      case 'deal':
        // Hero cards will be detected separately via slot fill
        break;
      case 'street':
        // Will be handled in _beginStreet
        break;
      case 'action': {
        // v0.2.12: drop invalid preflop checks (only BB / straddler can check
        // preflop). When the relay delivers a GAME_PLAYER_CHECKS frame before
        // the board-flop transition fires, the check lands on preflop. PT4
        // rejects this as "action out of sequence". The synthesis layer in
        // ps_writer.js will fill in the missing check on the correct street.
        if (ev.action === 'check' && street === 'preflop' &&
            ev.seat !== hand.bbSeat && ev.seat !== hand.straddleSeat) {
          break;
        }
        if (!hand.streets[street]) hand.streets[street] = [];
        // v0.2.6: dedupe identical consecutive action events.
        const sig = `${street}|${ev.seat}|${ev.action}|${ev.amount || 0}`;
        if (sig === this.lastActionSig) break;
        this.lastActionSig = sig;
        hand.streets[street].push({
          kind: 'action', action: ev.action, seat: ev.seat,
          amount: ev.amount || 0, sitout: ev.sitout || false,
        });
        break;
      }
      case 'showdown':
        // _enterShowdown handles transition
        break;
      case 'unknown_lk':
        this.onAction({ kind: 'unknown_lk', lk: ev.lk });
        break;
    }
  }

  _currentStreet() {
    if (!this.currentHand) return 'preflop';
    if (this.currentHand.board.river) return 'river';
    if (this.currentHand.board.turn) return 'turn';
    if (this.currentHand.board.flop.length) return 'flop';
    return 'preflop';
  }

  _beginStreet(street, snap) {
    if (!this.currentHand) return;
    const hand = this.currentHand;
    const cards = snap.board;  // raw Hijack format, will be normalized at write time
    if (street === 'flop') {
      hand.board.flop = cards.slice(0, 3);
      hand.streets.flop = [];
    } else if (street === 'turn') {
      hand.board.turn = cards[3];
      hand.streets.turn = [];
    } else if (street === 'river') {
      hand.board.river = cards[4];
      hand.streets.river = [];
    }
  }

  _enterShowdown(snap) {
    if (!this.currentHand) return;
    const hand = this.currentHand;
    hand.state = STATE.SHOWDOWN;
    hand.ended = 'showdown';
    hand.winners = (snap.winner || '').split(',').map(s => parseInt(s, 10)).filter(Boolean);
    hand.winningHands = snap.wins.filter(Boolean).map((w, i) => ({
      cards: w, type: snap.winTypes[i] || 'win',
    }));
    hand.pots = snap.pots.slice();
    hand.pot = snap.totalPot || snap.pot;
    // Don't finalize yet — wait for hand to "settle" (next gameNo, or timeout)
  }

  _finalizeHand(reason) {
    if (!this.currentHand) return;
    const hand = this.currentHand;
    hand.state = STATE.COMPLETE;
    if (!hand.ended) hand.ended = 'fold-around';

    // Fall back to lastPot if showdown didn't fire
    if (!hand.pot && hand.lastPot) hand.pot = hand.lastPot;

    if (reason === 'gamenum_advance' && !hand.winners.length) {
      // v0.2.11: synthesize a winner if no explicit showdown frame fired.
      // The last non-folded seat is the winner (everyone else folded).
      const folded = new Set();
      for (const street of ['preflop','flop','turn','river']) {
        for (const a of (hand.streets[street] || [])) {
          if (a.kind === 'action' && a.action === 'fold') folded.add(a.seat);
        }
      }
      const survivors = hand.seats.map(s => s.seat).filter(s => !folded.has(s));
      if (survivors.length === 1) {
        hand.winners = [survivors[0]];
      } else if (survivors.length === 0) {
        // Misdeal — mark degraded
        hand.degraded = true;
        hand.degradedReason = 'no_explicit_finalize';
      }
      // If multiple survivors with no showdown, still degraded (can't know who won)
      if (!hand.winners.length) {
        hand.degraded = true;
        hand.degradedReason = 'no_explicit_finalize';
      }
    }

    // v0.2.11: bump zero-stack seats up to at least their final commit so PT4
    // doesn't reject "bet $X with zero stack". Hijack reports stack=0 on
    // hand-start frame for players whose rebuy hasn't completed yet.
    const finalCommits = new Map();
    for (const street of ['preflop','flop','turn','river']) {
      let streetCurrentHigh = 0;
      let streetCommits = new Map();
      if (street === 'preflop') {
        if (hand.sbSeat && hand.sb) streetCommits.set(hand.sbSeat, hand.sb);
        if (hand.bbSeat && hand.bb) streetCommits.set(hand.bbSeat, hand.bb);
        if (hand.straddleSeat && hand.straddle) streetCommits.set(hand.straddleSeat, hand.straddle);
        streetCurrentHigh = Math.max(hand.bb || 0, hand.straddle || 0);
      }
      for (const a of (hand.streets[street] || [])) {
        if (a.kind !== 'action') continue;
        if (a.action === 'bet') { streetCurrentHigh = a.amount; streetCommits.set(a.seat, a.amount); }
        else if (a.action === 'raise') { streetCurrentHigh = a.amount; streetCommits.set(a.seat, a.amount); }
        else if (a.action === 'call') { streetCommits.set(a.seat, streetCurrentHigh); }
        else if (a.action === 'allin') { streetCommits.set(a.seat, Math.max(streetCommits.get(a.seat) || 0, a.amount)); if (a.amount > streetCurrentHigh) streetCurrentHigh = a.amount; }
      }
      for (const [seat, c] of streetCommits) {
        finalCommits.set(seat, (finalCommits.get(seat) || 0) + c);
      }
    }
    for (const s of hand.seats) {
      const commit = finalCommits.get(s.seat) || 0;
      if (commit > s.stack) s.stack = commit;
    }

    // Attach name map snapshot for the writer to use
    hand.nameMap = Object.fromEntries(this.nameMap);
    // Stamp finalized hero seat (in case it was resolved late)
    if (hand.hero && !hand.hero.seat && this.heroSeat) hand.hero.seat = this.heroSeat;

    try {
      this.onHandComplete(hand);
    } catch (e) {
      // Swallow — never let writer errors break the state machine
    }
    this.currentHand = null;
    this.heroSeat = 0;
    this.heroResolvedDuringPreflop = false;
    this.lastActionSig = null;
    this.state = STATE.IDLE;
  }

  /**
   * Force-finalize the current hand. Used on tab close or session end.
   */
  flush(reason = 'flush') {
    if (this.currentHand) this._finalizeHand(reason);
  }
}
