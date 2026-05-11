# Phase 0 Recon — Hijack Poker Hand History Logger

**Project:** Hijack Poker Hand History Logger (PLO Cash v1)
**Draft ID:** `58b57cb3-079b-4559-9cb8-85ceaad52b44`
**Cycle ID:** `37245c60-914e-443b-bede-66a36fe09099`
**Council R2 ratification:** unanimous (all three voters), substrate-trail complete

---

## What this is

The council converged on an architecture last night. Before we write a single line of build code, **Phase 0 is the gate that confirms the architecture is even buildable against this specific Hijack client.** Recon is run on your own account with DevTools open — stealth requirements DO NOT apply during recon (stealth applies to the shipped extension, not to dev-tools-open validation).

There are **seven gates**. Each has a kill criterion. If any of them fails, we don't write build code — we re-architect or abandon.

You don't have to do all seven in one sitting. Reasonable cadence:
- Gates 1–4 in one session at one PLO cash table (~30 min)
- Gate 5 off-line, no Hijack needed (~5 min)
- Gates 6–7 in a separate session once gates 1–4 pass (~90 min)

After each gate, run the embedded `sixis.py` command to log the finding. Substrate is back online — Phase B step 4 landed last night, all commands write directly to Supabase.

---

## Setup (one-time, ~2 minutes)

Open Chrome to `https://game.hijack.poker` and **sit down at a PLO cash table** (any stake — micros are fine, this is just recon, not real money).

Before sitting, open DevTools: `Cmd+Option+I` on Mac (or right-click → Inspect). Pin the **Network** tab and filter for `WS`. You should see two WebSocket connections start when you join the table:
- `wss://game-ws.hijackpoker.com/?token=...`
- `wss://engine.hijack.poker/socket.io/?EIO=4&transport=websocket`

If you don't see those, refresh the page and re-check.

Also open the **Console** tab — you'll paste a few small snippets here in the gates below.

---

## Gate 1: WebSocket integrity check (~30 seconds)

**Why:** If Hijack's Unity client has wrapped or frozen `window.WebSocket` before our proxy could land, the entire stealth-hardened proxy architecture is dead-on-arrival. We need to confirm `WebSocket` is the vanilla browser native at game load time. If it's not, we re-architect (probably to action-based reconstruction without hole cards, or abandon).

**Do this:** with the Hijack table loaded and DevTools Console open, paste:

```javascript
({
  isOwnProperty:    Object.prototype.hasOwnProperty.call(window, 'WebSocket'),
  toStringNative:   /^function WebSocket\(\)\s*\{\s*\[native code\]\s*\}$/.test(WebSocket.toString()),
  protoSendNative:  /\[native code\]/.test(WebSocket.prototype.send.toString()),
  protoSendDescriptor: Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send'),
  windowWSEq:       window.WebSocket === WebSocket,
  symbolToStringTag: WebSocket[Symbol.toStringTag],
})
```

**Expected (PASS):**
- `toStringNative: true`
- `protoSendNative: true`
- `windowWSEq: true`
- `protoSendDescriptor.writable: true, configurable: true`
- `symbolToStringTag: undefined` (or absent — that means no custom tag)

**Failure modes (KILL):**
- `toStringNative: false` → constructor has been wrapped. Re-architect or abandon.
- `protoSendNative: false` → `send()` is patched. Same.
- `protoSendDescriptor.writable: false` or `configurable: false` → can't patch. Same.
- `symbolToStringTag` is a string like `'HijackWS'` → custom branded WebSocket. Same.

**Log it:**

```bash
cd ~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1 && python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 1: Is window.WebSocket the vanilla browser native at game load time?" \
  --answer "PASTE THE FULL OBJECT YOU GOT BACK FROM THE CONSOLE HERE"
```

---

## Gate 2: First-hand semantic completeness — 5-10 hand kill gate (~15 minutes)

**Why:** Per GPT R2 — don't burn 50 hands if the first 5 already show the WS payload is semantically incomplete. We need to confirm hero hole cards, board cards, betting actions, blinds, pot, rake, and showdown all appear in observable form before going deep.

**Do this:** in DevTools Network tab, click the `game-ws.hijackpoker.com` row to open the WebSocket frame viewer. The "Messages" sub-tab shows every frame in/out in real time. **Leave this open** and play 5-10 hands at the table.

