from __future__ import annotations

"""DeepSeek v4 API client with retry, timeout, and substrate event logging.

Council-ratified design (cross-poll 3650ceb3, Round 1 + Round 2 unanimous):
- Model: `deepseek-reasoner` (preserves Expert-mode reasoning parity).
- Retry: 3 attempts, exponential backoff (1s → 2s → 4s), 15s per-attempt timeout.
- Key: `DEEPSEEK_API_KEY` env var only — never substrate, never logs, never CLI args.
- Logging hygiene (GPT R2 refinement): sanitized error class + HTTP status only.
  Never log raw request/response bodies (may carry prompt context).
- Failure cascade (DeepSeek R2 refinement):
    preamble failure → per-poll context (already handled in preamble.get_or_build)
    API failure → fallback_to_browser event + browser fallback signal.
"""

import json
import os
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import preamble as preamble_mod

DASHBOARD_ROOT = Path("~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1").expanduser()
SUPABASE_ENV_PATH = Path(
    "~/Documents/Claude/Projects/SixiS/projects/integrate_supabase_v0_1/.env"
).expanduser()


def _load_supabase_env() -> None:
    """Idempotent lazy-load of SIXIS_DATABASE_URL from the canonical .env file
    so callers don't need to pre-source it.  Mirrors sixis.py's helper."""
    if os.environ.get("SIXIS_DATABASE_URL"):
        return
    if not SUPABASE_ENV_PATH.exists():
        return
    try:
        for raw in SUPABASE_ENV_PATH.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())
    except Exception:
        pass


def _pg_conn():
    """Open a psycopg connection to the canonical Supabase events store.
    Phase B step 4 (2026-05-11) migration target: substrate logging writes
    here directly, never to local SQLite (which is an archive)."""
    _load_supabase_env()
    dsn = os.environ.get("SIXIS_DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "SIXIS_DATABASE_URL not set; cannot log DeepSeek relay events. "
            "Source from integrate_supabase_v0_1/.env or set the env var."
        )
    import psycopg  # type: ignore
    return psycopg.connect(dsn)


def _cycle_id_for_project(project_id: str) -> str:
    """Resolve the most-recent in-progress cycle for a project from Supabase.
    Phase B step 4 (2026-05-11): reads canonical Supabase, not local SQLite."""
    with _pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id::text FROM cycles WHERE project_id = %s::uuid
                   ORDER BY (outcome IS NULL OR outcome = 'in_progress') DESC,
                            started_at DESC
                   LIMIT 1""",
                (project_id,),
            )
            row = cur.fetchone()
    if not row:
        raise RuntimeError(f"No cycle found for project {project_id}")
    return row[0]

API_URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-reasoner"

RETRY_BACKOFFS = (1, 2, 4)  # seconds
PER_ATTEMPT_TIMEOUT = 180  # seconds — deepseek-reasoner can take 60-120s on complex prompts; bumped from 15s 2026-05-09 after BROWSER_RELAY_REQUIRED on Cowork integration cross-poll


class DeepSeekAPIError(Exception):
    """Raised after retries exhausted. Carries sanitized error class only."""

    def __init__(self, error_class: str, status: int | None, attempts: int):
        super().__init__(f"{error_class} (status={status}, attempts={attempts})")
        self.error_class = error_class
        self.status = status
        self.attempts = attempts


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _api_key() -> str:
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise RuntimeError(
            "DEEPSEEK_API_KEY env var not set. "
            "Per council ratification (cross-poll 3650ceb3) the key must come "
            "from environment ONLY — never CLI args, substrate, or logs."
        )
    return key


def _operator() -> str:
    """Identify the human/agent operator running this call. Used for per-user
    attribution on substrate event metadata under the multi-user model
    (per-user DeepSeek API keys, see ONBOARDING.md). Reads $SIXIS_OPERATOR
    if set (recommended for production team members), falls back to $USER.
    """
    return os.environ.get("SIXIS_OPERATOR") or os.environ.get("USER") or "unknown"


def _key_fingerprint() -> str:
    """8-char fingerprint of the API key suffix for per-user attribution
    without exposing the key itself. Lets substrate distinguish which user's
    key triggered a call."""
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    return key[-8:] if len(key) >= 8 else "no_key"


def _build_messages(prompt: str, project_id: str, brain: str = "deepseek") -> list[dict]:
    """Compose the messages array: substrate-summary preamble + user prompt."""
    preamble_text, _regen = preamble_mod.get_or_build(brain, project_id)
    if preamble_text:
        return [
            {"role": "system", "content": preamble_text},
            {"role": "user", "content": prompt},
        ]
    # Per DeepSeek R2 refinement: degrade to per-poll context if preamble failed.
    return [{"role": "user", "content": prompt}]


def _post_once(messages: list[dict], timeout: int) -> dict:
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {_api_key()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def call_deepseek(prompt: str, project_id: str, brain: str = "deepseek") -> dict:
    """Call DeepSeek API with retry and substrate logging.

    On success: emits deepseek_api_call event, returns
      {"ok": True, "text": <response text>, "raw": <raw json>}.
    On failure (after retries): emits deepseek_api_error + fallback_to_browser
    events, returns {"ok": False, "fallback": "browser", "error_class": str,
    "messages_for_browser": <prepared messages>}.
    """
    messages = _build_messages(prompt, project_id, brain)
    last_error_class = "unknown"
    last_status: int | None = None

    last_http_body = None  # captured for postmortem when API rejects with body
    for attempt, backoff in enumerate(RETRY_BACKOFFS, start=1):
        try:
            data = _post_once(messages, PER_ATTEMPT_TIMEOUT)
            text = data["choices"][0]["message"]["content"]
            _safe_log(_log_success, project_id, brain, attempt)
            return {"ok": True, "text": text, "raw": data, "attempts": attempt}
        except urllib.error.HTTPError as e:
            last_error_class = "HTTPError"
            last_status = e.code
            try:
                last_http_body = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                last_http_body = None
            if e.code in (400, 401, 403):
                # Auth / bad-request: don't retry, go straight to fallback.
                break
        except urllib.error.URLError:
            last_error_class = "URLError"
        except (TimeoutError, OSError):
            last_error_class = "Timeout"
        except (KeyError, json.JSONDecodeError):
            last_error_class = "MalformedResponse"
        except Exception as exc:
            last_error_class = type(exc).__name__

        if attempt < len(RETRY_BACKOFFS):
            time.sleep(backoff)

    # Retries exhausted — fall back to browser path. Substrate-log failures
    # MUST NOT mask the API failure for the caller (Phase B step 4 lesson:
    # an enum-drift on the events table once turned a transient API error
    # into an unhelpful psycopg traceback). Use _safe_log.
    _safe_log(_log_api_error, project_id, brain, last_error_class, last_status, attempt)
    _safe_log(_log_fallback, project_id, brain, last_error_class)
    return {
        "ok": False,
        "fallback": "browser",
        "error_class": last_error_class,
        "status": last_status,
        "attempts": attempt,
        "messages_for_browser": messages,
        "http_body_excerpt": last_http_body,
    }


def _safe_log(fn, *args, **kwargs):
    """Run a substrate-logging function, suppressing/printing any exception.
    Phase B step 4: never let a substrate write failure mask the actual
    API call's result for the caller."""
    try:
        fn(*args, **kwargs)
    except Exception as e:
        import sys as _sys
        _sys.stderr.write(
            f"  [deepseek_client] WARN — substrate log {fn.__name__} failed: "
            f"{type(e).__name__}: {str(e)[:200]}\n"
        )


