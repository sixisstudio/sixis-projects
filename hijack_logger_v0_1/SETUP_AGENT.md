# Setup Agent Playbook

**Read this file in full, then execute the steps below.** You are setting up the Hijack Poker HH Logger Chrome extension on the user's machine.

This playbook is **OS-agnostic** (macOS, Windows, Linux all supported). It uses only `mcp__Claude_in_Chrome__*` tools — no `mcp__computer-use__*` dependency. The user drives the native file picker themselves (one click), giving them full control over file-system paths.

## How you got here

One of:
- **The user pointed you at a remote URL** (e.g., `https://github.com/<user>/<repo>/blob/main/INSTALL.md`). In that case, you should have already executed `INSTALL.md` Phase 0.5 to clone the repo and `cd` into it. If you haven't, STOP and read `INSTALL.md` first.
- **The user opened Claude Code inside an already-cloned project folder** and asked you to run the playbook. In that case, you're ready — proceed to Phase 1 below.

Verify you're in the project folder before continuing:

```bash
ls manifest.json src/background/ws_proxy.js src/content/relay.js
```

If any of those files are missing, STOP and resolve (clone the repo, fix the working directory, etc.) before proceeding.

---

## Prerequisites you can assume

- Google Chrome is installed.
- Claude-in-Chrome browser extension is installed and signed in to the same Anthropic account as Claude Code.
- The current working directory IS the extension folder (contains `manifest.json`).
- The user is at their keyboard and can click once when prompted (one click for the OS file picker, one click to approve Chrome-extension pair, one click to pick the output folder later).

Confirm assumptions before doing anything destructive.

---

## Phase 1 — Sanity checks (no side effects)

Run these in parallel:

1. `pwd` and `ls manifest.json src/background/ws_proxy.js src/content/relay.js` — verify the extension folder structure is intact. **Capture the absolute path** — you'll need it for Phase 3.4.
2. Detect OS via `uname -s` (Darwin / Linux / MINGW*-MSYS*-CYGWIN*) so you can phrase user-facing instructions correctly.
3. Confirm Chrome is installed:
   - macOS: `ls -d "/Applications/Google Chrome.app"`
   - Windows: `ls "/c/Program Files/Google/Chrome/Application/chrome.exe" 2>/dev/null || ls "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" 2>/dev/null`
   - Linux: `which google-chrome || which chromium`
4. List currently connected Chrome browsers via `mcp__Claude_in_Chrome__list_connected_browsers`. If zero browsers connected, instruct the user to open Chrome and ensure the Claude-in-Chrome extension is signed in.

If any of these fail, **STOP and tell the user what to fix.** Do not proceed.

If multiple Chrome browsers are connected (e.g., user has it on Mac + a Windows PC), use `AskUserQuestion` to ask which one to install into. Default to the local one (`isLocal: true`).

Once they pick one, call `select_browser` with that deviceId.

---

## Phase 2 — (No-op, removed)

Previous versions of this playbook required `mcp__computer-use__*` access on macOS to drive the file picker. **No longer needed** — the user drives the native picker themselves in Phase 3.4. This phase is intentionally left in place so phase numbering stays stable across docs.

---

## Phase 3 — Sideload the extension

Step-by-step. Use `mcp__Claude_in_Chrome__browser_batch` to batch actions where possible.

### 3.1 Open chrome://extensions/

```
tabs_create_mcp   →  get a new tabId
navigate(tabId, "chrome://extensions/")
wait 2s
screenshot
```

### 3.2 Verify and enable Developer Mode

Take a screenshot. The Developer mode toggle is in the top-right of `chrome://extensions/`.

- If it's **ON** (toggle in the right/active position): skip to 3.3.
- If it's **OFF**: click the toggle. Wait 1s. Verify it flipped via another screenshot.

You may need `find` with query "Developer mode toggle" to get a precise element reference.

### 3.3 Click "Load unpacked"

Once Developer mode is on, three buttons appear: **Load unpacked**, **Pack extension**, **Update**. Click "Load unpacked".

This opens a **native OS file picker** (Finder on macOS, File Explorer on Windows, GTK on Linux). `mcp__Claude_in_Chrome` CAN'T drive native dialogs — they live outside Chrome.

### 3.4 Tell the user to pick the extension folder

**Stop driving Chrome.** The user needs to do this one step manually.

Tell the user, verbatim:

> Chrome just opened a file picker. Please navigate to:
>
>    `<absolute path of extension folder from Phase 1>`
>
> and click **Select Folder** (Windows) / **Open** (macOS) / **Open** (Linux).
>
> On macOS you can press **⌘⇧G** in the picker, paste the path, and press Return to skip the navigation.
> On Windows you can paste the path into the address bar at the top of the File Explorer dialog and press Enter.
>
> Tell me "done" or "selected" when the picker has closed.

Wait for the user to confirm. **Don't proceed until they do.** If they say something went wrong (wrong folder, canceled, etc.), have them re-open the picker by re-clicking "Load unpacked" on the Chrome tab and try again.

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
> **Recommended folder choices:**
> - If you play on Mac AND review on a separate Windows PC running HM3: use a synced folder so files appear on both — `~/Dropbox/HM3_Imports/`, `~/iCloud Drive/HM3_Imports/`, or `~/OneDrive/HM3_Imports/`. Configure HM3 on Windows to watch the same synced folder.
> - If you play on the SAME machine as HM3 (Windows): pick a local folder like `C:\HM3_Imports\` and point HM3's watch folder at it.
> - If you're just collecting hands without HM3 right now: any folder. You can move them later.
>
> Tell me the folder name once you've picked it.

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

Also log the install to substrate (if you have access to the SiXiS dashboard CLI on this machine):

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
| User canceled the Load Unpacked picker | Click "Load unpacked" again from chrome://extensions and re-prompt the user with the path. |
| User picked the wrong folder | Have them go to chrome://extensions, click "Remove" on the extension card, then re-run Phase 3 from the top. |
| Developer mode toggle not found | `find` with query "Developer mode" or take a zoomed screenshot of the top-right of chrome://extensions to find it. |
| Extension card shows red errors | Click the Errors link, screenshot the error, report to user. Common cause: missing icon files (Chrome 95+ is strict). |
| Stealth probe FAIL on `sendNative` | The proxy patched `send` but `toString()` is leaking. Check `ws_proxy.js` `maskFunction` — make sure it sets the per-function override correctly. |
| Frames not flowing (count = 0) | Service worker may have failed to inject the proxy. Check SW console at chrome://extensions → service worker link. Look for `[hjk]` log lines. |
| FSA picker prompt loops | Some Chrome versions need the FSA picker invoked from a user gesture on a real page, not from the extension popup. Workaround: invoke from a page action button instead. (Layer B v1 bug — flag for fix.) |

---

## Notes for future maintainers

- This playbook is the SHARED prompt for Tommy's machine, buddies' machines, Mac + Windows + Linux. Keep it generic — no hardcoded paths beyond what's derivable at runtime.
- Don't add SiXiS-specific assumptions (substrate, judge tooling, etc.) into the buddy-facing flow. Substrate logging only on Tommy's box (Phase 6 caveat).
- If you make breaking changes to `ws_proxy.js`, update the stealth probe in Phase 4.2 to match.
- If Chrome adds a new integrity check vector or changes MV3 injection rules, add a new gate to Phase 4.
- v0.1.0 → v0.2.0 changelog: dropped `mcp__computer-use__*` dependency. The user clicks through the OS file picker themselves. Adds ~10 seconds of interaction in exchange for Windows support + Mac/Win parity + file-path control.
