# Hijack Poker Hand History Logger — Layer B Spec v1

**Project draft:** `58b57cb3-079b-4559-9cb8-85ceaad52b44`
**Cycle:** `37245c60-914e-443b-bede-66a36fe09099`
**Tier:** 1 (personal tool, ~5 buddies, sideload)
**Status:** Phase 0 architecture validation complete (Gates 1-4 PASS as of 2026-05-11). Gate 5 (FSA durability) + Gates 6-7 (50-hand + HM3 import) pending but not architecture-blocking.

---

## 1. Z1 (frozen)

A sideload-installable Chrome extension that captures PLO cash hands played at `game.hijack.poker` by intercepting WebSocket frames in the page context, reconstructs PokerStars-format hand histories, and writes one `.txt` per table per session to a user-picked local directory via File System Access API. Live-append per completed hand. Multi-table. Cross-platform Chrome (Mac + Windows). Stealth-hardened to be undetectable to Hijack's Unity client at runtime. No phone-home. Review-only usage (no HUD, no in-play UI, no real-time assist).

Out of scope: NLHE, PLO5, mixed games, tournaments, SNGs; Chrome Web Store; HM3-on-Mac; replay UI in extension; pre-load hand reconstruction; any site other than Hijack; any in-page UI injection.

---

## 2. Architecture summary (validated)

```
                 game.hijack.poker (Unity WebGL client)
                                │
                                ▼  (wss frames, JSON + gzip-base64)
                  Hardened WebSocket proxy (MAIN world, document_start)
                                │
                                ▼  (chrome.runtime.sendMessage)
                  Background service worker (per-table state machine)
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
         FSA writer        Schema fingerprint    Popup state
         (.txt + raw)      + heuristic checks    (counters, alerts)
                │
                ▼
         Local directory (user-picked)
                │
                ▼
         HM3 imports .txt as PokerStars (Windows)
```

**Validated facts from Phase 0 recon:**

- `window.WebSocket` is vanilla native at game load time. No Unity-side wrapping.
- Game state for table N comes via `wss://game-ws.hijackpoker.com/?token=<JWT>` on a single per-user authenticated socket. Plain JSON text frames.
- Single event carries all state: `{event:"gotOmaha", game:{...415 keys...}}`. ~21KB per push, broadcast on every action.
- Server-side per-recipient filtering populates hero's `p{seat}card1..p{seat}card4` slots with real hole-card strings (e.g. `"KC", "JC", "4S", "2H"`) at deal time. Villains' card slots stay empty until showdown.
- Board cards in `card1..card5` with values like `"QD"` or `"facedown"` for unrevealed.
- Action enum source-of-truth: `languageKey` field (`GAME_PLAYER_FOLDS`, `_CALLS`, `_RAISES`, `_CHECKS`, `_SMALL_BLIND`, `_BIG_BLIND`, `_BET`, `_ALLIN`, `_DEALER_BUTTON`, `_DEAL_CARDS`).
- Cross-check / breadcrumb: `debugMSG` field, format `<state-id>-<action-class>-<actor-seat>-<target-seat>-<epoch>`.
- Hand boundary: `gameNo` (monotonic per table, e.g. 168103).
- State pulse timestamp: `lastmove` (epoch seconds).
- Pot structure: `pot` (scalar) + `totalPot` (string) + `pots[]` (side-pot array with `{pot, players[], playersV2[{pID, pBet}], label, fullLabel, winners[]}`).
- Showdown: `win1..win9` (5-card eval strings) + `winType1..win9` + `winner` (CSV of winning seat IDs) + `showdown:{currentPot, currentStep, handType}` sub-object.
- Chat: `chatMessages[]` array of `{GUID, displayName, avatar, messageGUID, message, ts}` (we do NOT capture or persist chat — privacy + irrelevant to HH).
- Per-seat slots: `p{N}name` (GUID), `p{N}bet`, `p{N}lbet`, `p{N}BetDisplay`, `p{N}pot` (stack), `p{N}action`, `p{N}lastAction`, `p{N}status`, `p{N}sitout`, `p{N}card1..p{N}card5`, plus 10+ more.
- No encryption. socket.io engine channel uses gzip-base64 inside text envelopes; auth game channel uses plain JSON.

