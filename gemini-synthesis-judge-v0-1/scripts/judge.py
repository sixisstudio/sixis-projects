#!/usr/bin/env python3
"""Gemini Synthesis Judge v0.1 — orchestrator-driven CLI scaffold.

Cycle 1 deliverable: prepare prompts, log events, decide whether to fire.
The orchestrator (Claude Code session) drives the actual Gemini browser relay
via Claude-in-Chrome MCP — this CLI handles substrate reads/writes around it.

Subcommands:
    should-fire       Cycle 1 trigger logic: returns 0 (fire) or 1 (skip).
                      v0.1 fires on Tier-3 ratifications only.
                      Cycle 2 expands to the full 10-category Tier-2 trigger list.

    prepare-prompt    Builds the Judge prompt for a poll from substrate
                      (cross-poll question + per-brain Round-2 responses +
                      convergence summary), writes to artifacts/judge_prompts/<poll>.md.
                      Orchestrator opens gemini.google.com via Chrome MCP,
                      pastes the prompt, captures the response.

    log-flag          Logs a judge_flag event (Judge emitted at least one
                      contradiction / unaddressed-counterargument / premature-
                      consensus flag against the converged synthesis).

    log-attempted     Logs a judge_attempted event. Used when the Judge fired,
                      returned successfully, but produced a null/no-flag result
                      per FORCED_RULE_GJ_04 (judge-side null-on-trivial).
                      Required so we have an audit trail even on null outputs.

    log-unavailable   Logs a judge_unavailable event. Used when the Judge
                      relay failed (Gemini unreachable, rate-limited, capture
                      failed) — graceful skip per FORCED_RULE_GJ_02.

The dashboard repo's sixis.py owns substrate writes — this script delegates
to it via subprocess so we honor the local-SQLite-with-Supabase-mirror path.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

DASHBOARD_DIR = Path("~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1").expanduser()
DB_PATH = DASHBOARD_DIR / "sixis_dashboard.db"
PROJECT_DIR = Path("~/Documents/Claude/Projects/SixiS/projects/gemini-synthesis-judge-v0-1").expanduser()
PROMPTS_DIR = PROJECT_DIR / "artifacts" / "judge_prompts"
SIXIS_PY = DASHBOARD_DIR / "scripts" / "sixis.py"


def db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "+00:00")


def fetch_poll(conn, poll_id: str):
    """Resolve a poll by full UUID or short prefix. Returns the cross_poll event row + parsed metadata."""
    candidates = conn.execute(
        "SELECT id, cycle_id, round_id, timestamp, description, metadata FROM events "
        "WHERE type='cross_poll' AND id LIKE ? ORDER BY timestamp",
        (poll_id + "%",),
    ).fetchall()
    if not candidates:
        return None, None
    if len(candidates) > 1:
        sys.stderr.write(f"warn: poll prefix {poll_id!r} matched {len(candidates)} polls; using newest\n")
    row = candidates[-1]
    meta = json.loads(row["metadata"]) if row["metadata"] else {}
    return row, meta


def fetch_brain_responses(conn, poll_id: str):
    """Return Round 2 brain responses for the poll's round, keyed by brain. Falls back to Round 1
    if Round 2 is missing for a brain."""
    poll_row, _ = fetch_poll(conn, poll_id)
    if not poll_row:
        return {}
    cycle_id = poll_row["cycle_id"]
    rows = conn.execute(
        "SELECT json_extract(metadata, '$.brain') AS brain, "
        "       json_extract(metadata, '$.round') AS round, "
        "       json_extract(metadata, '$.position') AS position, "
        "       description "
        "FROM events WHERE type='brain_response_logged' AND cycle_id=? "
        "ORDER BY timestamp",
        (cycle_id,),
    ).fetchall()
    by_brain_round = {}
    for r in rows:
        by_brain_round[(r["brain"], r["round"])] = (r["position"], r["description"])
    out = {}
    for brain in ("gpt", "deepseek", "claude"):
        for rnd in (2, 1):
            if (brain, rnd) in by_brain_round:
                position, desc = by_brain_round[(brain, rnd)]
                out[brain] = {"round": rnd, "position": position, "description": desc}
                break
    return out


def cmd_should_fire(args):
    """Cycle 2 trigger evaluator: Tier-3 mandatory-attempt + the 10 structured
    Tier-2 conditional triggers ratified in Layer B. Tier-1 always skips.
    Exit 0 = fire (with category + reason on stdout), exit 1 = skip."""
    # Imported lazily so the script still runs as a single file when triggers.py
    # is missing (e.g. in early development snapshots).
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from triggers import build_context, evaluate_triggers  # type: ignore

    conn = db()
    try:
        ctx = build_context(conn, args.poll)
        if ctx is None:
            print(f"skip: no poll matching {args.poll}", file=sys.stderr)
            return 1
        if ctx.tier == 1:
            print(f"skip: poll {ctx.poll_id[:8]} is Tier-1 — never by default per FORCED_RULE_GJ_03.",
                  file=sys.stderr)
            return 1
        hit = evaluate_triggers(ctx)
        if hit is None:
            print(f"skip: poll {ctx.poll_id[:8]} is Tier-{ctx.tier} but no conditional trigger matched.",
                  file=sys.stderr)
            return 1
        print(f"fire: {hit.category} — {hit.reason}")
        return 0
    finally:
        conn.close()


def cmd_prepare_prompt(args):
    conn = db()
    try:
        poll_row, meta = fetch_poll(conn, args.poll)
        if not poll_row:
            sys.stderr.write(f"error: no poll matching {args.poll}\n")
            return 2
        responses = fetch_brain_responses(conn, args.poll)
        # Convergence summary (if present)
        conv = conn.execute(
            "SELECT description FROM events WHERE type='convergence' AND related_event_id=? "
            "ORDER BY timestamp DESC LIMIT 1",
            (poll_row["id"],),
        ).fetchone()
        convergence_text = conv["description"] if conv else "(no convergence logged yet)"

        question = meta.get("question") or poll_row["description"]
        tier = meta.get("tier", "?")

        lines = [
            f"# Judge Prompt — Poll {poll_row['id'][:8]} (Tier-{tier})",
            "",
            "You are the Synthesis Judge for the SiXiS council. The 3-brain council "
            "(Claude, GPT, Deepseek) just converged on a ratifiable synthesis. Your job is "
            "NOT to debate; it is to AUDIT the synthesis for: (a) contradictions internal "
            "to the synthesis, (b) substantive counter-arguments raised in the deliberation "
            "that the synthesis did not address, and (c) signs of premature consensus "
            "(e.g., a weak steelman that was treated as having been steelmanned).",
            "",
            "FORCED_RULE_GJ_04 — judge-side null-on-trivial — is a real release valve, not "
            "a politeness ramp. If the synthesis is sound and the deliberation already "
            "addressed the live counter-arguments, return null. A null verdict is a "
            "correct verdict, not a failure to produce content. The mechanism degrades when "
            "you flag for the sake of flagging; flag only when there is a substantive "
            "contradiction, an unaddressed counter-argument, or premature consensus you can "
            "name with a quote. Do not hallucinate concerns. Do not soften flags into "
            "'something to monitor' — those go in REASON of a null verdict, not as flags.",
            "",
            "Output format (strict):",
            "    ## JUDGE_VERDICT: null | flag",
            "    ## REASON: <one paragraph>",
            "    ## FLAGS: (only if verdict=flag)",
            "    - {type: contradiction|unaddressed_counterargument|premature_consensus, "
            "       citation: <quote>, note: <one sentence>}",
            "",
            "---",
            "",
            f"## Question that was deliberated",
            "",
            question,
            "",
            f"## Convergence summary",
            "",
            convergence_text,
            "",
            f"## Per-brain final positions",
            "",
        ]
        for brain in ("gpt", "deepseek", "claude"):
            r = responses.get(brain)
            if not r:
                lines.append(f"### [{brain}] (no response logged)")
                lines.append("")
                continue
            lines.append(f"### [{brain}] (Round {r['round']}, position={r['position']})")
            lines.append("")
            lines.append(r["description"])
            lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("Audit the convergence above. Output verdict per the strict format.")

        prompt_text = "\n".join(lines)

        PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
        out_path = Path(args.out) if args.out else PROMPTS_DIR / f"{poll_row['id']}.md"
        out_path.write_text(prompt_text, encoding="utf-8")
        print(f"wrote {out_path} ({len(prompt_text)} chars)")
        return 0
    finally:
        conn.close()


def _log_event(event_type: str, cycle_id: str, description: str, metadata: dict, source: str = "claude"):
    """Direct SQLite insert for the three new judge_* event types. We bypass sixis.py
    event-log because it doesn't carry these types yet (Cycle 2 adds CLI surface)."""
    conn = db()
    try:
        eid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO events (id, cycle_id, type, source, timestamp, description, metadata) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (eid, cycle_id, event_type, source, now_iso(), description, json.dumps(metadata)),
        )
        conn.commit()
        return eid
    finally:
        conn.close()


