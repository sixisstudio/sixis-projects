# Setup Agent Playbook

**Read this file in full, then execute the steps below.** You are setting up the Hijack Poker HH Logger Chrome extension on the user's machine. The user has cloned/copied this project to the current working directory and has just opened Claude Code here.

This is a fully agentic install: you drive Chrome via MCP, the user only approves dialogs and picks an output folder at the end.

---

## Prerequisites you can assume (the user followed `OPERATOR_GUIDE.md`)

- Google Chrome is installed.
- Claude-in-Chrome browser extension is installed and signed in.
- On macOS: the `computer-use` MCP server is available to you (tools named `mcp__computer-use__*`).
- The current working directory IS the extension folder (contains `manifest.json`).

Confirm assumptions before doing anything destructive.

---

## Phase 1 — Sanity checks (no side effects)

Run these in parallel:

1. `pwd` and `ls manifest.json src/background/ws_proxy.js src/content/relay.js` — verify the extension folder structure is intact.
2. `which google-chrome 2>/dev/null; ls -d "/Applications/Google Chrome.app" 2>/dev/null` — confirm Chrome is installed.
3. List currently connected Chrome browsers via the Claude-in-Chrome MCP tool `list_connected_browsers`. If zero browsers connected, instruct the user to open Chrome and ensure the Claude-in-Chrome extension is signed in.

If any of these fail, **STOP and tell the user what to fix.** Do not proceed.

If multiple Chrome browsers are connected (e.g., they have it on Mac + iPad), use `AskUserQuestion` to ask which one to install into. Default to the local one ("isLocal: true").

Once they pick one, call `select_browser` with that deviceId.

---

## Phase 2 — Computer-use access for Chrome (macOS)

You need to drive the macOS Open dialog when Chrome prompts for the extension folder. That dialog is a native macOS UI element, not a web page, so Claude-in-Chrome can't reach it — you need `computer-use`.

