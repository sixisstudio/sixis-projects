# Sideload Test Playbook

**When:** Tomorrow morning (or whenever you sit down next).
**Goal:** Verify the proxy + relay + popup work end-to-end before we write the parser. ~10 minutes.
**What you need:** Chrome (Mac or Windows). Nothing else.

---

## Step 1 — Load the extension (~1 min)

1. Open Chrome.
2. Address bar → `chrome://extensions/`
3. Top-right toggle: **Developer mode** → ON.
4. Click **Load unpacked**.
5. Navigate to and select the folder `~/Documents/Claude/Projects/SixiS/projects/hijack_logger_v0_1/`.
6. The extension card appears with name **Hijack Poker HH Logger v0.1.0**. A blue square icon appears in your Chrome toolbar.

**Pass:** card loads, no red errors below the card.
**Fail signs:** Chrome shows a red "errors" link under the card → click it, capture the error text, send it to me.

---

## Step 2 — Open Hijack with the extension active (~30 sec)

1. New tab → `https://game.hijack.poker/`
2. You should auto-log-in via your existing cookies.
3. Wait ~10 seconds for the Unity client to bootstrap.
4. Click the **Hijack Logger** icon in the toolbar to open the popup.

**Pass:** popup shows non-zero frame count after a few seconds. Even on the lobby/no-table screen, you'll see frames from the engine.hijack.poker heartbeat socket. If you land directly on a table, you'll see frames piling up fast (lots of `gotOmaha` pushes).
**Fail signs:** popup says "No active Hijack tabs" or frame count stays at 0 — the proxy didn't inject. Check the SW console (see Step 5 for how) for `[hjk] proxy injection failed` errors.

---

## Step 3 — Verify stealth probes from the page (~2 min)

This is the critical test. We need to confirm the production proxy is invisible to integrity checks.

1. On the Hijack tab, open DevTools (Cmd+Opt+I on Mac, F12 on Windows).
2. Switch to the **Console** tab.
3. Paste this whole block and press Enter:

```javascript
({
  // Each of these should look indistinguishable from a vanilla browser
  sendToString:        WebSocket.prototype.send.toString(),
  sendToStringNative:  /\[native code\]/.test(WebSocket.prototype.send.toString()),
  fnToStringSend:      Function.prototype.toString.call(WebSocket.prototype.send),
  sendDescriptor:      Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send'),
  addListenerToString: WebSocket.prototype.addEventListener.toString(),
  addListenerNative:   /\[native code\]/.test(WebSocket.prototype.addEventListener.toString()),
  windowWSName:        window.WebSocket.name,
  windowWSToString:    window.WebSocket.toString(),
  windowWSNative:      /\[native code\]/.test(window.WebSocket.toString()),
  protoConstructorEq:  WebSocket.prototype.constructor === window.WebSocket,
  ownProtoNames:       Object.getOwnPropertyNames(WebSocket.prototype),
  staticConstants:     {CONNECTING: WebSocket.CONNECTING, OPEN: WebSocket.OPEN, CLOSING: WebSocket.CLOSING, CLOSED: WebSocket.CLOSED}
})
```

**Pass criteria** (every line must be true):
- `sendToStringNative: true`
- `addListenerNative: true`
- `windowWSNative: true`
- `windowWSName: "WebSocket"`
- `windowWSToString: "function WebSocket() { [native code] }"`
- `protoConstructorEq: true`
- `sendDescriptor.writable: true, configurable: true, enumerable: false` (or whatever the original had — see step 4)
- `ownProtoNames` should be the standard set: `["constructor","binaryType","bufferedAmount","extensions","onclose","onerror","onmessage","onopen","protocol","readyState","url","close","send","CONNECTING","OPEN","CLOSING","CLOSED"]` — no extra additions

**Fail signs:** any of `*Native: false` means the proxy leaked a tell. Capture the full output and send it to me — we tune the proxy.

---

## Step 4 — Compare against a vanilla browser (~1 min)

To know what the native values SHOULD look like, open a fresh tab to any non-Hijack site (e.g. `https://example.com/`), open DevTools console there, paste the SAME block from Step 3. Compare. Every value should look identical (modulo non-Hijack URL stuff which we don't check).

**Pass:** the two outputs match byte-for-byte on the integrity fields.

---

## Step 5 — Service worker console (optional but useful)

1. Back at `chrome://extensions/`.
2. Find the Hijack Logger card.
3. Click **service worker** link under it (just below "Inspect views").
4. A new DevTools window opens, scoped to the service worker.
5. You should see: `[hjk] service worker booted v0.1.0` and zero errors.

If frames are flowing, you can also paste into this SW console:

```javascript
chrome.runtime.sendMessage({ kind: 'popup_state_request' }, (resp) => console.log(resp))
```

To see the live state including per-tab session info.

---

## Step 6 — Live capture sanity check (~2 min)

If steps 1-5 pass, sit at the same PLO cash table you used last night (or any table). Watch the popup frame counter — it should tick up fast (~10-50 frames/sec, lots of state pushes).

After a hand or two:
- Frame count: hundreds, maybe thousands
- Tab still has zero red errors in its DevTools console
- Hijack tab works normally (you can play, fold, sit, stand — proxy is read-only)

**Pass:** smooth, no impact on game UX, frames piling up.
**Fail signs:** Hijack tab becomes unresponsive (means our proxy broke something), or frames stop flowing mid-session (the relay channel got severed).

---

## Step 7 — Tear down (~30 sec)

When done testing:
- Close the Hijack tab.
- Optionally: at `chrome://extensions/`, toggle the Hijack Logger extension OFF (don't delete it — we'll re-enable next session to write the parser).

---

## What this DOESN'T do yet

To be clear about scope:
- **No .txt files are written.** Parser + writer aren't built yet (that's next session).
- **No HM3 import.** Same.
- **The popup directory picker** is wired up but doesn't actually do anything yet (writer isn't there to use the picked handle).
- **The frame counter is just total frames**, not "hands captured" — hand_state.js isn't built.

This sideload test is ONLY validating the capture+relay foundation. Everything downstream is mechanical text munging on top of a working capture, which is much lower-risk than the proxy itself.

---

## Outputs to send me

After running, send back:
1. Did all 7 steps pass cleanly?
2. The output of the Step 3 console block (copy-paste from DevTools).
3. The frame count from the popup after sitting at a table for ~2 minutes.
4. Any red errors anywhere (extension card, page console, SW console).

If everything's green: I write the parser + writer next session, and you have a working logger by end of that session.