def _resolve_poll_cycle(conn, poll_id: str):
    poll_row, meta = fetch_poll(conn, poll_id)
    if not poll_row:
        sys.stderr.write(f"error: no poll matching {poll_id}\n")
        sys.exit(2)
    return poll_row["id"], poll_row["cycle_id"], meta


def cmd_log_flag(args):
    conn = db()
    try:
        poll_full, cycle_id, meta = _resolve_poll_cycle(conn, args.poll)
    finally:
        conn.close()
    flags = []
    if args.flag:
        for f in args.flag:
            try:
                flags.append(json.loads(f))
            except json.JSONDecodeError:
                # accept simple "type:citation:note" format too
                parts = f.split(":", 2)
                if len(parts) == 3:
                    flags.append({"type": parts[0].strip(), "citation": parts[1].strip(), "note": parts[2].strip()})
                else:
                    sys.stderr.write(f"warn: skipping malformed --flag {f!r}\n")
    metadata = {
        "poll_id": poll_full,
        "ratification_tier": meta.get("tier"),
        "trigger_category": args.trigger or ("tier_3_mandatory" if meta.get("tier") == 3 else "manual"),
        "flags": flags,
        "relay_duration_ms": args.relay_ms,
        "response_chars": args.response_chars,
        "gemini_chat_url": args.chat_url,
    }
    short = poll_full[:8]
    desc = (
        f"Judge flagged {len(flags)} concern(s) on poll {short}: "
        + "; ".join(f"{f.get('type')}—{f.get('note')}" for f in flags) if flags
        else f"Judge flagged the convergence on poll {short} (count={len(flags)})"
    )
    eid = _log_event("judge_flag", cycle_id, desc, metadata)
    print(f"logged judge_flag {eid[:8]} on poll {short}")