After each hand, scan the message log for:
1. **Deal frame** — should contain your hole cards (two card values out of `[Ah, Kh, Qh, Jh, Th, 9h, ..., 2c]` or similar). Look at the timestamp matching when cards animated on screen.
2. **Action frames** — every time someone bets, calls, folds, raises, there should be a frame describing the action with player + amount.
3. **Street frames** — when the flop/turn/river deals, a frame with the new community card(s).
4. **Showdown / hand-end frame** — at hand end, a frame with the winning hand info, pot size, rake.
5. **Blind posting** — at hand start, frames showing small/big blind posts.

For each hand, jot down (mental note or scratch pad): did you see all five categories? Were the card values readable? Were action amounts present?

**Expected (PASS):** within the first 5 hands you see all 5 categories with readable values. Hero hole cards visible in the WS stream (almost certainly in a frame addressed to your `playerGUID` or `username` from `SubscribeToGameUpdates`).

**Failure modes (KILL):**
- Hero hole cards never appear in any frame readable by your client (showdown-only or encrypted). Re-architect to action-only reconstruction (loses fold-before-showdown hands, big stats hit) or abandon.
- Actions appear but amounts are encoded/encrypted. Re-architect.
- Frames are entirely binary with no human-readable JSON. Move to Gate 4 immediately to characterize.

**Log it:**

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 2: 5-10 hand semantic completeness check — are hero cards, actions, streets, blinds, showdown all present and readable in the WS stream?" \
  --answer "HANDS OBSERVED: N. HERO CARDS VISIBLE: yes/no. ACTIONS VISIBLE: yes/no. STREETS VISIBLE: yes/no. BLINDS VISIBLE: yes/no. SHOWDOWN VISIBLE: yes/no. NOTES: <anything weird>"
```

---

## Gate 3: Frame taxonomy dump (~10 minutes during play)

**Why:** Per Claude.ai R2 — we need the actual JSON shape of every message type. This is the input the parser is built against. If we skip it, we discover gaps mid-build.

**Do this:** while still at the table, capture **one example of each frame type** you saw in Gate 2. Right-click any frame in the Messages tab → "Copy message" (or just select the text and copy). Paste each into a scratchpad.

Target frame types to capture:
- `SubscribeToGameUpdates` (client → server, you saw this in setup)
- Deal frame (server → client, with your hole cards)
- Hero action frame (you bet/call/fold/raise)
- Villain action frame (someone else does the same)
- Flop frame
- Turn frame
- River frame
- Showdown/hand-end frame
- Blind post frame
- Hand-start / new-hand marker (if there's a distinct one)

For frames containing your hole cards, **redact the card values before logging** (replace with `XX` or `_holeCards_` placeholder) — substrate is owned by you but no reason to write actual hand data into it.

**Expected (PASS):** all 10 frame types captured, distinct shapes, readable field names.

**Failure modes (FLAG):**
- Some frame types missing or appear as binary blobs only. Flag for Gate 4.
- Field names are mangled / one-letter (`a`, `b`, `c`). Workable but raises parser complexity — flag.
- Same frame type appears in two distinct shapes (versioned messages, A/B test, etc). Flag — schema fingerprint becomes more complex.

**Log it:**

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 3: Frame taxonomy dump — JSON shape for each message type" \
  --answer "FRAME TYPES CAPTURED: <list>. FIELD-NAME QUALITY: readable/mangled/mixed. ANOMALIES: <anything weird>"
```

