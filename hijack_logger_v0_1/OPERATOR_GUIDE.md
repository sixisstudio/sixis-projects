# Operator Guide — Install Hijack Logger on a fresh machine

You (or a buddy you're sharing this with) want the Hijack Logger running. **Works on Mac AND Windows** (and Linux for the brave). Total time: ~20 minutes of setup, ~3 of which is interactive. Everything else Claude Code drives.

This guide is for both **first-time install on your own machine** AND **distributing to a buddy**. Same steps either way.

---

## Prerequisites (one-time per machine, ~10 min)

You need these BEFORE running the install one-liner:

### 1. Google Chrome

Skip if installed. https://www.google.com/chrome/

### 2. Claude Code (the CLI)

Pick your OS:

- **macOS** (Homebrew): `brew install --cask claude-code`
- **Windows**: download installer from https://www.anthropic.com/claude-code
- **Linux**: same link, follow the platform notes

After install, run `claude` in a terminal once to log in to your Anthropic account.

### 3. Claude in Chrome (the browser extension)

This is what lets Claude Code control your Chrome. Cross-platform.

1. Install from the Chrome Web Store: search "Claude in Chrome" or visit https://chrome.google.com/webstore (Anthropic's listing).
2. Click the extension icon in Chrome's toolbar.
3. Click **Sign in** → use the same Anthropic account as your Claude Code.
4. When you later run setup, Claude Code will broadcast a pairing request and your Chrome extension will pop up a "Connect" button. Click it.

### 4. Hold'em Manager 3 (Windows only)

Install HM3 on your Windows machine. License separately. https://www.holdemmanager.com/

If you play on Mac and HM3 lives on Windows, the Hijack Logger writes `.txt` files to a folder of your choosing — pick a Dropbox/iCloud/OneDrive synced folder so the same files appear on your Windows box. (HM3 on Mac is not a thing.)

---

## Run the install (~3 min interactive)

You don't need to clone anything yourself. Open a terminal anywhere, run `claude`, then paste **the one-liner from the SiXiS dashboard for this project** (or the one Tommy sent you directly):

```
Read https://raw.githubusercontent.com/sixisstudio/cash-review-v1/main/INSTALL.md and follow it.
```

That's it. Claude will:

1. Detect your OS and Chrome install.
2. Ask where you want the project cloned (suggests `~/Tools/cash-review-v1` on Mac/Linux, `C:\Tools\cash-review-v1` on Windows — accept the default or type your own path).
3. Clone the repo there.
4. Pair with your Chrome extension (one click in Chrome — approve it).
5. Open `chrome://extensions/`, turn on Developer mode, click **Load unpacked**.
6. Hand you the OS file picker with the exact path to copy — you click "Select Folder" (Windows) or "Open" (Mac/Linux).
7. Run the Gate 1 stealth probes (~10 seconds) and report PASS/FAIL.
8. Tell you to pick your output folder via the extension popup.

**Your manual steps during the install:**
- Confirm the install path (or type a different one) — 1 second.
- Click **Connect** in the Chrome extension popup when Claude broadcasts the pair request.
- Navigate the OS file picker to the install path and click **Select Folder** / **Open** — ~10 seconds. Tip: on Mac press ⌘⇧G and paste the path; on Windows paste the path into the File Explorer address bar.
- After install succeeds, click the Hijack Logger toolbar icon, click **Change** next to "Output directory", and pick where the `.txt` files should land.

---

## Configure HM3 (Windows only, ~2 min)

On your Windows machine:

1. HM3 → **Settings** → **Sites** → **Add Site**.
2. Choose **PokerStars** as the format. (Yes, even though it's Hijack — we emit PokerStars-compatible text.)
3. **Watch folder**: point at the same folder you picked as the extension's output folder (or its Windows-synced equivalent if you play on Mac and review on Windows).
4. Save.

HM3 will now auto-import any `.txt` file the extension produces.

---

## Verify it works (~2 min)

1. Open Chrome (the one Claude already loaded the extension into).
2. Go to https://game.hijack.poker and log in.
3. Click the Hijack Logger toolbar icon — popup should show your output directory + a non-zero "frames" counter once you're at a table.
4. Sit at a PLO cash table and play a hand. The popup hand counter should increment.
5. Open the output folder — you should see a `HH<date>-<time> T<table>-1.txt` file appearing. On Windows, HM3 should auto-import it.

---

## If something fails

Claude Code reports what it sees. Common failures:

- **"Chrome not found"** — install Chrome.
- **"Chrome extension didn't pair"** — make sure you installed Claude in Chrome and signed in to the same Anthropic account as your Claude Code. Restart Chrome and try again.
- **"You canceled the file picker"** — re-click Load Unpacked in `chrome://extensions/`, navigate to the install path, and click Select Folder. Tell Claude when done.
- **"Wrong folder picked"** — go to `chrome://extensions/`, click **Remove** on the Hijack Logger card, then re-run the install (or just re-run Phase 3 of `SETUP_AGENT.md`).
- **"Stealth probe FAIL"** — Hijack shipped a client update that wrapped `WebSocket`. Send the probe output to Tommy, we'll re-architect.
- **"Extension card shows red errors"** — there's a bug in the extension. Send the error text + your Chrome version.

You can also fall back to the manual sideload at `SIDELOAD_TEST.md` if Claude Code isn't working at all.

---

## Distributing to a buddy

To onboard a buddy:

1. Make sure they meet the prerequisites above (Chrome, Claude Code, Claude-in-Chrome extension — and HM3 if they're on Windows).
2. Send them the one-liner. **They don't need access to your dashboard or substrate** — the install is fully self-contained from the public GitHub repo.

```
Read https://raw.githubusercontent.com/sixisstudio/cash-review-v1/main/INSTALL.md and follow it.
```

3. Suggest they use Dropbox/iCloud/OneDrive sync if they play on multiple machines, so their hand histories travel with them.

Mac and Windows buddies both work — same one-liner, same flow.