def cmd_log_attempted(args):
    conn = db()
    try:
        poll_full, cycle_id, meta = _resolve_poll_cycle(conn, args.poll)
    finally:
        conn.close()
    metadata = {
        "poll_id": poll_full,
        "ratification_tier": meta.get("tier"),
        "trigger_category": args.trigger or ("tier_3_mandatory" if meta.get("tier") == 3 else "manual"),
        "null_reason": args.reason,
        "relay_duration_ms": args.relay_ms,
        "response_chars": args.response_chars,
        "gemini_chat_url": args.chat_url,
    }
    desc = (
        f"Judge fired on poll {poll_full[:8]} and returned null per "
        f"FORCED_RULE_GJ_04 (judge-side null-on-trivial). Reason: {args.reason}"
    )
    eid = _log_event("judge_attempted", cycle_id, desc, metadata)
    print(f"logged judge_attempted {eid[:8]} on poll {poll_full[:8]}")


def cmd_log_unavailable(args):
    conn = db()
    try:
        poll_full, cycle_id, meta = _resolve_poll_cycle(conn, args.poll)
    finally:
        conn.close()
    metadata = {
        "poll_id": poll_full,
        "ratification_tier": meta.get("tier"),
        "trigger_category": args.trigger or ("tier_3_mandatory" if meta.get("tier") == 3 else "manual"),
        "failure_reason": args.reason,
        "relay_duration_ms": args.relay_ms,
    }
    desc = (
        f"Judge relay attempted on poll {poll_full[:8]} but Gemini was unavailable: "
        f"{args.reason}. Ratification proceeded without Judge input per "
        f"FORCED_RULE_GJ_02 (graceful skip)."
    )
    eid = _log_event("judge_unavailable", cycle_id, desc, metadata)
    print(f"logged judge_unavailable {eid[:8]} on poll {poll_full[:8]}")