**Also dump the raw captures to a file** (this is for the parser later — don't just keep in your head):

```bash
mkdir -p ~/Documents/Claude/Projects/SixiS/projects/hijack_logger_v0_1/recon_captures
# then save each frame as e.g. frame_deal.json, frame_action.json, etc.
```

---

## Gate 4: Binary frame encryption probe (~5 minutes)

**Why:** Per DeepSeek R2 — if Hijack encrypts WS payloads, the project is dead. We need to confirm binary frames (if any) are at least nominally parseable, not high-entropy ciphertext.

**Do this:** find a binary frame in the Messages tab — it'll show as `Binary message: N bytes` or similar. Right-click → "Copy message" gives you the bytes (or a hex/base64 view depending on Chrome version). Paste this into DevTools Console:

```javascript
// Replace BYTES below with the actual bytes you copied (as a Uint8Array or hex string)
const bytes = new Uint8Array([/* paste here as comma-separated decimal, or use atob if base64 */]);
const counts = new Map();
for (const b of bytes) counts.set(b, (counts.get(b) || 0) + 1);
const total = bytes.length;
let entropy = 0;
for (const c of counts.values()) { const p = c / total; entropy -= p * Math.log2(p); }
const protobufSig = bytes[0] === 0x0a || bytes[0] === 0x12 || bytes[0] === 0x1a || bytes[0] === 0x22 || bytes[0] === 0x2a;  // common protobuf field-1-3 signatures
({ length: total, uniqueBytes: counts.size, entropy: entropy.toFixed(2), protobufSig, firstBytes: Array.from(bytes.slice(0, 8)) })
```

**Expected (PASS):** entropy < 7.5 bits/byte (real ciphertext is ~7.95), and/or `protobufSig: true`, and/or `firstBytes` shows recognizable framing (e.g. socket.io leading `4` or `42` for engine.io text-as-binary).

**Failure modes (KILL):**
- entropy > 7.9 AND no protobuf signature → encrypted payload. Project dies here.
- Entropy is low but the first bytes are bizarre and don't match any known protocol → unknown encoding, deep work needed.

**Log it:**

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 4: Encryption probe on binary WS frames — entropy + protobuf signature check" \
  --answer "BINARY FRAMES PRESENT: yes/no. ENTROPY (bits/byte): N.NN. PROTOBUF SIG: true/false. FIRST BYTES: [b0,b1,b2,...]. VERDICT: parseable / encrypted / unknown"
```

---

## Gate 5: FSA durability micro-test (~5 minutes, off-line, no Hijack)

**Why:** Per Claude.ai R2 — we picked File System Access API for live append. Need empirical proof that the directory handle survives Chrome restart with re-grant, and that 500 sequential small appends don't break. This decides Q2 empirically rather than by argument.

**Do this:** save the file `FSA_DURABILITY_TEST.html` (in the same directory as this recon doc) to your Desktop and open it in Chrome. Follow the on-page instructions. It writes 500 small appends, prompts you to close+reopen Chrome, then re-grants the handle and verifies all 500 appends are present.

Run on **both** Mac and Windows if you have access to both. The Mac side specifically has historical re-prompt nags.

**Expected (PASS):** 500 appends succeed, handle survives restart, re-grant is one click, all 500 lines present after restart.

**Failure modes (FLIPS Q2 to native messaging):**
- Handle does not survive restart (have to re-pick directory).
- Re-grant requires multiple clicks or full directory re-pick.
- Any of the 500 appends fail mid-loop.
- Mac specifically nags worse than Windows in a way that's intrusive during multi-tabling.

**Log it:**

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 5: FSA durability micro-test — 500 appends + Chrome restart on Mac/Windows" \
  --answer "MAC RESULT: pass/fail. WINDOWS RESULT: pass/fail. APPENDS COMPLETED: N/500. RESTART RE-GRANT FRICTION: low/medium/high. NOTES: <anything>"
```

---

## Gate 6: 50-hand semantic confirmation (~60-90 minutes)

**Why:** Gate 2 was the first-kill check. Gate 6 is the confidence check — 50 hands across a real session confirm the WS payload is consistent over time, no weird edge-case frames we missed, action sequences make sense across all street combinations (folds, all-ins, multi-way pots, side pots).

**Do this:** play a real PLO cash session of ~50 hands. Keep DevTools open and Messages tab pinned to `game-ws.hijackpoker.com`. While playing, periodically scan for anything weird (a frame type you didn't see in Gate 3, an action that doesn't fit your mental model, a side-pot situation, an all-in, a multi-way river).

You don't need to manually log every hand — just keep an eye out for outliers. At session end, count:
- Total hands observed
- Hands where your parser-model (mental simulation) could reconstruct the full hand
- Hands where something was off (and note what)

**Expected (PASS):** ≥45/50 hands reconstructable. The outlier 5 are edge cases (disconnect mid-hand, sit-out, etc.) — fine for v1.

**Failure modes (KILL):**
- < 40/50 reconstructable → semantic gap is bigger than we thought.
- Frame types appear that weren't in your Gate 3 taxonomy → the taxonomy is incomplete and the parser will have gaps. Re-run Gate 3 with the new types.

**Log it:**

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 6: 50-hand semantic confirmation run" \
  --answer "TOTAL HANDS: N. RECONSTRUCTABLE: M. OUTLIERS: <list of edge cases>. NEW FRAME TYPES SEEN: <if any>. VERDICT: pass/fail/partial"
```

---

## Gate 7: HM3 import dry run (~15 minutes after gate 6)

**Why:** The whole point of this project is HM3 import. If our parser-model can theoretically produce a PokerStars HH from the WS data BUT we don't actually test the import, we'll discover format mismatches mid-build. Per GPT R2 — produce 10 hand histories by hand from the captured frames and verify HM3 imports them cleanly.

**Do this:** pick 10 hands from your Gate 6 captures (mix of go-to-showdown, fold-before-showdown, all-in, multi-way). For each, hand-write a PokerStars-format hand history `.txt` based on the WS frames. Reference: PokerStars HH format spec is well-documented online (sample structure: `PokerStars Hand #...:  PLO No Limit ($0.02/$0.05 USD) - 2026/05/11 12:34:56 ET / Table 'TableName' 6-max Seat #N is the button / Seat 1: Hero ($X in chips) / ...`).

Save the 10 `.txt` files to a Windows machine (or Parallels), point HM3 at them, click import.

**Expected (PASS):** HM3 imports all 10 without error, hands appear in the database, stats update correctly, the replayer renders the hand.

**Failure modes (FLAG, not necessarily kill):**
- HM3 imports but with errors → format is close but needs tightening. Document the errors, the parser writer will use them.
- HM3 rejects some hands → format mismatch on specific hand types (all-ins? multi-way?). Document and adjust the format spec.
- HM3 imports but stats look wrong → semantic mismatch (we're labeling positions wrong, blind levels wrong, etc.). Document.

**Log it:**

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 Gate 7: HM3 import dry run with 10 hand-written hand histories" \
  --answer "HANDS WRITTEN: 10. HM3 IMPORTED CLEANLY: N. ERRORS: <list>. STATS LOOK RIGHT: yes/no. FORMAT MISMATCHES TO FIX: <list>"
```

---

## Pass/fail summary

| Gate | Kill criterion | What happens on fail |
|------|---------------|---------------------|
| 1 — WS integrity | `WebSocket` is not vanilla native at runtime | Re-architect or abandon |
| 2 — Semantic completeness (5-10 hands) | Hero cards / actions / streets / blinds / showdown not all visible+readable | Re-architect to action-only or abandon |
| 3 — Frame taxonomy | Some frame types missing or mangled beyond practical parsing | Flag, may complicate but not kill |
| 4 — Encryption probe | Binary frames are high-entropy ciphertext | Project dies |
| 5 — FSA durability | 500 appends fail OR restart breaks handle OR Mac re-prompt is intrusive | Flip Q2 to native messaging as v1 |
| 6 — 50-hand confirmation | < 40/50 reconstructable | Re-architect |
| 7 — HM3 import dry run | < 7/10 imports cleanly with sensible stats | Iterate format, not kill |

**All gates pass:** Layer B drafts against the unanimous R2 architecture. Build starts.

**Gates 1, 2, 4, or 6 fail (any one):** project goes back to architecture cross-poll. The R2 ratification is conditional on these.

**Gates 3, 5, 7 fail (any of them):** project continues but with adjusted scope (more parser complexity, different file API, format iteration).

---

## After recon — declare gate outcome

Once all 7 gates are run, mark Phase 0 complete:

```bash
python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Phase 0 OVERALL: did the full gate sequence pass?" \
  --answer "RESULT: PASS / PARTIAL / FAIL. SUMMARY: <one paragraph>. NEXT STEP: Layer B drafting / re-architecture cross-poll / abandon"
```

If PASS: ping me and we'll start Layer B drafting (the v1 build plan).
If PARTIAL or FAIL: ping me with the specifics and we'll fire a focused cross-poll on the failing gate to figure out the pivot.

---

## Substrate reminders

- All discovery answers go to Supabase via `sixis.py log-discovery-answer` (substrate is back online as of last night — Phase B step 4 landed).
- Frame captures go to `~/Documents/Claude/Projects/SixiS/projects/hijack_logger_v0_1/recon_captures/` (local file system, NOT substrate — they may contain real hand data).
- If anything crashes or you hit a wall, `python3 scripts/sixis.py report-breakdown --draft-id 58b57cb3-... --cycle-id 37245c60-... --source claude --description "<what went wrong>"` — that works now too.
