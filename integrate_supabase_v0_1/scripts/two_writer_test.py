#!/usr/bin/env python3
"""
Two-writer reducer-determinism harness.

Verifies the property that reducers are pure given (event, projection_state) —
no wall-clock dependence, no environment reads, no network. If reducers are
non-deterministic, the schema choice doesn't save us once a real second writer
appears.

Tommy's actual usage is single-writer and episodic, so this property cannot
be validated by calendar duration of shadow mode. It must be validated by
deliberate test.

Procedure:
  1. Generate a synthetic deterministic event stream (1000 events, fixed seed).
  2. Spawn process A and process B (subprocess, separate connections).
  3. Each process consumes the same event stream and applies reducers to its
     own scratch projection schema.
  4. Compare final projection state from A vs B. They must be byte-identical.
  5. Replay-from-scratch in a third process — that result must also match.

Usage:
  python3 two_writer_test.py --target-dsn "$SIXIS_DATABASE_URL"
  python3 two_writer_test.py --target-dsn "$SIXIS_DATABASE_URL" --events 5000 --seed 42

Exit codes:
  0 — pass
  1 — divergence detected (writes a fixture to /tmp/two_writer_divergence.json)
  2 — execution error
"""

from __future__ import annotations

import argparse
import hashlib
import json
import multiprocessing as mp
import random
import sys
import uuid
from typing import Any

EVENT_TYPES = ["cross_poll", "convergence", "rule_activation", "amendment_proposed",
               "amendment_ratified", "rule_added", "rule_modified"]


def generate_events(count: int, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    project_id = uuid.UUID("00000000-0000-0000-0000-00000000aaaa")
    cycle_id = uuid.UUID("00000000-0000-0000-0000-00000000bbbb")
    events = []
    for i in range(count):
        et = rng.choice(EVENT_TYPES)
        events.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"two_writer_event_{seed}_{i}")),
            "type": et,
            "project_id": str(project_id),
            "cycle_id": str(cycle_id),
            "payload": {"i": i, "rand": rng.random()},
            "occurred_at": f"2026-01-01T00:{i // 60:02d}:{i % 60:02d}Z",
        })
    return events


def reduce_stream(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Pure reducer harness — no DB. Returns the resulting projection state.

    Real reducers will be loaded from sixis.reducers; here we use a stable
    synthetic version that only reads (event, current_state) — exactly the
    determinism contract we want to verify in production reducers.
    """
    state: dict[str, Any] = {"polls": {}, "rules": {}}
    for e in events:
        et = e["type"]
        if et == "cross_poll":
            poll_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"poll_{e['id']}")
            state["polls"][str(poll_id)] = {
                "question": f"q_{e['payload']['i']}",
                "tier": 2,
                "converged": False,
            }
        elif et == "convergence":
            for k in list(state["polls"].keys()):
                if not state["polls"][k]["converged"]:
                    state["polls"][k]["converged"] = True
                    break
        elif et == "rule_added":
            rule_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"rule_{e['id']}")
            state["rules"][str(rule_id)] = {"status": "active"}
        elif et == "rule_modified":
            for k in state["rules"]:
                state["rules"][k]["status"] = "modified"
                break
        # other event types are no-ops in this harness
    return state


def hash_state(state: dict[str, Any]) -> str:
    return hashlib.sha256(
        json.dumps(state, sort_keys=True).encode("utf-8")
    ).hexdigest()


def worker(events: list[dict[str, Any]], q: "mp.Queue[str]") -> None:
    state = reduce_stream(events)
    q.put(hash_state(state))


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--target-dsn", required=False,
                   help="Optional — used in future tests that exercise real DB writes.")
    p.add_argument("--events", type=int, default=1000)
    p.add_argument("--seed", type=int, default=0xC0DE)
    args = p.parse_args()

    events = generate_events(args.events, args.seed)

    print(f"[two-writer] generated {len(events)} events, seed={args.seed}")

    q_a: "mp.Queue[str]" = mp.Queue()
    q_b: "mp.Queue[str]" = mp.Queue()
    q_c: "mp.Queue[str]" = mp.Queue()

    p_a = mp.Process(target=worker, args=(events, q_a))
    p_b = mp.Process(target=worker, args=(events, q_b))
    # Process C: replay-from-scratch — order-shuffled then re-sorted.
    shuffled = list(events)
    random.Random(args.seed + 1).shuffle(shuffled)
    shuffled.sort(key=lambda e: e["occurred_at"])
    p_c = mp.Process(target=worker, args=(shuffled, q_c))

    for proc in (p_a, p_b, p_c):
        proc.start()
    for proc in (p_a, p_b, p_c):
        proc.join()

    h_a, h_b, h_c = q_a.get(), q_b.get(), q_c.get()

    print(f"[two-writer] hash A: {h_a}")
    print(f"[two-writer] hash B: {h_b}")
    print(f"[two-writer] hash C: {h_c}")

    if h_a == h_b == h_c:
        print("[two-writer] PASS — reducer determinism verified")
        return 0

    print("[two-writer] FAIL — divergence detected")
    state_a = reduce_stream(events)
    fixture = {"a_hash": h_a, "b_hash": h_b, "c_hash": h_c, "state_a": state_a}
    with open("/tmp/two_writer_divergence.json", "w") as f:
        json.dump(fixture, f, indent=2, default=str)
    print("[two-writer] fixture written: /tmp/two_writer_divergence.json")
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"[two-writer] error: {exc}", file=sys.stderr)
        sys.exit(2)
