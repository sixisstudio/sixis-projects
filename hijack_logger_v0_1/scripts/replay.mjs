#!/usr/bin/env node
// Hijack Logger — Replay tool
//
// Reads one or more .raw.jsonl files and regenerates the corresponding .txt
// hand histories using the CURRENT parser + writer. Use case:
//   1. The parser/writer had a bug at capture time; .raw.jsonl was correct
//      but .txt was malformed. Re-parse to produce correct .txt.
//   2. Schema-drift recovery: Hijack ships a client update that changes
//      the gotOmaha shape; once the parser is updated, replay old captures.
//
// Usage:
//   node scripts/replay.mjs <path-to-raw.jsonl> [more-raw.jsonl files]
//
// Output: one .txt file per input .raw.jsonl, written next to the input
// with the .raw.jsonl extension swapped for .txt (or .txt.replayed if .txt
// already exists, to avoid clobber).

import fs from 'fs';
import path from 'path';
import url from 'url';

// Import parser + writer modules (ESM)
const here = path.dirname(url.fileURLToPath(import.meta.url));
const { TableState } = await import(path.join(here, '..', 'src', 'background', 'hand_state.js'));
const { renderHand } = await import(path.join(here, '..', 'src', 'background', 'ps_writer.js'));
const { parseGameWSFrame } = await import(path.join(here, '..', 'src', 'background', 'parser.js'));
const { isRealCard } = await import(path.join(here, '..', 'src', 'lib', 'card_codec.js'));

function heroSeatResolver(snap) {
  for (const s of snap.seats) {
    if (s.cards.some(isRealCard)) return s.seat;
  }
  return 0;
}

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error('Usage: node scripts/replay.mjs <path-to-raw.jsonl> [more...]');
  process.exit(1);
}

for (const inputFile of inputs) {
  console.log(`\n=== Replaying: ${inputFile} ===`);
  if (!fs.existsSync(inputFile)) {
    console.error(`  ERROR: file not found`);
    continue;
  }

  const outputFile = inputFile.replace(/\.raw\.jsonl$/, '.txt');
  const replayOutput = fs.existsSync(outputFile)
    ? outputFile.replace(/\.txt$/, '.replayed.txt')
    : outputFile;

  // Map of gameID -> { ts: TableState, hands: [] }
  const perTable = new Map();

  function getOrCreateTable(gameID) {
    if (perTable.has(gameID)) return perTable.get(gameID);
    const hands = [];
    const ts = new TableState({
      gameID,
      heroSeatResolver,
      onHandComplete: (hand) => hands.push(hand),
    });
    const entry = { ts, hands };
    perTable.set(gameID, entry);
    return entry;
  }

  // Stream-read the file line by line (memory-friendly for 50MB files)
  const data = fs.readFileSync(inputFile, 'utf-8');
  const lines = data.split('\n');
  let frameCount = 0;
  let gotOmahaCount = 0;
  let parseErrors = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    let frame;
    try { frame = JSON.parse(line); }
    catch (e) { parseErrors++; continue; }
    frameCount++;

    // Only inbound game-ws frames
    if (frame.dir !== 'in') continue;
    if (!frame.data || frame.data.type !== 'string') continue;
    if (!frame.url || !frame.url.includes('game-ws.hijackpoker.com')) continue;

    const parsed = parseGameWSFrame(frame.data.value);
    if (!parsed) continue;
    if (parsed.event !== 'gotOmaha') continue;
    gotOmahaCount++;

    const game = parsed.payload.game;
    if (!game || !game.gameID) continue;

    const entry = getOrCreateTable(game.gameID);
    entry.ts.process(parsed.payload);
  }

  // Flush remaining open hands
  for (const entry of perTable.values()) {
    entry.ts.flush('eof');
  }

  // Render all hands across all tables (sorted by handNo for chronological order)
  const allHands = [];
  for (const entry of perTable.values()) {
    allHands.push(...entry.hands);
  }
  allHands.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0) || (a.handNo || 0) - (b.handNo || 0));

  const text = allHands.map(renderHand).join('');
  fs.writeFileSync(replayOutput, text);

  const gameIDs = Array.from(perTable.keys()).join(', ');
  console.log(`  frames: ${frameCount}, gotOmaha: ${gotOmahaCount}, parse-errors: ${parseErrors}`);
  console.log(`  tables: ${gameIDs}`);
  console.log(`  hands rendered: ${allHands.length}`);
  console.log(`  output: ${replayOutput} (${text.length} bytes)`);
}

console.log('\nDone.');
