// Parser + hand state + writer unit tests.
//
// Run via: node tests/parser.test.js  (vanilla node — no test framework needed)
//
// Tests are minimal — validate the state machine produces a reasonable hand
// record from the recon-derived fixture. Not exhaustive; serves as a smoke
// test + canary for future protocol changes.

import { extractSnapshot, snapshotKey, deriveActionEvent, detectHeroCardReveal } from '../src/background/parser.js';
import { TableState } from '../src/background/hand_state.js';
import { renderHand } from '../src/background/ps_writer.js';
import { hjkToPS, hjkArrayToPS } from '../src/lib/card_codec.js';
import { hand168103Snapshots, hand168104Snapshots } from './fixtures/hand_168103.js';

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.log(`  ✗ ${msg}`);
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ─── Tests ────────────────────────────────────────────────────────

describe('card codec — Hijack uses "10" for Ten, others single-char', () => {
  assert(hjkToPS('KC') === 'Kc', 'KC -> Kc');
  assert(hjkToPS('AH') === 'Ah', 'AH -> Ah');
  assert(hjkToPS('2D') === '2d', '2D -> 2d');
  assert(hjkToPS('10C') === 'Tc', '10C -> Tc (the bug from prod hand 266754)');
  assert(hjkToPS('10S') === 'Ts', '10S -> Ts');
  assert(hjkToPS('10H') === 'Th', '10H -> Th');
  assert(hjkToPS('10D') === 'Td', '10D -> Td');
  assert(hjkToPS('TC') === 'Tc', 'TC also works (PS-form input)');
  assert(hjkToPS('') === '', 'empty passthrough');
  assert(hjkToPS('facedown') === 'facedown', 'facedown passthrough');
  let threw = false;
  try { hjkToPS('ZZ'); } catch (e) { threw = true; }
  assert(threw, 'invalid rank throws');
  threw = false;
  try { hjkToPS('10X'); } catch (e) { threw = true; }
  assert(threw, 'invalid suit on "10" throws');
  assert(hjkArrayToPS(['KC','10S','AH']).join(' ') === 'Kc Ts Ah', 'array normalization');
  assert(hjkArrayToPS(['KC','','facedown','10S']).join(' ') === 'Kc Ts', 'array skips empty/facedown');
});

describe('snapshotKey / extractSnapshot', () => {
  const s0 = hand168103Snapshots[0].game;
  const s1 = hand168103Snapshots[1].game;
  assert(snapshotKey(s0) !== snapshotKey(s1), 'distinct snapshots have distinct keys');
  assert(snapshotKey(s0) === snapshotKey(s0), 'same snapshot produces same key');

  const snap = extractSnapshot(s0);
  assert(snap.gameID === 102, 'gameID extracted');
  assert(snap.gameNo === 168103, 'gameNo extracted');
  assert(snap.bb === 0.05, 'BB extracted');
  assert(snap.seats.length === 5, '5 occupied seats');
  assert(snap.seats.find(s => s.seat === 2).guid === 'U2s3xzGreA734pmnXIHeaV2XOwih', 'hero GUID at seat 2');
});

describe('deriveActionEvent', () => {
  const buttonSnap = extractSnapshot(hand168103Snapshots[0].game);
  const sbSnap = extractSnapshot(hand168103Snapshots[1].game);
  const bbSnap = extractSnapshot(hand168103Snapshots[2].game);
  const dealSnap = extractSnapshot(hand168103Snapshots[3].game);
  const foldSnap = extractSnapshot(hand168103Snapshots[4].game);
  const callSnap = extractSnapshot(hand168103Snapshots[5].game);
  const raiseSnap = extractSnapshot(hand168103Snapshots[6].game);
  const heroCallSnap = extractSnapshot(hand168103Snapshots[7].game);

  assert(deriveActionEvent(buttonSnap).kind === 'button', 'button event');
  assert(deriveActionEvent(sbSnap).type === 'sb', 'SB blind event');
  assert(deriveActionEvent(bbSnap).type === 'bb', 'BB blind event');
  assert(deriveActionEvent(dealSnap).kind === 'deal', 'deal event');
  assert(deriveActionEvent(foldSnap).action === 'fold', 'fold action');
  assert(deriveActionEvent(foldSnap).sitout === true, 'fold marked as sit-out');
  assert(deriveActionEvent(callSnap).action === 'call', 'call action');
  assert(deriveActionEvent(callSnap).amount === 0.05, 'call amount $0.05');
  assert(deriveActionEvent(raiseSnap).action === 'raise', 'raise action');
  assert(deriveActionEvent(raiseSnap).amount === 0.20, 'raise to $0.20');
  assert(deriveActionEvent(heroCallSnap).seat === 2, 'hero seat 2 acted');
});

