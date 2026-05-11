# Operator Guide — Install Hijack Logger on a fresh machine

You (or a buddy you're sharing this with) want the Hijack Logger running. Total time: ~20 minutes of setup, ~3 of which is interactive. Everything else Claude Code drives.

This guide is for both **first-time install on your own machine** AND **distributing to a buddy**. Same steps either way.

---

## Prerequisites (one-time per machine, ~15 min)

You need:

### 1. Google Chrome

Skip if installed. https://www.google.com/chrome/

### 2. Claude Code (the CLI)

https://www.anthropic.com/claude-code

```
# Mac (Homebrew)
brew install --cask claude-code

# Windows — download installer from the link above
```

After install, run `claude` in a terminal once to log in.

### 3. Claude in Chrome (the browser extension)

This is what lets Claude Code control your Chrome.

1. Install from: https://chrome.google.com/webstore/detail/claude-in-chrome (or whichever URL Anthropic publishes)
2. Click the extension icon in Chrome's toolbar.
3. Click **Sign in** → use the same Anthropic account as your Claude Code.
4. When you later run setup, Claude Code will broadcast a pairing request and your Chrome extension will pop up a "Connect" button. Click it.

### 4. macOS computer-use OR Windows computer-use (Mac only for v1)

This is what lets Claude Code drive the macOS file picker dialog during the extension install. On Mac, this is the `computer-use` MCP server.

```
# Mac — installs the Anthropic computer-use server. Requires macOS 13+.
# Follow instructions at: https://github.com/anthropics/claude-code/tree/main/computer-use
```

Windows: TBD, the install path requires native Windows automation. For now, if you're on Windows, fall back to manual sideload via `SIDELOAD_TEST.md`.

### 5. Hold'em Manager 3 (Windows only)

Install HM3 on your Windows machine. License separately. https://www.holdemmanager.com/

---

## Get the project files (~30 sec)

Pick a folder you'll keep stable — the extension must keep living at this path for Chrome to keep loading it.

```bash
# Mac — replace with a path you like
mkdir -p ~/Tools
cd ~/Tools
git clone <git-url-of-this-project>  hijack_logger
# Or, if not using git: copy the project folder here from wherever you got it
```

For Windows, similar — use `git clone` in Git Bash or copy the folder manually to e.g. `C:\Tools\hijack_logger\`.

---

## Run the install (~3 min interactive)

Open a terminal in the project folder:

```bash
cd ~/Tools/hijack_logger    # or wherever you put it
claude
```

Once inside Claude Code, type **exactly this one sentence**:

> Read SETUP_AGENT.md and run the installation playbook.

That's it. Claude will:

1. Detect your OS and Chrome install.
2. Ask Chrome permission via a system dialog (one click — approve it).
3. Pair with your Chrome extension (one click in Chrome — approve it).
4. Open `chrome://extensions/`, turn on Developer mode, load this folder as an unpacked extension.
5. Run the Gate 1 stealth probes (~10 seconds) and report PASS/FAIL.
6. Tell you to pick your output folder.

**Your only manual steps after typing the sentence:**
- Click "Approve" on a macOS permission dialog (or Windows equivalent).
- Click "Connect" in the Chrome extension popup when prompted.
- After install succeeds, click the Hijack Logger toolbar icon and pick a folder for the `.txt` files. Recommended: a folder synced to your Windows machine via Dropbox/iCloud/OneDrive (e.g., `~/Dropbox/HM3_Imports/`), so HM3 on Windows can auto-import from a watched folder.

---

## Configure HM3 (Windows only, ~2 min)

On your Windows machine:

1. HM3 → **Settings** → **Sites** → **Add Site**.
2. Choose **PokerStars** as the format. (Yes, even though it's Hijack — we emit PokerStars-compatible text.)
3. **Watch folder**: point at the folder you picked above (or its Windows-synced equivalent).
4. Save.

HM3 will now auto-import any `.txt` file the extension produces.

---

## Verify it works (~2 min)

1. Open Chrome (the regular one Claude already loaded the extension into).
2. Go to https://game.hijack.poker and log in.
3. Click the Hijack Logger toolbar icon — popup should show your output directory + a non-zero "frames" counter once you're at a table.
4. Sit at a PLO cash table and play a hand. The popup hand counter should increment.
5. On Windows: open the output folder, you should see a `HH<date>-<time> T<table>-1.txt` file appearing. HM3 should auto-import it.

---

## If something fails

Claude Code reports what it sees. Common failures:

- **"Chrome not found"** — install Chrome.
- **"Chrome extension didn't pair"** — make sure you installed Claude in Chrome and signed in. Restart Chrome and try again.
- **"computer-use access denied"** — check macOS System Settings → Privacy & Security → Accessibility → make sure Claude has permission.
- **"Stealth probe FAIL"** — Hijack shipped a client update that wrapped `WebSocket`. Send me the probe output, we'll re-architect.
- **"Extension card shows red errors"** — there's a bug in the extension. Send me the error text and which Chrome version.

You can also fall back to the manual sideload at `SIDELOAD_TEST.md` if Claude Code isn't working.

---

## Distributing to a buddy

To onboard a buddy:

1. Make sure they meet the prerequisites above.
2. Share the project folder (via `git clone` URL, AirDrop, USB stick, whatever).
3. They follow this guide. Total interactive time: ~3 min.

Encourage them to use Dropbox/iCloud syncing of the output folder so their hand histories land on whatever machine has HM3.
