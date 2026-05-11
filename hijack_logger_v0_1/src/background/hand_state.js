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
    if (!this.heroSeat) {
      try {
        const candidate = this.heroSeatResolver(snap, this.nameMap);
        if (candidate) this.heroSeat = candidate;
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
    const newStreet = detectStreetTransition(snap, prev);
    if (newStreet && this.currentHand && this.currentHand.streets[newStreet] === undefined) {
      this._beginStreet(newStreet, snap);
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
      case 'action':
        if (!hand.streets[street]) hand.streets[street] = [];
        hand.streets[street].push({
          kind: 'action', action: ev.action, seat: ev.seat,
          amount: ev.amount || 0, sitout: ev.sitout || false,
        });
        break;
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
      // We never saw the showdown frame — possibly missing data
      hand.degraded = true;
      hand.degradedReason = 'no_explicit_finalize';
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
    this.state = STATE.IDLE;
  }

  /**
   * Force-finalize the current hand. Used on tab close or session end.
   */
  flush(reason = 'flush') {
    if (this.currentHand) this._finalizeHand(reason);
  }
}
