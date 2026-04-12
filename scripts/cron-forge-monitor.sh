#!/bin/zsh
# Forge Monitor cron wrapper — runs after Forge jobs (07:10, 13:10, 19:10)
# Read-only health and sitemap checks. Does not modify git or site.
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

echo "[$(date)] Forge Monitor start"
python3 scripts/forge-monitor.py
EXIT_CODE=$?

echo "[$(date)] Forge Monitor done (exit: ${EXIT_CODE})"
exit ${EXIT_CODE}