def cmd_stats(args):
    """6-month review telemetry per FORCED_RULE_GJ_05. Reads substrate and
    prints four metric blocks: (a) wall-clock relay overhead per session,
    (b) flag-acted-upon ratio, (c) trigger-inflation evidence (have new
    triggers been added; what fraction of Tier-2 ratifications fire the
    Judge), (d) delegation-creep evidence (Tier-3 ratifications where the
    Judge did NOT fire when it should have). Output is plain text — the
    dashboard surfaces the same numbers via data.json events."""
    conn = db()
    try:
        # All judge_* events
        rows = conn.execute(
            "SELECT type, timestamp, metadata FROM events "
            "WHERE type IN ('judge_flag','judge_attempted','judge_unavailable') "
            "ORDER BY timestamp"
        ).fetchall()
        events = []
        for r in rows:
            try:
                m = json.loads(r["metadata"]) if r["metadata"] else {}
            except json.JSONDecodeError:
                m = {}
            events.append({"type": r["type"], "ts": r["timestamp"], "meta": m})

        # (a) Overhead — sum/avg of relay_duration_ms across firings.
        durations = [e["meta"].get("relay_duration_ms") for e in events
                     if isinstance(e["meta"].get("relay_duration_ms"), (int, float))]
        # Group durations by day to give a per-session proxy.
        by_day: dict = {}
        for e in events:
            d = (e["ts"] or "")[:10]
            by_day.setdefault(d, []).append(e["meta"].get("relay_duration_ms") or 0)
        avg_ms = (sum(durations) / len(durations)) if durations else 0
        max_day = max(((d, sum(v)) for d, v in by_day.items()), key=lambda x: x[1], default=("-", 0))

        # (b) Flag-acted-upon ratio — counts only.
        flag_count = sum(1 for e in events if e["type"] == "judge_flag")
        attempt_count = sum(1 for e in events if e["type"] == "judge_attempted")
        unavail_count = sum(1 for e in events if e["type"] == "judge_unavailable")
        # "Acted upon" requires a follow-up event tied back to a Judge flag —
        # v0.1 doesn't track that link explicitly. Surfaced as "tracking TBD".
        acted_upon_known = "tracking not yet wired (Phase 2 — needs flag→follow-up event link)"

        # (c) Trigger-inflation evidence — count distinct trigger_category values
        # observed and which ones fire most. If the spread widens beyond the 11
        # ratified categories, that's evidence of inflation.
        trigger_counts: dict = {}
        for e in events:
            t = e["meta"].get("trigger_category") or "unknown"
            trigger_counts[t] = trigger_counts.get(t, 0) + 1

        # (d) Delegation-creep — Tier-3 ratifications WITHOUT a corresponding
        # judge event. Approximation: count distinct convergence events at
        # Tier-3 vs distinct judge events at Tier-3.
        tier3_polls = conn.execute(
            "SELECT id FROM events WHERE type='cross_poll' AND json_extract(metadata,'$.tier')=3"
        ).fetchall()
        tier3_poll_ids = {r["id"] for r in tier3_polls}
        tier3_judged = {e["meta"].get("poll_id") for e in events
                        if e["meta"].get("ratification_tier") == 3}
        creep = tier3_poll_ids - tier3_judged

        out = []
        out.append("=== Gemini Synthesis Judge v0.1 — 6mo review telemetry ===\n")
        out.append(f"events observed: judge_flag={flag_count} · judge_attempted={attempt_count} · judge_unavailable={unavail_count}")
        out.append("")
        out.append("(a) Wall-clock overhead")
        out.append(f"    avg relay duration: {avg_ms:,.0f} ms across {len(durations)} timed firings")
        out.append(f"    busiest day: {max_day[0]} ({max_day[1]:,} ms total)")
        out.append("")
        out.append("(b) Flag-acted-upon ratio")
        out.append(f"    {acted_upon_known}")
        out.append("")
        out.append("(c) Trigger-inflation evidence")
        if trigger_counts:
            for t, n in sorted(trigger_counts.items(), key=lambda x: -x[1]):
                out.append(f"    {t}: {n}")
        else:
            out.append("    (no firings yet)")
        out.append("")
        out.append("(d) Delegation-creep evidence")
        out.append(f"    Tier-3 polls without a matching judge_* event: {len(creep)} of {len(tier3_poll_ids)}")
        if creep:
            out.append("    (partial — first 5 short ids: " +
                       ", ".join(sorted(p[:8] for p in list(creep)[:5])) + ")")
        out.append("")
        out.append("=== end ===")
        print("\n".join(out))
        return 0
    finally:
        conn.close()