**Parser strategy:** dedupe `gotOmaha` snapshots by `(gameNo, lastmove, lastaction, lastplayer)`, emit state-diff events, drive a per-hand state machine. Capture hero hole cards on `p{heroseat}card1..p{heroseat}card4` slot fill. Capture villain hole cards (if revealed at showdown) from same slots.

---

## 3. File structure

```
hijack_logger_v0_1/
├── manifest.json                 # MV3 manifest
├── src/
│   ├── background/
│   │   ├── service_worker.js     # entry point, message router, state machine
│   │   ├── ws_proxy.js           # injected via chrome.scripting.executeScript({world:'MAIN'})
│   │   ├── parser.js             # gotOmaha → action events → hand records
│   │   ├── hand_state.js         # per-table state machine
│   │   ├── ps_writer.js          # hand record → PokerStars HH text
│   │   ├── fs_writer.js          # FSA write path
│   │   ├── raw_sidecar.js        # always-on raw frame writer
│   │   └── schema_fingerprint.js # local fingerprint + drift detection
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js              # counter UI, directory picker, settings
│   │   └── popup.css
│   └── lib/
│       ├── gzip.js               # DecompressionStream wrapper for socket.io payloads
│       └── card_codec.js         # "QD" ↔ "Qd" PokerStars-format card normalization
├── spec/
│   ├── LAYER_B_v1.md             # this document
│   ├── PROTOCOL_NOTES.md         # detailed Hijack WS protocol reference
│   └── HM3_FORMAT.md             # PokerStars HH format spec subset we emit
├── tests/
│   ├── fixtures/                 # captured hand sequences from recon
│   └── parser.test.js
└── README.md                     # sideload install instructions
```

---

## 4. Component specs

### 4.1 Stealth-hardened WS proxy (`src/background/ws_proxy.js`)

Injected into MAIN world at `document_start` via `chrome.scripting.executeScript`. Must run BEFORE the Unity WASM loader fires. Captures `WebSocket.prototype.send` + per-instance `addEventListener('message')` + `onmessage` setter on prototype. Forwards captured frames to the service worker via `window.postMessage` (then a content script in ISOLATED world relays to `chrome.runtime.sendMessage`).