def _supabase_event_operator() -> str:
    """Operator string that satisfies the Supabase events.owner_user_id FK to
    operators(operator). $SIXIS_OPERATOR if set (e.g., 'tommy', 'quangholio');
    otherwise default to 'tommy'.  $USER ('thanhho') is intentionally NOT a
    fallback — it isn't an operator row and would violate the FK."""
    op = os.environ.get("SIXIS_OPERATOR")
    if op:
        return op
    return "tommy"


def _insert_event(
    *,
    event_type: str,
    source: str,
    description: str,
    payload: dict,
    project_id: str,
    cycle_id: str,
) -> None:
    """Phase B step 4 (2026-05-11): write substrate event directly to canonical
    Supabase. Supabase events schema uses occurred_at/payload (vs SQLite's
    timestamp/metadata)."""
    event_id = str(uuid.uuid4())
    operator = _supabase_event_operator()
    with _pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO events
                   (id, cycle_id, project_id, type, source, occurred_at,
                    description, payload, owner_user_id)
                   VALUES (%s, %s, %s::uuid, %s, %s, %s, %s, %s::jsonb, %s)""",
                (event_id, cycle_id, project_id, event_type, source, _now(),
                 description, json.dumps(payload), operator),
            )


def _log_success(project_id: str, brain: str, attempts: int) -> None:
    payload = {
        "brain": brain, "project_id": project_id, "model": MODEL, "attempts": attempts,
        "operator": _operator(), "key_fp": _key_fingerprint(),
    }
    _insert_event(
        event_type="deepseek_api_call",
        source=brain,
        description=f"DeepSeek API call succeeded (attempt {attempts})",
        payload=payload,
        project_id=project_id,
        cycle_id=_cycle_id_for_project(project_id),
    )


def _log_api_error(project_id: str, brain: str, error_class: str,
                   status, attempts: int) -> None:
    payload = {
        "brain": brain, "project_id": project_id, "error_class": error_class,
        "status": status, "attempts": attempts, "model": MODEL,
        "operator": _operator(), "key_fp": _key_fingerprint(),
    }
    _insert_event(
        event_type="deepseek_api_error",
        source="system",
        description=(
            f"DeepSeek API call failed after {attempts} attempts: "
            f"{error_class} (status={status})"
        ),
        payload=payload,
        project_id=project_id,
        cycle_id=_cycle_id_for_project(project_id),
    )


def _log_fallback(project_id: str, brain: str, error_class: str) -> None:
    payload = {
        "brain": brain, "project_id": project_id, "error_class": error_class,
        "from": "api", "to": "browser",
    }
    _insert_event(
        event_type="fallback_to_browser",
        source="system",
        description=(
            f"DeepSeek relay flipped to browser fallback (api failure: {error_class})"
        ),
        payload=payload,
        project_id=project_id,
        cycle_id=_cycle_id_for_project(project_id),
    )
