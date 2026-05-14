# Hijack Logger — Manual Install (Windows / Mac, no Claude Code)

5 minutes. Works on any machine with Chrome.

---

## 1. Get the code

**Option A — Git (preferred, allows `git pull` to update later):**

```
git clone https://github.com/sixisstudio/cash-review-v1.git
```

If you don't have Git, install it from <https://git-scm.com/downloads>.

**Option B — Download ZIP (no Git):**

1. Open <https://github.com/sixisstudio/cash-review-v1> in your browser.
2. Click the green **Code** button → **Download ZIP**.
3. Extract the ZIP somewhere you'll remember (e.g., `C:\Tools\cash-review-v1` on Windows, `~/Tools/cash-review-v1` on Mac).

Either way, you should end up with a folder containing `manifest.json` at the top level.

---

## 2. Load the extension in Chrome

1. Open Chrome.
2. Go to `chrome://extensions` (paste into the address bar).
3. Top-right corner: turn ON **Developer mode**.
4. Click **Load unpacked** (top-left).
5. Select the folder from step 1 (the one with `manifest.json` directly inside).
6. The extension card should appear: **Hijack Poker HH Logger v0.2.27**.
7. (Optional) Click the puzzle-piece icon in the toolbar → pin **Hijack Logger** so you have one-click access.

---

## 3. Pick your output folder

1. Click the **Hijack Logger** icon in the toolbar.
2. Click **Change** next to "Output directory".
3. Pick a folder where you want hand-history `.txt` files saved (e.g., `Documents\HiJack_HH` on Windows).
4. Approve the permission prompt.

You're done. The popup should now say:
- Output directory: `<your folder>`
- v0.2.27

---

## 4. Play poker

1. Open <https://game.hijack.poker/> in the same Chrome browser, log in normally.
2. Sit at a PLO cash table (this extension is PLO-only for now).
3. Play hands. The extension silently captures every hand as it completes.
4. Each session writes one `.txt` file per table to your output folder, plus a `.raw.jsonl` sidecar (raw WebSocket data — keep these, they let us regenerate the `.txt` if a bug is ever found).

The popup shows live counters: hands captured, hands you played vs. observed, frames seen, etc.

---

## 5. Import into PokerTracker 4

1. PT4 → **File** → **Get Hands From Disk**.
2. Browse to your output folder.
3. Click **Start Import**. PT4 will read every `.txt` file (it'll skip `.raw.jsonl` with a harmless "Unrecognized file format" warning).
4. Hands appear in your normal PT4 database, replayable, HUD-able, etc.

You can re-import the same folder anytime — PT4 detects duplicates and skips them.

---

## Updating later

**With Git (Option A above):**

```
cd <your install folder>
git pull
```

Then go to `chrome://extensions` and click the **reload (↻)** icon on the Hijack Logger card.

**Without Git (Option B):** download a fresh ZIP, replace the folder, then reload the extension at `chrome://extensions`.

---

## Troubleshooting

- **Popup shows "not set" for Output directory** — click **Change** and re-pick the folder. Chrome's File System Access permission can lapse between sessions; re-pick same folder is fine.
- **No `.txt` files appearing** — make sure you've sat at a PLO cash table (this version skips Hold'em / tournaments). Check the popup's "frames" counter is going up while the table is open; if frames=0, the extension didn't inject.
- **Extension errors at chrome://extensions** — click "Errors" on the extension card and screenshot. Tommy can pass it along for debugging.
- **PT4 rejects some hands** — current version (v0.2.27) imports cleanly; if you see new errors, save the PT4 import log and the `.raw.jsonl` for that session, share with Tommy.

---

That's it. No Claude Code, no command-line driving required.
