#!/bin/zsh
# Forge Weekly Report cron wrapper — runs Monday 09:00
# Summarizes forge-monitor logs from past 7 days into markdown report.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="${REPO_DIR:-$(git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null || echo "")}"
if [[ -z "${REPO_DIR}" ]]; then
  REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
fi

LOG_DIR="${REPO_DIR}/logs"
mkdir -p "${LOG_DIR}"

cd "${REPO_DIR}"

echo "[$(date)] Forge Weekly Report start"
python3 scripts/forge-weekly-report.py
EXIT_CODE=$?

echo "[$(date)] Forge Weekly Report done (exit: ${EXIT_CODE})"
exit ${EXIT_CODE}
