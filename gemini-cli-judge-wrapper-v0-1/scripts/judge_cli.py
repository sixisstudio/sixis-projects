#!/usr/bin/env python3
"""Gemini CLI Judge Wrapper v0.1 — local CLI replacement for the browser relay.

Replaces the manual Chrome-MCP path to gemini.google.com with shell-out to the
official Gemini CLI. Implements FORCED_RULE_JW_01..05:

  JW_01  wrapper-owned deterministic substrate scope (no orchestrator curation)
  JW_02  protocol_corpus_hash cache-bust on every invocation
  JW_03  corpus_hash + scope metadata on every audit event
  JW_04  zero-hallucination directive + --approval-mode plan + tool-call rejection
  JW_05  4-tier persistence: replay-cold-start, native-steady-state, fresh-corpus
         authority, hash cache-bust

Substrate event writes are routed through the dashboard repo's sixis.py CLI.

Subcommands:
  audit       Run a Judge audit. --scope full|cycle:<id>|chain:<id>|window:<type>,<n>.
  status      Print current ~/.sixis/judge/ state (hash, session, mechanism).
  reset       Force cache-bust manually (debug-only, logged).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ----- Paths -----
SIXIS_ROOT       = Path("~/Documents/Claude/Projects/SixiS").expanduser()
DASHBOARD_DIR    = SIXIS_ROOT / "projects" / "dashboard_v0_1"
DB_PATH          = DASHBOARD_DIR / "sixis_dashboard.db"
SIXIS_PY         = DASHBOARD_DIR / "scripts" / "sixis.py"
PROJECT_DIR      = SIXIS_ROOT / "projects" / "gemini-cli-judge-wrapper-v0-1"
ARTIFACTS_DIR    = PROJECT_DIR / "artifacts"

JUDGE_STATE_DIR  = Path("~/.sixis/judge").expanduser()
STATE_FILE       = JUDGE_STATE_DIR / "state.json"
ARCHIVE_DIR      = JUDGE_STATE_DIR / "archive"
TRANSCRIPT_DIR   = JUDGE_STATE_DIR / "transcripts"

GEMINI_BIN       = Path("~/.npm-global/bin/gemini").expanduser()

PROTOCOL_FILES = [
    SIXIS_ROOT / "SiXiS_Protocol_v1.0md.md",
    SIXIS_ROOT / "Universal_Shell_v1.0.md",
    SIXIS_ROOT / "Cycle_Zero_v1.1.md",
    SIXIS_ROOT / "Archetype_Library_v1.0.md",
]

ZERO_HALLUCINATION_DIRECTIVE = (
    "You are operating in audit-only mode. You may only evaluate the corpus bundle "
    "provided in this prompt. You must not claim to have read files, queried "
    "databases, used shell tools, browsed the web, inspected Gemini history, or "
    "accessed substrate state unless that content is explicitly included in the "
    "corpus bundle. If evidence is required but missing, output "
    "`insufficient-evidence: <what is missing>` rather than inferring. Do not "
    "simulate tool outputs. The fresh corpus bundle in this prompt overrides all "
    "prior persistent memory."
)

OUTPUT_FORMAT_SPEC = (
    "OUTPUT FORMAT (REQUIRED): Respond with a single JSON object, no text "
    "outside the JSON block.\n"
    "{\n"
    '  "verdict": "clear" | "flag" | "insufficient_evidence",\n'
    '  "summary": "<one paragraph>",\n'
    '  "flags": [ {"type": "contradiction"|"premature_consensus"|"unaddressed_counterargument"|"drift"|"missing_scope"|"other", "severity": "low"|"medium"|"high", "citation": "<verbatim quote from corpus>", "note": "<one sentence>", "recommended_next_step": "<one sentence>"} ],\n'
    '  "confidence": "low" | "medium" | "high"\n'
    "}\n"
    "If verdict is `clear`, flags must be []. If `flag`, list every concern. "
    "If `insufficient_evidence`, list what is missing in `summary`."
)


# ----- Helpers -----

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def canonical_json(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


# ----- Corpus assembly -----

def _load_protocol_files() -> str:
    parts = []
    for p in PROTOCOL_FILES:
        if not p.exists():
            parts.append(f"\n=== MISSING FILE: {p.name} ===\n")
            continue
        parts.append(f"\n=== FILE: {p.name} ===\n")
        parts.append(p.read_text(encoding="utf-8"))
    return "".join(parts)


def _load_rules_from_substrate() -> str:
    conn = db()
    try:
        rows = conn.execute(
            "SELECT kind, stable_id, rule_name, description, status, added_in_version "
            "FROM rules WHERE status IN ('active','universal','candidate_universal','modified') "
            "ORDER BY kind, stable_id"
        ).fetchall()
    finally:
        conn.close()
    parts = ["\n=== SUBSTRATE RULES (kind | stable_id | name | version) ===\n"]
    for r in rows:
        parts.append(f"\n## [{r['kind']}] {r['stable_id']} — {r['rule_name']} (v{r['added_in_version']})\n")
        parts.append((r["description"] or "").strip())
        parts.append("\n")
    return "".join(parts)


def _load_amendments_from_substrate() -> str:
    conn = db()
    try:
        rows = conn.execute(
            "SELECT id, target_layer, target_version, proposal_summary, rationale, ratified_at "
            "FROM amendments WHERE status='ratified' "
            "ORDER BY ratified_at"
        ).fetchall()
    finally:
        conn.close()
    parts = ["\n=== RATIFIED AMENDMENTS ===\n"]
    for r in rows:
        parts.append(f"\n## amendment {r['id'][:8]} ({r['target_layer']} → {r['target_version']}, ratified {r['ratified_at']})\n")
        parts.append((r["proposal_summary"] or "").strip())
        if r["rationale"]:
            parts.append("\nRationale: " + r["rationale"].strip())
        parts.append("\n")
    return "".join(parts)


def _load_layer_b() -> str:
    parts = ["\n=== LAYER B RULES (per-project) ===\n"]
    for proj_dir in sorted((SIXIS_ROOT / "projects").iterdir()):
        if not proj_dir.is_dir():
            continue
        layer_b_dir = proj_dir / "layer_b"
        if not layer_b_dir.exists():
            continue
        for md in sorted(layer_b_dir.glob("*.md")):
            parts.append(f"\n## [{proj_dir.name}] {md.name}\n")
            parts.append(md.read_text(encoding="utf-8"))
            parts.append("\n")
    return "".join(parts)


def build_base_corpus() -> tuple[str, str]:
    """Return (corpus_text, protocol_corpus_hash). Hash is the cache-bust trigger."""
    parts = [
        _load_protocol_files(),
        _load_rules_from_substrate(),
        _load_amendments_from_substrate(),
        _load_layer_b(),
    ]
    corpus = "".join(parts)
    protocol_hash = sha256_hex(corpus)
    return corpus, protocol_hash


# ----- Operational scope (FORCED_RULE_JW_01) -----

SCOPE_RE = re.compile(r"^(full|cycle:[0-9a-f-]+|chain:[0-9a-f-]+|window:[a-z_]+,\d+)$", re.IGNORECASE)


def _scope_query(scope: str):
    """Return (label, sql, params) for a scope spec. Wrapper executes the query;
    orchestrator cannot supply explicit event lists (FORCED_RULE_JW_01)."""
    if scope == "full":
        return ("full", None, None)
    if scope.startswith("cycle:"):
        cid = scope.split(":", 1)[1]
        return ("cycle", "SELECT id, type, timestamp, source, description FROM events "
                         "WHERE cycle_id=? ORDER BY timestamp ASC", (cid,))
    if scope.startswith("chain:"):
        eid = scope.split(":", 1)[1]
        return ("chain", "WITH RECURSIVE chain(id,type,timestamp,source,description,depth) AS ("
                         " SELECT id,type,timestamp,source,description,0 FROM events WHERE id=?"
                         " UNION ALL"
                         " SELECT e.id,e.type,e.timestamp,e.source,e.description,c.depth+1 "
                         " FROM events e JOIN chain c ON e.related_event_id=c.id) "
                         "SELECT id,type,timestamp,source,description FROM chain ORDER BY depth, timestamp", (eid,))
    if scope.startswith("window:"):
        rest = scope.split(":", 1)[1]
        etype, n = rest.split(",")
        return ("window", "SELECT id,type,timestamp,source,description FROM events "
                          "WHERE type=? ORDER BY timestamp DESC LIMIT ?", (etype, int(n)))
    raise ValueError(f"invalid scope: {scope}")


def fetch_operational_excerpt(scope: str) -> tuple[str, dict]:
    if not SCOPE_RE.match(scope):
        raise ValueError(f"scope must match {SCOPE_RE.pattern}, got {scope!r}")
    label, sql, params = _scope_query(scope)
    if label == "full":
        return "", {"scope_mode": "full", "scope_id": None, "scope_event_count": 0,
                    "scope_event_ids_hash": sha256_hex("")}
    conn = db()
    try:
        rows = conn.execute(sql, params).fetchall()
    finally:
        conn.close()
    parts = [f"\n=== OPERATIONAL EXCERPT (scope={scope}, n={len(rows)}) ===\n"]
    ids = []
    for r in rows:
        ids.append(r["id"])
        parts.append(f"\n[{r['timestamp']}] {r['type']} ({r['source']}) {r['id'][:8]}\n")
        parts.append((r["description"] or "").strip())
        parts.append("\n")
    text = "".join(parts)
    sid = scope.split(":", 1)[1] if ":" in scope else None
    return text, {
        "scope_mode": label,
        "scope_id": sid,
        "scope_event_count": len(rows),
        "scope_event_ids_hash": sha256_hex(canonical_json(sorted(ids))),
        "scope_query_sql": sql,
    }


# ----- Persistence + cache-bust (FORCED_RULE_JW_02 / JW_05) -----

def load_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(state: dict) -> None:
    JUDGE_STATE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(canonical_json(state), encoding="utf-8")


def archive_session(state: dict) -> Path:
    old_hash = state.get("protocol_corpus_hash", "unknown")
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = ARCHIVE_DIR / old_hash[:12] / ts
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "state.json").write_text(canonical_json(state), encoding="utf-8")
    transcript = TRANSCRIPT_DIR / f"{old_hash[:12]}.jsonl"
    if transcript.exists():
        transcript.rename(dest / transcript.name)
    return dest


def maybe_cache_bust(protocol_hash: str, state: dict) -> tuple[dict, bool]:
    """If protocol_hash changed since last successful audit, archive + reset state.
    Returns (new_state, did_bust)."""
    if state.get("protocol_corpus_hash") == protocol_hash:
        return state, False
    if state:
        archive_session(state)
    new_state = {
        "protocol_corpus_hash": protocol_hash,
        "session_id": str(uuid.uuid4()),
        "transcript_path": str(TRANSCRIPT_DIR / f"{protocol_hash[:12]}.jsonl"),
        "mechanism": "replay",
        "native_canary_passed": False,
        "created_at": now_iso(),
        "audit_count": 0,
    }
    return new_state, True


# ----- Transcript replay (FORCED_RULE_JW_05 cold-start layer) -----

def append_transcript(state: dict, prompt: str, response: str, meta: dict) -> None:
    TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    path = Path(state["transcript_path"])
    entry = {"ts": now_iso(), "prompt": prompt, "response": response, "meta": meta}
    with path.open("a", encoding="utf-8") as f:
        f.write(canonical_json(entry) + "\n")


def load_transcript(state: dict, max_entries: int = 5) -> str:
    path = Path(state.get("transcript_path", ""))
    if not path or not path.exists():
        return ""
    lines = path.read_text(encoding="utf-8").splitlines()
    recent = lines[-max_entries:]
    if not recent:
        return ""
    parts = ["\n=== PRIOR AUDIT HISTORY (informational; fresh corpus governs) ===\n"]
    for line in recent:
        try:
            entry = json.loads(line)
        except Exception:
            continue
        parts.append(f"\n--- prior audit @ {entry.get('ts','?')}\n")
        parts.append("Q: " + (entry.get("prompt", "")[:1500]) + "\n")
        parts.append("A: " + (entry.get("response", "")[:1500]) + "\n")
    parts.append("\n=== END PRIOR HISTORY ===\n")
    return "".join(parts)


# ----- Tool-call rejection (FORCED_RULE_JW_04) -----

TOOL_CALL_PATTERNS = [
    re.compile(r"<tool_call\b", re.IGNORECASE),
    re.compile(r"```\s*tool_code", re.IGNORECASE),
    re.compile(r'"function_call"\s*:', re.IGNORECASE),
    re.compile(r"^\s*call_tool\s*\(", re.IGNORECASE | re.MULTILINE),
]


def looks_like_tool_call(response: str) -> bool:
    for pat in TOOL_CALL_PATTERNS:
        if pat.search(response):
            return True
    return False


# ----- Audit prompt -----

def build_audit_prompt(corpus: str, op_excerpt: str, query: str) -> str:
    return "\n".join([
        "[SIXIS JUDGE AUDIT]",
        "",
        ZERO_HALLUCINATION_DIRECTIVE,
        "",
        "=== CORPUS BUNDLE (canonical, current protocol) ===",
        corpus,
        op_excerpt,
        "",
        "=== AUDIT QUERY ===",
        query,
        "",
        OUTPUT_FORMAT_SPEC,
    ])


# ----- Gemini CLI invocation -----

def invoke_gemini(prompt: str, session_id: str, timeout: int = 300) -> tuple[str, dict]:
    """Run gemini -p with read-only approval, structured output, native session id."""
    if not GEMINI_BIN.exists():
        raise FileNotFoundError(f"gemini CLI not found at {GEMINI_BIN}")
    cmd = [
        str(GEMINI_BIN),
        "-p", prompt,
        "--approval-mode", "plan",
        "--session-id", session_id,
        "--output-format", "json",
        "--skip-trust",
    ]
    env = os.environ.copy()
    env["GOOGLE_GENAI_USE_GCA"] = "true"
    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
    dur_ms = int((time.time() - t0) * 1000)
    return proc.stdout, {
        "exit_code": proc.returncode,
        "stderr": proc.stderr,
        "duration_ms": dur_ms,
        "cmd": cmd[:1] + cmd[1:3] + cmd[4:],  # omit prompt body from log
    }


def parse_response(stdout: str) -> tuple[dict, str]:
    """Try to parse the gemini --output-format json envelope, then extract the
    nested JSON our prompt asked for. Falls back to {verdict: parse_error}."""
    raw_text = stdout.strip()
    inner_text = raw_text
    try:
        envelope = json.loads(raw_text)
        if isinstance(envelope, dict) and "response" in envelope:
            inner_text = envelope["response"].strip()
        elif isinstance(envelope, dict) and "verdict" in envelope:
            return envelope, raw_text
    except Exception:
        pass
    json_match = re.search(r"\{[\s\S]*\}", inner_text)
    if json_match:
        try:
            obj = json.loads(json_match.group(0))
            if isinstance(obj, dict) and "verdict" in obj:
                return obj, raw_text
        except Exception:
            pass
    return {
        "verdict": "parse_error",
        "summary": "wrapper failed to extract structured JSON from response",
        "flags": [],
        "confidence": "low",
        "raw_inner": inner_text[:4000],
    }, raw_text


# ----- Substrate write -----

def log_audit_event(event_type: str, cycle_id: str, description: str, metadata: dict) -> str:
    """Insert a judge_* event directly into substrate (sixis.py CLI doesn't
    support these types). Returns event id."""
    eid = str(uuid.uuid4())
    conn = db()
    try:
        conn.execute(
            "INSERT INTO events (id, cycle_id, type, source, timestamp, description, metadata) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (eid, cycle_id, event_type, "claude", now_iso(), description, canonical_json(metadata)),
        )
        conn.commit()
    finally:
        conn.close()
    return eid


# ----- Subcommands -----

def cmd_audit(args):
    corpus, protocol_hash = build_base_corpus()
    op_excerpt, scope_meta = fetch_operational_excerpt(args.scope)

    state = load_state()
    state, did_bust = maybe_cache_bust(protocol_hash, state)

    transcript_replay = "" if did_bust else load_transcript(state)
    full_corpus = transcript_replay + corpus + op_excerpt
    prompt = build_audit_prompt(corpus, op_excerpt + ("\n" + transcript_replay if transcript_replay else ""), args.query)

    print(f"[judge] protocol_corpus_hash={protocol_hash[:12]} session={state['session_id'][:8]} "
          f"scope={args.scope} cache_bust={did_bust}", file=sys.stderr)

    stdout, meta = invoke_gemini(prompt, state["session_id"], timeout=args.timeout)
    verdict_obj, raw = parse_response(stdout)

    if looks_like_tool_call(raw):
        verdict_obj = {
            "verdict": "judge_unavailable",
            "summary": "response contained tool-call signatures; rejected per FORCED_RULE_JW_04",
            "flags": [],
            "confidence": "low",
        }
        meta["rejected_reason"] = "tool_call_detected"

    corpus_hash = sha256_hex(corpus + canonical_json(scope_meta))
    payload = {
        "verdict": verdict_obj.get("verdict"),
        "summary": verdict_obj.get("summary"),
        "flags": verdict_obj.get("flags", []),
        "confidence": verdict_obj.get("confidence"),
        "corpus_hash": corpus_hash,
        "protocol_corpus_hash": protocol_hash,
        "base_corpus_version": protocol_hash[:12],
        "session_id": state["session_id"],
        "mechanism": state.get("mechanism", "replay"),
        "cache_bust_fired": did_bust,
        "scope": args.scope,
        **scope_meta,
        "gemini_meta": meta,
    }
    if args.cycle:
        payload["audit_cycle_id"] = args.cycle

    cycle_for_event = args.cycle or "37245c60-914e-443b-bede-66a36fe09099"  # wizard cycle default
    desc_short = (verdict_obj.get("summary") or "").strip().splitlines()[0][:240]
    event_type = {
        "clear": "judge_attempted",
        "flag": "judge_flag",
        "insufficient_evidence": "judge_attempted",
        "parse_error": "judge_unavailable",
        "judge_unavailable": "judge_unavailable",
    }.get(verdict_obj.get("verdict"), "judge_attempted")
    description = f"Gemini CLI Judge audit (scope={args.scope}, verdict={payload['verdict']}): {desc_short}"

    eid = log_audit_event(event_type, cycle_for_event, description, payload)
    append_transcript(state, prompt, raw, payload)

    state["audit_count"] = state.get("audit_count", 0) + 1
    state["last_audit_at"] = now_iso()
    state["last_event_id"] = eid
    save_state(state)

    out_dir = ARTIFACTS_DIR / "audits"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{eid}.json").write_text(canonical_json(payload), encoding="utf-8")
    (out_dir / f"{eid}.raw.txt").write_text(raw, encoding="utf-8")

    print(f"[judge] verdict={payload['verdict']} flags={len(payload['flags'])} "
          f"event_id={eid} duration_ms={meta['duration_ms']}")
    return 0


def cmd_status(args):
    _, protocol_hash = build_base_corpus()
    state = load_state()
    out = {
        "current_protocol_corpus_hash": protocol_hash[:12],
        "stored_protocol_corpus_hash": (state.get("protocol_corpus_hash") or "")[:12],
        "would_cache_bust_on_next_audit": state.get("protocol_corpus_hash") != protocol_hash,
        "session_id": state.get("session_id"),
        "mechanism": state.get("mechanism"),
        "audit_count": state.get("audit_count", 0),
        "last_audit_at": state.get("last_audit_at"),
        "transcript_path": state.get("transcript_path"),
    }
    print(json.dumps(out, indent=2))
    return 0


def cmd_reset(args):
    state = load_state()
    if state:
        archive_path = archive_session(state)
        print(f"archived prior session to {archive_path}", file=sys.stderr)
    save_state({})
    print("state cleared; next audit will start a fresh session.")
    return 0


def main():
    p = argparse.ArgumentParser(prog="judge_cli", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("audit", help="Run a Judge audit via Gemini CLI")
    s.add_argument("--scope", required=True,
                   help="full | cycle:<id> | chain:<event_id> | window:<event_type>,<count>")
    s.add_argument("--query", required=True, help="Audit question for the Judge")
    s.add_argument("--cycle", help="Substrate cycle_id to anchor the audit event "
                                    "(defaults to wizard cycle)")
    s.add_argument("--timeout", type=int, default=300)
    s.set_defaults(func=cmd_audit)

    s = sub.add_parser("status", help="Inspect ~/.sixis/judge/ state")
    s.set_defaults(func=cmd_status)

    s = sub.add_parser("reset", help="Force cache-bust (debug-only, archives prior session)")
    s.set_defaults(func=cmd_reset)

    args = p.parse_args()
    rc = args.func(args)
    sys.exit(rc if isinstance(rc, int) else 0)


if __name__ == "__main__":
    main()
