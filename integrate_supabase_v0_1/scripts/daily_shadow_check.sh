#!/bin/bash
# Daily shadow-window safety net.
# Runs full ETL catch-up + drift_check. Output appended to ~/.sixis_shadow.log.
#
# Triggered by launchd via projects/integrate_supabase_v0_1/scripts/sixis_shadow.plist.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$HERE")"
LOG_FILE="${HOME}/.sixis_shadow.log"

# Load .env
if [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_ROOT}/.env"
    set +a
fi

if [ -z "${SIXIS_DATABASE_URL:-}" ]; then
    echo "[$(date -u +%FT%TZ)] ERROR: SIXIS_DATABASE_URL not set" >> "$LOG_FILE"
    exit 1
fi

SQLITE_PATH="${SIXIS_SQLITE_PATH:-${HOME}/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db}"

{
    echo "==========================================="
    echo "[$(date -u +%FT%TZ)] Daily shadow check start"
    echo "  sqlite: ${SQLITE_PATH}"
    echo "  pg:     ${SIXIS_DATABASE_URL%%@*}@..."

    echo "--- ETL catch-up ---"
    python3 "${HERE}/etl_sqlite_to_postgres.py" \
        --source-db "${SQLITE_PATH}" \
        --target-dsn "${SIXIS_DATABASE_URL}" 2>&1 | tail -10

    echo "--- Incremental sync ---"
    SIXIS_DUAL_WRITE=1 python3 "${HERE}/sync_incremental.py" 2>&1 | tail -10

    echo "--- Drift check ---"
    python3 "${HERE}/drift_check.py" \
        --target-dsn "${SIXIS_DATABASE_URL}" 2>&1 | tail -10

    echo "--- Attention scan (FORCED_RULE_25) ---"
    DASHBOARD_DIR="${HOME}/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1"
    (cd "${DASHBOARD_DIR}" && python3 scripts/sixis.py attention-scan 2>&1 | tail -5)

    echo "[$(date -u +%FT%TZ)] Daily shadow check done"
    echo
} >> "$LOG_FILE" 2>&1