describe('detectHeroCardReveal', () => {
  const beforeDeal = extractSnapshot(hand168103Snapshots[2].game);  // BB posted, no cards
  const afterDeal = extractSnapshot(hand168103Snapshots[3].game);   // cards dealt
  const reveal = detectHeroCardReveal(afterDeal, beforeDeal, 2);
  assert(reveal !== null, 'hero card reveal detected');
  assert(reveal.cards.length === 4, '4 hole cards');
  assert(reveal.cards[0] === 'KC', 'first card KC');
});

describe('TableState — full hand', () => {
  const events = [];
  const handsCompleted = [];

  const ts = new TableState({
    gameID: 102,
    heroSeatResolver: (snap) => {
      // Heuristic: find seat with real card values
      const seat = snap.seats.find(s => s.cards.some(c => c && c.length === 2 && c !== 'facedown'));
      return seat ? seat.seat : 0;
    },
    onHandComplete: (hand) => handsCompleted.push(hand),
    onAction: (ev) => events.push(ev),
  });

  // Feed all 8 snapshots of hand 168103
  for (const f of hand168103Snapshots) ts.process(f);

  // Then feed snapshot 0 of hand 168104 to trigger 168103 finalization
  for (const f of hand168104Snapshots) ts.process(f);

  assert(handsCompleted.length >= 1, 'at least 1 hand finalized');
  const h = handsCompleted[0];
  assert(h.handNo === 168103, 'finalized hand is 168103');
  assert(h.hero.seat === 2, 'hero seat = 2');
  assert(h.hero.cards.length === 4, 'hero has 4 hole cards');
  assert(h.hero.cards[0] === 'KC', 'hero card 1 = KC');
  assert(h.bb === 0.05, 'BB = $0.05');
  assert(h.buttonSeat === 6, 'button = seat 6');
  assert(h.seats.length === 5, '5 seats recorded');

  const preflop = h.streets.preflop || [];
  const blinds = preflop.filter(a => a.kind === 'blind');
  assert(blinds.length >= 2, 'SB + BB recorded');
  assert(blinds.find(b => b.type === 'sb' && b.seat === 1), 'seat 1 SB');
  assert(blinds.find(b => b.type === 'bb' && b.seat === 2), 'seat 2 BB');

  const actions = preflop.filter(a => a.kind === 'action');
  assert(actions.length === 4, '4 preflop actions (fold, call, raise, call)');
  assert(actions[0].action === 'fold' && actions[0].seat === 5, 'seat 5 folds first');
  assert(actions[1].action === 'call' && actions[1].seat === 6, 'seat 6 calls');
  assert(actions[2].action === 'raise' && actions[2].seat === 1, 'seat 1 raises');
  assert(actions[3].action === 'call' && actions[3].seat === 2, 'hero (seat 2) calls');
});

describe('renderHand — produces non-empty HH text', () => {
  const events = [];
  const handsCompleted = [];
  const ts = new TableState({
    gameID: 102,
    heroSeatResolver: (snap) => {
      const seat = snap.seats.find(s => s.cards.some(c => c && c.length === 2 && c !== 'facedown'));
      return seat ? seat.seat : 0;
    },
    onHandComplete: (h) => handsCompleted.push(h),
    onAction: (e) => events.push(e),
  });

  for (const f of hand168103Snapshots) ts.process(f);
  ts.flush('end');  // force finalize 168103 without needing hand 168104

  assert(handsCompleted.length >= 1, 'hand finalized via flush()');
  const text = renderHand(handsCompleted[0]);
  assert(text.includes('PokerStars Hand #168103'), 'header present');
  assert(text.includes('Omaha Pot Limit'), 'PLO format');
  assert(text.includes('$0.02/$0.05'), 'stakes');
  assert(text.includes('Hijack 102'), 'table name');
  assert(text.includes('Seat #6 is the button'), 'button position');
  assert(text.includes('posts small blind $0.02'), 'SB line');
  assert(text.includes('posts big blind $0.05'), 'BB line');
  assert(text.includes('*** HOLE CARDS ***'), 'hole cards marker');
  assert(text.includes('Dealt to call2bluff [Kc Jc 4s 2h]'), 'hero deal line with PS-formatted cards');
  assert(text.includes('folds'), 'a fold present');
  assert(text.includes('calls $0.05'), 'a call present');
  // v0.2.2: PokerStars format is "raises $Y to $X" — Y=increment, X=new total
  assert(text.includes('raises $0.15 to $0.20'), 'raise has increment + new-total in PokerStars format');
  assert(text.includes('calls $0.15'), 'call amount is delta (not running total) per PokerStars format');
  assert(text.includes('*** SUMMARY ***'), 'summary marker');
  assert(text.includes('Total pot $0.45'), 'pot total');

  if (fail > 0 || true) {
    console.log('\n--- Rendered HH ---');
    console.log(text);
    console.log('--- end ---\n');
  }
});

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
