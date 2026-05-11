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

### Step 2 — Detect the OS

```bash
uname -s    # "Darwin" = macOS, "Linux" = Linux, "MINGW*"/"MSYS*"/"CYGWIN*" = Windows
```

If on Windows under Git Bash, you can still use the POSIX-style commands below but the user's filesystem paths use backslashes (translated automatically by Git Bash).

### Step 3 — Ask the user where to clone the project

**Don't hardcode the path.** Ask the user where they want the project installed so they have control of their file system. Use `AskUserQuestion` if available; otherwise plain prompt. Provide a sensible default they can accept by hitting Enter.

Suggested defaults (offer these but accept any path the user types):
- macOS / Linux: `~/Tools/<repo-name>`
- Windows: `C:\Tools\<repo-name>` (or `~/Tools/<repo-name>` if they're in Git Bash with a Linux-y mental model)

If the user already has the project somewhere (re-install), they can point at the existing path and you'll `git pull` instead of cloning fresh.

### Step 4 — Clone (or pull)

```bash
TARGET="<path-user-chose>"        # absolute path
mkdir -p "$(dirname "$TARGET")"
if [ -d "$TARGET/.git" ]; then
  echo "Existing checkout at $TARGET — pulling latest"
  git -C "$TARGET" pull --ff-only
else
  git clone <repo-url> "$TARGET"
fi
cd "$TARGET"
```

Verify by checking for `manifest.json` and `src/background/ws_proxy.js` in `$TARGET`.

### Step 5 — Confirm with the user

```
✓ Cloned to <path>
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