def main():
    p = argparse.ArgumentParser(prog="judge", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("should-fire", help="Cycle 1 trigger check (Tier-3 only)")
    s.add_argument("--poll", required=True, help="Poll id or short prefix")
    s.set_defaults(func=cmd_should_fire)

    s = sub.add_parser("prepare-prompt", help="Build Judge prompt from substrate")
    s.add_argument("--poll", required=True)
    s.add_argument("--out", help="Output path (default: artifacts/judge_prompts/<poll>.md)")
    s.set_defaults(func=cmd_prepare_prompt)

    s = sub.add_parser("log-flag", help="Log a judge_flag event")
    s.add_argument("--poll", required=True)
    s.add_argument("--trigger", help="Trigger category (default: derived from tier)")
    s.add_argument("--flag", action="append",
                   help="JSON {type,citation,note} or 'type:citation:note'. Repeatable.")
    s.add_argument("--relay-ms", type=int, default=None)
    s.add_argument("--response-chars", type=int, default=None)
    s.add_argument("--chat-url", default=None)
    s.set_defaults(func=cmd_log_flag)

    s = sub.add_parser("log-attempted", help="Log a judge_attempted (null-on-trivial) event")
    s.add_argument("--poll", required=True)
    s.add_argument("--trigger", help="Trigger category")
    s.add_argument("--reason", required=True, help="Why the Judge returned null")
    s.add_argument("--relay-ms", type=int, default=None)
    s.add_argument("--response-chars", type=int, default=None)
    s.add_argument("--chat-url", default=None)
    s.set_defaults(func=cmd_log_attempted)

    s = sub.add_parser("log-unavailable", help="Log a judge_unavailable event")
    s.add_argument("--poll", required=True)
    s.add_argument("--trigger", help="Trigger category")
    s.add_argument("--reason", required=True, help="Failure mode")
    s.add_argument("--relay-ms", type=int, default=None)
    s.set_defaults(func=cmd_log_unavailable)

    s = sub.add_parser("stats", help="6mo review telemetry (FORCED_RULE_GJ_05)")
    s.set_defaults(func=cmd_stats)

    args = p.parse_args()
    rc = args.func(args)
    sys.exit(rc if isinstance(rc, int) else 0)


if __name__ == "__main__":
    main()
