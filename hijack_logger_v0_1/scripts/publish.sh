#!/usr/bin/env bash
# Sync the SiXiS-monorepo dev copy → ~/Tools/cash-review-v1 distribution repo,
# commit the changes, and push to github.com/sixisstudio/cash-review-v1.
#
# Usage:
#   scripts/publish.sh                       # interactive: shows diff, asks before push
#   scripts/publish.sh "<commit message>"    # non-interactive
#
# The dev copy lives at:
#   ~/Documents/Claude/Projects/SixiS/projects/hijack_logger_v0_1
# The distribution copy lives at:
#   ~/Tools/cash-review-v1
# Both must exist or this script aborts.

set -euo pipefail

DEV_DIR="$HOME/Documents/Claude/Projects/SixiS/projects/hijack_logger_v0_1"
DIST_DIR="$HOME/Tools/cash-review-v1"
DIST_REMOTE="origin"
DIST_BRANCH="main"

# ─── Sanity checks ────────────────────────────────────────────────
if [[ ! -d "$DEV_DIR" ]]; then
  echo "ERROR: dev copy not found at $DEV_DIR" >&2
  exit 1
fi
if [[ ! -d "$DIST_DIR/.git" ]]; then
  echo "ERROR: distribution repo not found at $DIST_DIR" >&2
  echo "Hint: this script assumes ~/Tools/cash-review-v1 is a git checkout of the distribution repo." >&2
  exit 1
fi

# ─── Sync files ───────────────────────────────────────────────────
# Use rsync with --delete to keep dist exactly in sync with dev, but PRESERVE
# the dist .git directory and a few dist-only files.

echo "==> Syncing $DEV_DIR → $DIST_DIR"
rsync -av --delete \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'recon_captures/*' \
  --exclude 'node_modules/' \
  --exclude 'tests/output/' \
  "$DEV_DIR/" \
  "$DIST_DIR/"

# ─── Commit & push ────────────────────────────────────────────────
cd "$DIST_DIR"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "==> No changes to publish."
  exit 0
fi

echo "==> Changes detected:"
git status -s
echo

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo "Enter commit message (or Ctrl-C to abort):"
  read -r MSG
  if [[ -z "$MSG" ]]; then
    echo "ERROR: empty commit message; aborting" >&2
    exit 1
  fi
fi

git add -A
git commit -m "$MSG"

echo "==> Pushing to $DIST_REMOTE/$DIST_BRANCH"
git push "$DIST_REMOTE" "$DIST_BRANCH"

echo "==> Published. Latest commit:"
git log --oneline -1
