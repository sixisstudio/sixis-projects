# Hijack Poker HH Logger

Personal hand history logger for [Hijack Poker](https://game.hijack.poker). Captures PLO cash hands via WebSocket interception, writes PokerStars-format `.txt` files to your local Downloads folder for import into Hold'em Manager 3.

**Status:** Phase 1 build in progress. Phase 0 architecture validation complete (2026-05-11).

**Tier:** Personal use, sideload only. No Chrome Web Store. Not for public distribution.

---

## Install

**Recommended (agentic install via Claude Code):** see `OPERATOR_GUIDE.md`. ~3 min interactive. Works on Mac. Same flow for your own machine and for distributing to buddies.

**Manual fallback (you sideload yourself):** see `SIDELOAD_TEST.md`. ~10 min, drives the same steps by hand. Use this if Claude Code or the macOS computer-use MCP isn't available.

## Configure HM3 import (Windows only)

1. HM3 → Settings → Sites → Add Site → choose **PokerStars** as the format.
2. Watch folder: point at the same directory you configured as the extension's output folder (or its Windows-synced equivalent if you play on Mac).
3. HM3 will auto-import `.txt` files as they appear.

## Usage

1. Open Chrome, go to [game.hijack.poker](https://game.hijack.poker), log in, sit at a PLO cash table.
2. The extension intercepts WS frames automatically. The popup shows live counters.
3. Each table = one `.txt` file per session. New session if you close + reopen the table.
4. Files land in your configured output directory. HM3 picks them up automatically if its watch folder matches.

## Settings

- **Always-on raw frame capture** (default on): writes a parallel `.raw.jsonl` file with verbatim WS frames. Insurance against Hijack changing the protocol — if our parser breaks, the raw log lets us re-parse later.
- **Schema fingerprint warnings** (default on): popup alert if Hijack ships a client update with a different game-state shape.

## Scope

In scope:
- PLO cash games only
- Multi-tabling (per-table state isolation)
- Mac + Windows Chrome
- Review-only — NO real-time HUD, no in-play UI, no live stat overlays

Out of scope:
- NLHE, PLO5, mixed games, tournaments, SNGs
- Chrome Web Store distribution
- HM3 on Mac (HM3 is Windows-only — shuttle files manually if you play on Mac)

## Project layout

```
hijack_logger_v0_1/
├── manifest.json
├── OPERATOR_GUIDE.md       # human setup guide (read first if installing)
├── SETUP_AGENT.md          # Claude Code playbook (the agentic install)
├── SIDELOAD_TEST.md        # manual sideload fallback playbook
├── FSA_DURABILITY_TEST.html # Gate 5 off-line storage test
├── src/
│   ├── background/         # service worker, WS proxy, parser, writers
│   ├── content/            # ISOLATED-world relay bridge
│   ├── popup/              # extension popup UI
│   ├── icons/              # placeholder icons (16/32/48/128)
│   └── lib/                # card codec, gzip helper
├── spec/
│   ├── LAYER_B_v1.md       # full build spec
│   └── PROTOCOL_NOTES.md   # Hijack WS protocol reference
└── tests/                  # parser unit tests + fixtures (to come)
```

## Risk posture

Hijack's ToS almost certainly prohibits third-party tools. This is a **personal-risk** tool used at your own discretion. Detection vectors are minimized by design:

- Stealth-hardened WS proxy (no JS-environment tells visible to the page).
- No in-game-tab UI injection.
- No phone-home (zero outbound network traffic from the extension).
- Sideload only — no extension fingerprint in the Chrome Web Store.
- Review-only usage (no real-time HUD signature on play patterns).

The actual ToS exposure is downstream HM3-assisted play behavior, not the capture itself. See `spec/LAYER_B_v1.md` §8 for full risk analysis.

## Council provenance

Architecture ratified by SiXiS Protocol cross-poll, cycle `37245c60-914e-443b-bede-66a36fe09099`, 2 mandatory rounds, unanimous R2. Draft `58b57cb3-079b-4559-9cb8-85ceaad52b44`.
