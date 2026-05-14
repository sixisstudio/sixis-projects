// Hijack Poker HH Logger — Schema fingerprint + drift detection
//
// Local heuristic-only — no phone-home (per council R2 stealth requirement).
// Computes a stable fingerprint of the gotOmaha schema shape and detects
// when Hijack ships a client update that changes the message structure.

const FINGERPRINT_STORAGE_KEY = 'hjk_schema_fingerprint';
const DEGRADED_HAND_WINDOW_MS = 30 * 60 * 1000;  // 30 min
const DEGRADED_HAND_THRESHOLD = 0.20;  // > 20% degraded → red alert

/**
 * Compute a stable schema fingerprint for a gotOmaha .game object.
 * Fingerprint is the sorted list of top-level keys, hashed.
 * @param {object} game
 * @returns {string} — 12-char hex fingerprint
 */
export async function computeFingerprint(game) {
  if (!game || typeof game !== 'object') return 'invalid';
  const keys = Object.keys(game).sort().join('|');
  // Use SubtleCrypto for SHA-256 in service worker context
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(keys);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes.slice(0, 6)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple FNV-1a hash
  let h = 0x811c9dc5;
  for (let i = 0; i < keys.length; i++) {
    h ^= keys.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Get the last-known-good fingerprint from extension storage.
 */
export async function getStoredFingerprint() {
  return new Promise((res) => {
    chrome.storage.local.get([FINGERPRINT_STORAGE_KEY], (v) => {
      res(v[FINGERPRINT_STORAGE_KEY] || null);
    });
  });
}

/**
 * Save a fingerprint as the new known-good (after a successful session).
 */
export async function setStoredFingerprint(fp) {
  return new Promise((res) => {
    chrome.storage.local.set({ [FINGERPRINT_STORAGE_KEY]: fp }, () => res());
  });
}

/**
 * Per-table drift detector. Compare each session's first gotOmaha fingerprint
 * against stored. Track hand-completion failures over time.
 */
export class DriftDetector {
  constructor(opts = {}) {
    this.threshold = opts.threshold || DEGRADED_HAND_THRESHOLD;
    this.windowMs = opts.windowMs || DEGRADED_HAND_WINDOW_MS;
    this.recentHands = [];  // { ts, degraded: bool }
    this.sessionFingerprint = null;
    this.shiftDetected = false;
  }

  /**
   * Process a fresh gotOmaha snapshot's schema. Returns:
   *   { ok: true } if schema matches stored fingerprint
   *   { ok: false, kind: 'schema_shift' } if fingerprint differs from stored
   *   { ok: false, kind: 'too_many_degraded' } if degraded-hand rate > threshold
   */
  async checkSchema(game) {
    if (!this.sessionFingerprint) {
      this.sessionFingerprint = await computeFingerprint(game);
      const stored = await getStoredFingerprint();
      if (stored && stored !== this.sessionFingerprint) {
        this.shiftDetected = true;
        return {
          ok: false,
          kind: 'schema_shift',
          stored,
          current: this.sessionFingerprint,
        };
      }
      // First time or matching — update stored
      if (!stored) await setStoredFingerprint(this.sessionFingerprint);
      return { ok: true };
    }
    return { ok: true };
  }

  /**
   * Record a hand completion. degraded = true if any heuristic failed.
   */
  recordHand(degraded) {
    const now = Date.now();
    this.recentHands.push({ ts: now, degraded: !!degraded });
    // Prune outside window
    const cutoff = now - this.windowMs;
    while (this.recentHands.length && this.recentHands[0].ts < cutoff) {
      this.recentHands.shift();
    }
  }

  /**
   * Check whether degraded-hand rate is over threshold.
   */
  degradedRate() {
    if (this.recentHands.length === 0) return 0;
    const degraded = this.recentHands.filter(h => h.degraded).length;
    return degraded / this.recentHands.length;
  }

  isAlerted() {
    return this.shiftDetected || this.degradedRate() > this.threshold;
  }
}

/**
 * Per-hand completeness heuristics. Run on a finalized hand record to
 * decide if it's [parser-degraded].
 * @param {object} hand — finalized hand record
 * @returns {{ok: boolean, reasons: string[]}}
 */
export function runHandHeuristics(hand) {
  const reasons = [];

  // Minimum fields
  if (!hand.handNo) reasons.push('missing_handNo');
  if (!hand.bb || hand.bb <= 0) reasons.push('missing_bb');
  if (!hand.seats || hand.seats.length === 0) reasons.push('no_seats');
  if (!hand.buttonSeat) reasons.push('missing_button');

  // Preflop actions sanity
  const preflop = hand.streets.preflop || [];
  const blinds = preflop.filter(a => a.kind === 'blind');
  if (blinds.length < 1) reasons.push('no_blinds');  // SB or BB must have posted (BB-only HU is possible)

  // Pot conservation (loose check — sum of bets should be in vicinity of pot)
  // Skipped for v1 — would require summing across all streets with rake adjustment

  // Showdown sanity
  if (hand.ended === 'showdown') {
    if (!hand.winners || hand.winners.length === 0) reasons.push('showdown_no_winners');
    // v0.2.34: don't flag missing winningHands — Hijack frequently omits
    // hand-strength strings (win1..win9) on spectator-mode captures even
    // though winners and cards reconcile fine. PT4/HM3 don't need them.
    // Was over-flagging ~60% of spectator hands as degraded.
  }

  // Board card count consistency with street progression
  const boardCount = (hand.board.flop ? hand.board.flop.length : 0)
    + (hand.board.turn && hand.board.turn !== 'facedown' ? 1 : 0)
    + (hand.board.river && hand.board.river !== 'facedown' ? 1 : 0);
  const turnActions = (hand.streets.turn || []).length;
  const riverActions = (hand.streets.river || []).length;
  if (turnActions > 0 && boardCount < 4) reasons.push('turn_actions_without_turn_card');
  if (riverActions > 0 && boardCount < 5) reasons.push('river_actions_without_river_card');

  return { ok: reasons.length === 0, reasons };
}