Bundle the access request UP FRONT (per Tommy's persistent rule on avoiding multiple dialogs):

```
mcp__computer-use__request_access({
  apps: ["Google Chrome"],
  reason: "Sideload the Hijack Logger extension and drive the macOS Open dialog to pick the extension folder.",
  clipboardWrite: true,
  clipboardRead: true,
  systemKeyCombos: true
})
```

The user gets ONE macOS dialog. They approve.

If they deny, **STOP and tell them you can't proceed without it.** Fall back to instructing them to follow `SIDELOAD_TEST.md` manually.

---

## Phase 3 — Sideload the extension

Step-by-step. Use `mcp__Claude_in_Chrome__browser_batch` to batch each batch where possible.

### 3.1 Open chrome://extensions/

```
tabs_create_mcp   →  get a new tabId
navigate(tabId, "chrome://extensions/")
wait 2s
screenshot — capture the state
```

### 3.2 Verify and enable Developer Mode

Take a screenshot. The Developer mode toggle is in the top-right of `chrome://extensions/`.

- If it's **ON** (toggle is blue/right-position): skip to 3.3.
- If it's **OFF**: click the toggle. Wait 1s. Verify it flipped via another screenshot.

You may need `find` with query "Developer mode toggle" to get a precise element reference.

### 3.3 Click "Load unpacked"

Once Developer mode is on, three buttons appear: **Load unpacked**, **Pack extension**, **Update**. Click "Load unpacked".

This opens a **native macOS Open dialog** — `mcp__Claude_in_Chrome` CAN'T drive it. Switch to `mcp__computer-use__*`.

### 3.4 Drive the macOS Open dialog (computer-use)

You'll see the macOS Finder file picker focused on Chrome.

Use the **Go to Folder** shortcut to skip navigation:

```
mcp__computer-use__key({ text: "cmd+shift+g" })
wait 500ms
mcp__computer-use__type({ text: "<absolute-path-of-extension-folder>" })
mcp__computer-use__key({ text: "Return" })
wait 500ms
mcp__computer-use__key({ text: "Return" })   # confirms the selection — "Select" / "Open" button
```

The `<absolute-path-of-extension-folder>` is the absolute path of the current working directory (`pwd` from Phase 1). Make sure to use the absolute, not relative path.

If `cmd+shift+g` doesn't work (some macOS versions), fall back to: take a screenshot, identify the file picker's navigation tree, click through Home → Tools → hijack_logger (or wherever the project lives), click "Select" or "Open".

### 3.5 Verify the extension loaded

Back in Chrome, the `chrome://extensions/` page should now show a new extension card: **Hijack Poker HH Logger v0.1.0**.

- Take a screenshot.
- Use `find` on the chrome://extensions tab with query "Hijack Poker HH Logger card" to confirm presence.
- Check there are no red error indicators.

If the card has a red **Errors** link, click it, capture the error text, report to the user, **STOP**.

---

## Phase 4 — Verify the proxy works

### 4.1 Open Hijack

```
tabs_create_mcp  →  get new tabId
navigate(tabId, "https://game.hijack.poker/")
wait 10s   # Unity bootstrap
screenshot
```

If the user is auto-logged-in (cookies), Unity loads and renders the lobby/table. If not, ask the user to log in manually in that tab, then continue.

### 4.2 Run the stealth integrity probes

```
mcp__Claude_in_Chrome__javascript_tool({
  action: "javascript_exec",
  tabId: <hijack-tab-id>,
  text: "({
    sendNative:        /\\[native code\\]/.test(WebSocket.prototype.send.toString()),
    sendToStringRaw:   WebSocket.prototype.send.toString(),
    addListenerNative: /\\[native code\\]/.test(WebSocket.prototype.addEventListener.toString()),
    windowWSNative:    /\\[native code\\]/.test(window.WebSocket.toString()),
    windowWSName:      window.WebSocket.name,
    windowWSToString:  window.WebSocket.toString(),
    protoConstructorEq: WebSocket.prototype.constructor === window.WebSocket,
    sendDescriptor:    Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send'),
    onmessageDesc:     Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage'),
    ownProtoNames:     Object.getOwnPropertyNames(WebSocket.prototype).sort()
  })"
})
```

**Pass criteria (ALL must be true):**
- `sendNative: true`
- `addListenerNative: true`
- `windowWSNative: true`
- `windowWSName: "WebSocket"`
- `protoConstructorEq: true`
- `sendDescriptor.writable: true, configurable: true`
- `onmessageDesc` has both `get` and `set`, `configurable: true`
- `ownProtoNames` is the standard set (no extra additions like `__hjk_*`)

**If any fail**: the proxy is leaking a tell. Capture the full output and report to the user. The build needs hardening before distribution.

### 4.3 Verify frames are flowing

```
mcp__Claude_in_Chrome__javascript_tool({
  action: "javascript_exec",
  tabId: <hijack-tab-id>,
  text: "new Promise(r => { let count = 0; const tag = '__hjk_v1__'; const handler = (ev) => { if (ev.data && ev.data[tag] === 1 && ev.data.kind === 'frame') count++; }; window.addEventListener('message', handler); setTimeout(() => { window.removeEventListener('message', handler); r({frames_in_5s: count}); }, 5000); })"
})
```

This counts how many proxy-relayed frame events fire in 5 seconds. **Pass:** non-zero (typically 10-100 just from heartbeats + lobby state; many more if at a table).

If zero: the proxy didn't inject or its relay channel is broken. Inspect the service worker console:

```
# Tell the user how to view the SW console:
# chrome://extensions → find the Hijack Logger card → click "service worker"
# Look for [hjk] proxy injection failed errors.
```

### 4.4 Verify popup state

Hard to programmatically open extension popups. Instead, message the service worker directly to dump its state:

```
mcp__Claude_in_Chrome__javascript_tool({
  action: "javascript_exec",
  tabId: <hijack-tab-id>,
  text: "new Promise(r => chrome.runtime.sendMessage('<extension-id>', {kind:'popup_state_request'}, (resp) => r(resp || {error: chrome.runtime.lastError?.message})))"
})
```

Where `<extension-id>` is read from the chrome://extensions card. The result should show `state.totals.frames > 0`.

If the user's tab can't `chrome.runtime.sendMessage` to the extension (CORS-like restrictions), tell the user to click the toolbar icon and manually report the count back to you.

---

## Phase 5 — Output folder setup

The extension needs the user to pick a folder where `.txt` files land. This must be a user gesture (FSA security requirement), so YOU can't drive it programmatically.

Tell the user, verbatim:

> Setup looks good. Now click the Hijack Logger icon in your Chrome toolbar (top right), then click "Change" next to "Output directory", and pick a folder for your hand histories.
>
> Recommended: a folder that's synced to your Windows machine — Dropbox, iCloud Drive, or OneDrive — so HM3 on Windows can auto-import them. Something like `~/Dropbox/HM3_Imports/` works well.
>
> Tell me when you've picked it and I'll verify it persisted correctly.

Wait for user confirmation. Then verify:

```
mcp__Claude_in_Chrome__javascript_tool({
  action: "javascript_exec",
  tabId: <hijack-tab-id>,
  text: "new Promise(r => chrome.storage.local.get(['outputDirName'], (v) => r(v)))"
})
```

`outputDirName` should be non-null.

---

## Phase 6 — Hand off

Report to the user:

```markdown
✅ Hijack Logger installed and verified.

- Extension: Hijack Poker HH Logger v0.1.0
- Location: <path>
- Stealth probes: ALL PASS
- Frame capture: <N> frames in 5s on lobby
- Output folder: <user-picked>

Next steps:
- Configure HM3 on Windows: Settings → Sites → Add Site → PokerStars → watch folder = <output-folder>
- Sit at a PLO cash table at Hijack and play. The .txt file appears in the output folder per session per table.
- (Optional) Run Gate 5 FSA durability test once on each machine: open FSA_DURABILITY_TEST.html in Chrome and follow on-page instructions. ~5 min, validates the file-write piece is reliable.
- Report any issues back to me (or the project maintainer).
```

Also log the install to substrate (if you have access to the SiXiS dashboard CLI):

```bash
cd ~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1 && python3 scripts/sixis.py log-discovery-answer \
  --draft-id 58b57cb3-079b-4559-9cb8-85ceaad52b44 \
  --cycle-id 37245c60-914e-443b-bede-66a36fe09099 \
  --question "Sideload install on <machine-id>" \
  --answer "Installed v0.1.0 at <path>. Stealth probes: PASS. Frame capture: <N>/5s. Output folder: <path>."
```

(Skip the substrate log if the dashboard isn't on this machine — that's only on Tommy's primary dev box, not on buddies' machines.)

---

## Phase 7 — Cleanup

- Close the Hijack tab if you opened a fresh one for testing.
- Leave `chrome://extensions/` and the user's existing Chrome tabs alone.
- Do NOT close Chrome.

---

## Failure modes and recovery

| Failure | What to do |
|---------|------------|
| Chrome extension not paired | Tell user to open the Claude-in-Chrome extension popup and click Connect. Wait 60s, retry `list_connected_browsers`. |
| computer-use access denied | Tell user this install requires Mac access and to grant it. Fall back to `SIDELOAD_TEST.md` if they refuse. |
| Developer mode toggle not found | `find` with query "Developer mode" or take a zoomed screenshot of the top-right of chrome://extensions to find it. |
| Open dialog won't accept cmd+shift+g | Take screenshot, locate the file picker, click through manually via computer-use. |
| Extension card shows red errors | Click the Errors link, screenshot the error, report to user. Common cause: missing icon files (Chrome 95+ is strict). |
| Stealth probe FAIL on `sendNative` | The proxy patched `send` but `toString()` is leaking. Check `ws_proxy.js` `maskFunction` — make sure it sets the per-function override correctly. |
| Frames not flowing (count = 0) | Service worker may have failed to inject the proxy. Check SW console at chrome://extensions → service worker link. Look for `[hjk]` log lines. |
| FSA picker prompt loops | Some Chrome versions need the FSA picker invoked from a user gesture on a real page, not from the extension popup. Workaround: invoke from a page action button instead. (Layer B v1 bug — flag for fix.) |

---

## Notes for future maintainers

- This playbook is the SHARED prompt for both Tommy's machine and any buddy's machine. Keep it generic — no hardcoded paths beyond what's derivable at runtime.
- Don't add SiXiS-specific assumptions (substrate, judge tooling, etc.) into the buddy-facing flow. Substrate logging only on Tommy's box (Phase 6 caveat).
- If you make breaking changes to `ws_proxy.js`, update the stealth probe in Phase 4.2 to match.
- If Chrome adds a new integrity check vector or changes MV3 injection rules, add a new gate to Phase 4.
