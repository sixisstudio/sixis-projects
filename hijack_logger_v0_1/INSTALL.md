# Hijack Logger — Install Entry Point

**You (Claude Code) have been given this URL or this file as the entry to install the Hijack Poker HH Logger on the user's machine.** Read this in full, then execute.

This file is the single-entry-point for the agentic install. It bootstraps clone-if-needed and chains to `SETUP_AGENT.md` for the actual install playbook.

---

## Inputs you should have

One of:
- **Path on disk**: the user already cloned the project, the cwd is the project folder (contains `manifest.json`).
- **Just a URL**: the user pasted `https://github.com/<user>/<repo>/blob/main/INSTALL.md` (or similar). You need to clone first.

Detect by running:

```bash
ls manifest.json src/background/ws_proxy.js 2>/dev/null
```

If both exist → you're in the project folder, skip to "Phase 0 — chain into SETUP_AGENT.md".
If not → you need to clone. Continue here.

---

## Phase 0.5 — Bootstrap clone (if not already cloned)

The user invoked Claude from somewhere that isn't the project folder. You need to clone the repo and `cd` into it before running the install playbook.

### Step 1 — Determine the repo URL

The repo URL should be the URL the user pasted (replace `/blob/main/INSTALL.md` suffix with the repo root).

Examples:
- `https://github.com/<user>/<repo>/blob/main/INSTALL.md` → repo URL is `https://github.com/<user>/<repo>.git`
- `https://github.com/<user>/<repo>` → repo URL is `https://github.com/<user>/<repo>.git`
- Raw URL like `https://raw.githubusercontent.com/<user>/<repo>/main/INSTALL.md` → repo URL is `https://github.com/<user>/<repo>.git`

If you can't infer the URL from what the user gave you, ask them: "What's the git URL of the project repo?"

### Step 2 — Pick a stable local path

Default:
- macOS / Linux: `~/Tools/<repo-name>`
- Windows: `C:\Tools\<repo-name>`

If `~/Tools` doesn't exist, create it. If the target path already exists (user installed before), use `git -C <path> pull` to update instead of cloning fresh.

### Step 3 — Clone (or pull)

```bash
mkdir -p ~/Tools                # or equivalent on Windows
cd ~/Tools
if [ -d <repo-name> ]; then
  cd <repo-name>
  git pull --ff-only
else
  git clone <repo-url> <repo-name>
  cd <repo-name>
fi
```

Verify the clone succeeded by checking for `manifest.json` and `src/background/ws_proxy.js`.

### Step 4 — Tell the user

```
✓ Cloned to ~/Tools/<repo-name>
Now running the install playbook…
```

---

## Phase 0 — Chain into SETUP_AGENT.md

You're now in the project folder. Read `SETUP_AGENT.md` and execute everything in it.

**Important:** `SETUP_AGENT.md` is the canonical playbook. This file (`INSTALL.md`) is only a bootstrap wrapper. Don't duplicate logic — read SETUP_AGENT.md and follow it.

```bash
# In the project folder:
cat SETUP_AGENT.md
```

Then execute every phase of SETUP_AGENT.md (Phase 1 through Phase 7).

---

## Quick reference for the user

If something goes wrong and the user wants to retry manually:

1. Make sure the project is cloned at `~/Tools/<repo-name>`.
2. `cd ~/Tools/<repo-name>`
3. Run `claude` from there.
4. Tell Claude: `Read SETUP_AGENT.md and run the installation playbook.`

This skips the bootstrap and goes straight to Phase 1 of SETUP_AGENT.md.
