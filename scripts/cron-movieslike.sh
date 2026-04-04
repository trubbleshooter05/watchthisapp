#!/bin/zsh
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="${REPO_DIR:-$(git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null || echo "")}"
if [[ -z "${REPO_DIR}" ]]; then
  REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
fi
USER_HOME="$(cd ~ && pwd -P)"
if [[ "${REPO_DIR}" != "${USER_HOME}"/* ]]; then
  echo "ERROR: watchthisapp must live under ${USER_HOME}, not ${REPO_DIR}" >&2
  exit 1
fi
MODE="${1:-daily}"

DISCOVER_LIMIT="${DISCOVER_LIMIT:-150}"
DISCOVER_MIN_VOTES="${DISCOVER_MIN_VOTES:-80}"
DISCOVER_MIN_RATING="${DISCOVER_MIN_RATING:-5.5}"
DISCOVER_MIN_POP="${DISCOVER_MIN_POP:-2}"

LOCK_DIR="${REPO_DIR}/.cron-movieslike.lock"
LOG_DIR="${REPO_DIR}/logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${LOG_DIR}/cron-${MODE}-${TIMESTAMP}.log"

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "[$(date)] start mode=${MODE}"
[[ -d "${REPO_DIR}/.git" ]] || { echo "Not a git repo: ${REPO_DIR}"; exit 1; }

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "Another run is active. Exiting."
  exit 0
fi
trap 'rmdir "${LOCK_DIR}" 2>/dev/null || true' EXIT

cd "${REPO_DIR}"

if ! git diff --quiet -- scripts/backlog.json 2>/dev/null; then
  git restore scripts/backlog.json || true
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Aborting."
  git status --short
  exit 1
fi

git pull --no-rebase origin main

run_daily() {
  npm run data:discover -- --limit "${DISCOVER_LIMIT}" --min-votes "${DISCOVER_MIN_VOTES}" --min-rating "${DISCOVER_MIN_RATING}" --min-pop "${DISCOVER_MIN_POP}"
  npm run data:bulk-scaffold
  npm run data:fill-all
  git add data/recommendations scripts/backlog.json
  if ! git diff --cached --quiet; then
    git commit -m "Daily auto batch: add movie recommendation pages"
    git push origin main
  else
    echo "No daily content changes."
  fi
}

run_nightly() {
  npm run data:fix-sequels
  npm run data:audit-quality
  npm run build
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "Nightly auto maintenance"
    git push origin main
  else
    echo "No nightly maintenance changes."
  fi
}

case "${MODE}" in
  daily) run_daily ;;
  nightly) run_nightly ;;
  full) run_daily; run_nightly ;;
  *) echo "Unknown mode: ${MODE}"; exit 1 ;;
esac

echo "HEAD: $(git rev-parse --short HEAD)"
echo "JSON count: $(ls data/recommendations | wc -l)"
echo "[$(date)] done mode=${MODE}"