**Hardening checklist (from council R1 — Claude.ai's hardening spec):**

```js
// Pseudo-code structure
(() => {
  // Stash all originals in closure BEFORE any patching
  const _OrigWS = window.WebSocket;
  const _OrigSend = WebSocket.prototype.send;
  const _OrigAddListener = WebSocket.prototype.addEventListener;
  const _OrigOnMessageDesc = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
  const _OrigFnToString = Function.prototype.toString;
  const _StringPatched = new WeakMap(); // patched-fn → original-toString-result
  
  // Patch send to capture outbound
  const patchedSend = function(data) {
    relayFrame('out', this.url, data);
    return _OrigSend.call(this, data);
  };
  _StringPatched.set(patchedSend, _OrigFnToString.call(_OrigSend));  // pre-compute fake toString result
  
  // Defeat toString integrity check (per-function, NOT global Function.prototype.toString patch — louder)
  const fakeToString = function() {
    if (_StringPatched.has(this)) return _StringPatched.get(this);
    return _OrigFnToString.call(this);
  };
  Object.defineProperty(patchedSend, 'toString', {value: fakeToString, configurable: true, writable: true});
  // (toString.toString must also lie — recursive)
  Object.defineProperty(fakeToString, 'toString', {value: fakeToString, configurable: true, writable: true});
  
  // Install send patch preserving descriptor shape exactly
  const sendDesc = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send');
  Object.defineProperty(WebSocket.prototype, 'send', {
    value: patchedSend,
    writable: sendDesc.writable,
    enumerable: sendDesc.enumerable,
    configurable: sendDesc.configurable
  });
  
  // Same treatment for addEventListener + onmessage setter
  // (see implementation file)
  
  // Wrap constructor — preserve .toString as native, .name, .prototype, static constants
  const PatchedWS = function(...args) {
    const ws = new _OrigWS(...args);
    relaySocketOpen(ws.url);
    return ws;
  };
  Object.defineProperty(PatchedWS, 'name', {value: 'WebSocket'});
  Object.defineProperty(PatchedWS, 'toString', {value: () => _OrigFnToString.call(_OrigWS), configurable: true, writable: true});
  PatchedWS.prototype = _OrigWS.prototype;
  ['CONNECTING','OPEN','CLOSING','CLOSED'].forEach(k => PatchedWS[k] = _OrigWS[k]);
  window.WebSocket = PatchedWS;
  
  // Relay channel
  function relayFrame(dir, url, data) {
    // Convert ArrayBuffer/Blob to base64 for postMessage
    // Strip JWT from URL before relay
    const safeUrl = url.split('?')[0]; // remove query string entirely
    window.postMessage({__hjk__:1, kind:'frame', dir, url:safeUrl, data}, '*');
  }
  function relaySocketOpen(url) {
    window.postMessage({__hjk__:1, kind:'socket_open', url:url.split('?')[0]}, '*');
  }
})();
```

**Integrity checks the proxy must survive:**

```js
WebSocket.prototype.send.toString().includes('[native code]')              // ✓ via fakeToString
Function.prototype.toString.call(WebSocket.prototype.send)                  // ✓ same
Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send').writable       // ✓ same shape preserved
Object.getOwnPropertyNames(WebSocket.prototype).length                       // ✓ no added props
window.WebSocket.name === 'WebSocket'                                        // ✓ via Object.defineProperty
window.WebSocket.toString().includes('[native code]')                        // ✓ static toString override
window.WebSocket.prototype.constructor === window.WebSocket                  // ✗ — this leaks. mitigation: also patch .constructor of the prototype to point at PatchedWS so it matches.
new (window.WebSocket)(...) instanceof window.WebSocket                      // ✓ — same proto chain
```

**Open hardening question:** `prototype.constructor` check — when the page does `WebSocket.prototype.constructor === window.WebSocket`, our patched constructor wraps the original. We can make this pass by also patching `prototype.constructor` to point at `PatchedWS`, but that changes a property of the prototype object. Should be done early. Tradeoff: more surface, but matches reality (any `instance.constructor` reference would otherwise return `_OrigWS` which is now unreachable from `window`).

---

### 4.2 Frame parser & hand state machine (`src/background/parser.js`, `hand_state.js`)

**Input:** stream of `{dir, url, data}` frames from the proxy.

**Filtering:** only `wss://game-ws.hijackpoker.com` channel (urlIdx 0 in recon). Engine channel ignored for hand reconstruction (lobby metadata only). Within that, only frames with `data` parseable as JSON and `event === "gotOmaha"`.

**Dedupe key per snapshot:** `(game.gameID, game.gameNo, game.lastmove, game.lastaction, game.lastplayer, game.card1..5, p{N}card1..4 for all N)`. If unchanged from prior snapshot, drop.

**Per-table state machine** (keyed on `gameID`):

```
States:
  IDLE              - no hand active
  PREFLOP           - cards dealt, betting round 1
  FLOP              - 3 board cards dealt
  TURN              - 4 board cards dealt
  RIVER             - 5 board cards dealt
  SHOWDOWN          - hand complete, winners declared
  COMPLETE          - hand emitted to writer, ready for next
```

**Transitions** driven by board-card count changes:
- IDLE → PREFLOP: `gameNo` increments AND hero `p{seat}cardN` slots fill (or villain cards dealt detected via state)
- PREFLOP → FLOP: `card1..3` change from "facedown" to real values
- FLOP → TURN: `card4` changes from "facedown"
- TURN → RIVER: `card5` changes from "facedown"
- ANY → SHOWDOWN: `winner` field populates AND `win1` populates
- SHOWDOWN → COMPLETE: writer acknowledges hand emitted; reset

**Action events emitted** per state-diff:
- `BlindPost(seat, type:'sb'|'bb'|'ante'|'straddle', amount)` when `languageKey` matches blind events
- `Deal(seat, cards: [c1,c2,c3,c4])` when hero's slots fill (always emitted; villain "Deal" events are implicit, not logged)
- `Action(seat, type:'fold'|'check'|'call'|'bet'|'raise', amount)` when `lastaction`/`lastplayer` advances and `languageKey` indicates action
- `BoardDeal(street:'flop'|'turn'|'river', cards: [...])` when board card slots fill
- `Showdown(seats: [seatIDs], reveals: {seat → cards[]})` when `winner` populates
- `Pot(main, sidePots[])` derived from `pots[]` array each tick

**Hand record (emitted on COMPLETE):**

```js
{
  table: { gameID: 102, stake: '$0.02/$0.05 PLO', name: 'Table 102', currency: 'USD', maxSeats: 10 },
  handNo: 168103,
  startedAt: 1778490183,  // first lastmove of this hand
  endedAt:   1778490295,
  button: 6,
  blinds: { sb: {seat: 1, amount: 0.02}, bb: {seat: 2, amount: 0.05} },
  seats: [
    { id: 2, name: 'call2bluff', stack: 5.00, isHero: true },
    { id: 6, name: '...', stack: 23.76 },
    // ...
  ],
  hero: { seat: 2, cards: ['Kc','Jc','4s','2h'] },
  preflop: [ {seat:5, action:'fold'}, {seat:6, action:'call', amount:0.05}, {seat:1, action:'raise', amount:0.20}, ... ],
  flop: { board: ['Ks','4s','Kh'], actions: [...] },
  turn: { card: '...', actions: [...] },
  river: { card: '...', actions: [...] },
  showdown: {
    revealed: { 6: ['8s','7s','6c','5d'], 4: ['Ah','Ac','Ks','Qd'] }, // when known
    bestHands: { 6: '8s7s6c5d4h', 4: 'AcAhKsQd8s' },
    winners: [{ seats:[6], amount: 0.45, label: 'Main Pot' }],
  },
  rake: 0,  // observed: rake=0 on these stakes; emit "Rake $0" line
  ended: 'showdown' | 'fold-around',
  rawFrames: [...] // optional sidecar — populated only if always-on raw enabled
}
```

---

### 4.3 PokerStars HH writer (`src/background/ps_writer.js`)

Input: a hand record. Output: a PokerStars-format text block ready to append to the table's session file.

**Format target** (PokerStars PLO cash):

```
PokerStars Hand #168103: Omaha Pot Limit ($0.02/$0.05 USD) - 2026/05/11 02:43:03 ET
Table 'Hijack 102' 10-max Seat #6 is the button
Seat 1: Player_1 ($2.25 in chips)
Seat 2: call2bluff ($5.00 in chips)
Seat 4: Player_4 ($38.15 in chips)
Seat 5: Player_5 ($5.24 in chips)
Seat 6: Player_6 ($23.76 in chips)
Player_1: posts small blind $0.02
call2bluff: posts big blind $0.05
*** HOLE CARDS ***
Dealt to call2bluff [Kc Jc 4s 2h]
Player_5: folds
Player_6: calls $0.05
Player_1: raises $0.15 to $0.20
call2bluff: calls $0.15
[... rest of streets ...]
*** SUMMARY ***
Total pot $0.45 | Rake $0
Board [Ks 4s Kh ...]
Seat 6: Player_6 (button) showed [8s 7s 6c 5d] and won ($0.45) with a straight, Four to Eight
Seat 2: call2bluff (big blind) folded on the Turn
```

**Card normalization:** Hijack uses `"KC"` (uppercase suit), PokerStars expects `"Kc"` (lowercase suit). `lib/card_codec.js` handles the mapping. `T` for Ten in both.

**Player name fallback:** Hijack `p{N}name` is the GUID. Hero's displayname comes from the JWT (`displayname` claim, decoded once at session start). Villains' displaynames must be sourced from the `chatMessages[].displayName` array or from the `c{N}` chat-slot fields — both carry `{GUID, displayName}` mappings. If no displayname found, fall back to `Player_{seat}`.

**Timestamp format:** PokerStars uses `2026/05/11 02:43:03 ET` (Eastern Time always, even outside US Eastern). Convert from `lastmove` epoch to ET.

**HM3 quirks to handle:**
- Player_$N pseudonymous fallback is fine; HM3 stat-tracks by name string
- Must include `*** HOLE CARDS ***` marker even on fold-around hands
- Each street has its own `***` separator (`*** FLOP ***`, `*** TURN ***`, `*** RIVER ***`, `*** SHOW DOWN ***`)
- `Total pot $X | Rake $Y` is mandatory in summary
- `Board [...]` only present if hand reached at least the flop
- If hero folds before showdown and never showed, summary line: `Seat N: hero_name (position) folded on the Street`

---

### 4.4 File writer (`src/background/fs_writer.js`)

**Setup (one-time per Chrome install):**
- On first run, popup prompts user to pick output directory via `window.showDirectoryPicker({mode:'readwrite', startIn:'downloads'})`.
- Persist the `FileSystemDirectoryHandle` in `IndexedDB` (object store `'config'`, key `'outputDirHandle'`).
- On every browser session start, on first activation, call `handle.queryPermission({mode:'readwrite'})`. If `'prompt'`, call `requestPermission`. If `'denied'`, surface a popup alert.

**Per-table per-session filename:**

```
HH<YYYYMMDD>-<HHMMSS> T<gameID>-<sessionSeq>.txt
e.g. HH20260511-024303 T102-1.txt
```

Where `sessionSeq` increments if the table was opened, closed, and reopened within the same calendar day.

**Write pattern (live append):**

```js
async function appendHand(handText) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  const file = await fileHandle.getFile();
  await writable.seek(file.size);
  await writable.write(handText + '\n\n');  // PokerStars HH separator
  await writable.close();
}
```

**Session close detection:** tab close event in content script → notifies service worker → service worker flushes any pending writes and marks session closed. Reopening the table = new session = new file with `sessionSeq + 1`.

**Native messaging escape hatch:** if Gate 5 (FSA durability test) reveals long-session failures, swap `fs_writer.js` for `native_writer.js` that does `chrome.runtime.connectNative('com.hijack_logger.native')` and offloads writes to a small helper binary. Same interface, different transport. Decision deferred until Gate 5 result.

---

### 4.5 Always-on raw sidecar (`src/background/raw_sidecar.js`)

Per council R2 (2-of-3 majority, orchestrator-call): always-on raw capture by default, user can disable in settings.

**Output:** parallel to `HH...-T102-1.txt`, write `HH...-T102-1.raw.jsonl` to the same directory.

**Format:** newline-delimited JSON, one frame per line:

```json
{"t":1778490183,"dir":"in","ch":"game","ev":"gotOmaha","hash":"sha256:abc...","payload": <full JSON>}
{"t":1778490184,"dir":"out","ch":"game","action":"ping","payload":{"action":"ping"}}
```

**PII redaction in raw log:** strip `chatMessages[].message` fields (player chat) and all `c1..c20` slot contents — keep `GUID` and `displayName` because they're needed to map villain names later, but no chat text. Strip JWT from any URL fields (already done at proxy relay level).

**Storage cost:** ~5-20MB per session per table, per spectator-mode observation. Negligible.

**Recovery use:** if Hijack ships a schema-breaking client update, the raw log lets the user re-parse hands locally via popup "Re-parse raw logs" action without losing data.

**Global disable:** settings checkbox `"Always-on raw frame capture"`. When unchecked, raw sidecar is not written at all. NOT "fallback-only" — the council R2 reasoning was that fallback-only means you don't have raw data exactly when you need it most (parser silently breaks before heuristics catch).

---

### 4.6 Schema fingerprint + heuristic drift detection (`src/background/schema_fingerprint.js`)

**At session start:** on the first `gotOmaha` frame of a session, compute a stable fingerprint:

```js
function fingerprint(game) {
  const keys = Object.keys(game).sort();
  return sha256(keys.join('|')).slice(0, 12);
}
```

**Stored value (in IDB):** known-good fingerprint from the last successful session for this game type.

**Drift detection:**
- If session-start fingerprint differs from stored, log `[schema-shift]` warning in popup, flag this session, switch parser to "tolerant mode" (try best-effort, skip unknown fields, lean harder on `languageKey` + `debugMSG` for action info).
- If parser reports more than 20% hand-completion failures over a 30-minute window, escalate popup warning to red badge, suggest re-pulling raw logs.

**Per-hand heuristics:**
- Action count sanity (a hand can't have 50 raises preflop)
- Pot conservation (sum of player bets ≈ total pot, modulo rake)
- Board card count matches state (flop has 3, turn has 4, river has 5)
- Showdown reveals at least one player's cards
- `gameNo` increments monotonically within a session

Fail any heuristic → flag hand `[parser-degraded]` in popup log, increment per-table degraded counter. Don't drop the hand from the .txt; just mark it.

---

### 4.7 Popup UI (`src/popup/popup.html`, `popup.js`)

Minimal MV3 popup. Displays:

```
┌─────────────────────────────────────┐
│ Hijack Logger                       │
│                                     │
│ Output dir: ~/Downloads/HH ▾ Change │
│                                     │
│ Active tables (2):                  │
│   Table 102  PLO $0.02/0.05         │
│     Hands: 47   Degraded: 0         │
│     File: HH20260511-024303 T102-1.txt│
│   Table 156  PLO $0.05/0.10         │
│     Hands: 12   Degraded: 1         │
│     File: HH20260511-052100 T156-1.txt│
│                                     │
│ Session totals: 59 hands, 1 issue   │
│                                     │
│ ☐ Always-on raw frame capture       │
│ ☐ Schema fingerprint warnings       │
│                                     │
│ [Open output folder] [Settings]     │
└─────────────────────────────────────┘
```

No real-time stat display, no opponent stats, no hand replay UI. Just the capture status. Per usage-scope ratification 2026-05-11.

---

### 4.8 Manifest (`manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Hijack Poker HH Logger",
  "version": "0.1.0",
  "description": "Personal hand history logger for review in Hold'em Manager",
  "permissions": [
    "scripting",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://game.hijack.poker/*"
  ],
  "background": {
    "service_worker": "src/background/service_worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/popup.html"
  },
  "content_scripts": [{
    "matches": ["https://game.hijack.poker/*"],
    "js": ["src/content/relay.js"],
    "run_at": "document_start",
    "world": "ISOLATED"
  }]
}
```

**Programmatic MAIN-world injection** at `document_start` (the proxy must beat Unity bootstrap):

```js
// In service_worker.js, on tab nav to hijack
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!details.url.startsWith('https://game.hijack.poker/')) return;
  await chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    world: 'MAIN',
    injectImmediately: true,
    files: ['src/background/ws_proxy.js']
  });
});
```

The content script (`src/content/relay.js`) in ISOLATED world bridges `window.postMessage` from the proxy to `chrome.runtime.sendMessage` to the service worker.

---

## 5. Phase plan

### Phase 0 — Recon (COMPLETE as of 2026-05-11)

- Gates 1-4 PASS
- Gates 5-7 remaining (not architecture-blocking; can run during/after Phase 1)

### Phase 1 — Build (next session)

Sequence:
1. **Scaffold project** — manifest, file structure, content-script + service-worker stubs
2. **Implement WS proxy** (stealth-hardened per spec 4.1) — test in isolation with a mock WebSocket
3. **Implement relay channel** (page → content → service worker) — verify frames flow end-to-end
4. **Implement parser + state machine** — test against captured fixture frames from recon
5. **Implement PokerStars writer** — test against hand 168103 fixture, verify output matches expected format
6. **Implement FSA writer** — depends on Gate 5 result
7. **Implement popup UI** — basic counters
8. **End-to-end test** — sideload extension, play 1 hand at Hijack, verify .txt is correct, import into HM3
9. **Iterate** — fix HM3 import errors, edge cases (all-ins, multi-way pots, sit-outs, reconnects)
10. **Stealth-harden** — run integrity-check probes against our proxy from a test console, fix any leaks
11. **Document sideload install** for buddies

### Phase 2 — Distribution (after Phase 1 stable)

- Package as `.crx` or zipped unpacked extension
- Write README with one-page install instructions (Mac + Windows)
- Distribute to buddies via private GitHub release or direct download
- No Chrome Web Store

---

## 6. Build artifacts

| File | Purpose | Est. LOC |
|------|---------|----------|
| `manifest.json` | MV3 manifest | 30 |
| `src/background/service_worker.js` | Entry, routing, lifecycle | 200 |
| `src/background/ws_proxy.js` | Hardened WS proxy | 300 |
| `src/content/relay.js` | Page→service-worker bridge | 50 |
| `src/background/parser.js` | gotOmaha → events | 400 |
| `src/background/hand_state.js` | Per-table state machine | 300 |
| `src/background/ps_writer.js` | Hand record → PS HH text | 350 |
| `src/background/fs_writer.js` | FSA write path | 150 |
| `src/background/raw_sidecar.js` | Raw frame log | 80 |
| `src/background/schema_fingerprint.js` | Drift detection | 100 |
| `src/popup/popup.html` + `.js` + `.css` | Popup UI | 250 |
| `src/lib/gzip.js` | Engine-channel decompression | 30 |
| `src/lib/card_codec.js` | Card format conversion | 40 |
| `tests/parser.test.js` | Parser unit tests | 200 |
| `tests/fixtures/*.json` | Captured frames | n/a |
| `README.md` | Install + usage | 100 |
| **Total** | | **~2580 LOC** |

Reasonable Phase 1 effort: **2-3 focused weeks** for first working sideload build.

---

## 7. Test plan

**Unit tests (offline, against captured fixtures):**
- Parser correctly identifies action sequence from a known-good fixture
- PokerStars writer produces byte-exact match to a reference HH for the same hand
- Card codec converts every PLO card correctly
- State machine handles each hand termination (showdown, fold-around, all-in)
- Schema fingerprint stable across two captures of the same hand

**Integration tests (with extension loaded, against a captured mock WS stream):**
- 100 sequential hand fixtures feed through, all 100 produce valid HH output
- Multi-table interleaving (table A hand 1, table B hand 1, table A hand 2) — state correctly isolated
- FSA write survives 500 sequential appends (Gate 5 covers this)

**End-to-end tests (against live Hijack, hero account):**
- Single hand: sit, play, verify .txt
- 10 hands: same session, verify all 10 captured, all importable to HM3
- Disconnect/reconnect mid-hand: verify incomplete hand marked degraded, next hand resumes cleanly
- Tab close mid-hand: verify partial hand handled gracefully (drop or partial save)

**Stealth tests (manual, against own proxy in dev console):**

```js
// Run these in the page console with the production proxy installed
// All must return values indistinguishable from a vanilla browser
WebSocket.prototype.send.toString()
WebSocket.prototype.send.toString.toString()
Function.prototype.toString.call(WebSocket.prototype.send)
Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send')
Object.getOwnPropertyNames(WebSocket.prototype)
window.WebSocket.toString()
window.WebSocket.name
window.WebSocket.prototype.constructor
new WebSocket('wss://example.com').constructor.name
```

**HM3 import tests:**
- Import 10 hands, verify all appear correctly in the database
- Verify replayer renders each hand correctly
- Verify stats (VPIP, PFR, AF, etc.) compute on these hands
- Verify multi-way pots and side pots distribute correctly

---

## 8. Open risks & mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Hijack ships Unity update with WebSocket integrity checks | Low | High | Stealth-hardened proxy + raw sidecar for recovery |
| FSA durability fails (Gate 5 not yet run) | Low | Medium | Native-messaging escape hatch already specified |
| Villain hole cards don't appear at showdown in `p{V}cardN` slots | Low | Medium | Fall back to deriving from `win{N}` 5-card eval strings (partial info but importable) |
| Multi-table state isolation has race conditions | Medium | Medium | Per-table service-worker singletons, message queueing |
| Disconnects mid-hand corrupt state | Medium | Low | Hand marked `[parser-degraded]`, raw log preserves frames for re-parse |
| Hijack ToS enforcement increases | Low | High | Personal risk accepted; review-only usage minimizes detection |
| HM3 rejects our HH format on specific edge cases (multi-way all-ins, etc.) | Medium | Low | Iterative fix during Phase 1 e2e tests |
| Chrome MV3 changes break MAIN-world injection | Low | High | Tied to platform stability — monitor Chrome release notes |

---

## 9. Definition of done (Phase 1 build)

- Extension loads via Developer Mode > Load Unpacked in both Mac Chrome + Windows Chrome
- Playing 50 hands across 2-4 tables produces 2-4 `.txt` files + `.raw.jsonl` files in the output directory
- All 50 hands import cleanly into HM3 with no errors and visually-correct replayer rendering
- Popup shows accurate per-table counters and overall session count
- No DevTools-visible warnings on the Hijack tab while extension is active
- Stealth tests in section 7 all return native-equivalent values
- Sideload README is followable by a non-technical buddy with one phone call of help

---

## 10. Next session checklist

When you sit down to start Phase 1:

1. Run Gate 5 FSA durability test on Mac (`hijack_logger_v0_1/FSA_DURABILITY_TEST.html`) — 5 min
2. Run Gate 5 on Windows next time you're there — 5 min
3. If both pass: proceed with FSA writer per spec 4.4. If either fails: swap to native messaging escape hatch.
4. Start with `manifest.json` + `service_worker.js` + `ws_proxy.js` skeleton in sequence 1-3 from the Phase 1 plan
5. Use the hand 168103 capture from tonight as your first parser fixture (saved in `recon_captures/` if you dumped, or reconstructable from substrate log)
