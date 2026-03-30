#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

REPO_DIR="${REPO_DIR:-/Users/gp/projects/watchthisapp}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
GSC_DAYS="${GSC_DAYS:-28}"
GSC_ROW_LIMIT="${GSC_ROW_LIMIT:-1000}"
GSC_MAX_NEW="${GSC_MAX_NEW:-20}"
GSC_MIN_IMPRESSIONS="${GSC_MIN_IMPRESSIONS:-1}"
RUN_VERCEL_DEPLOY="${RUN_VERCEL_DEPLOY:-0}"

LOCK_DIR="${REPO_DIR}/.cron-gsc-movieslike.lock"
LOG_DIR="${REPO_DIR}/logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${LOG_DIR}/cron-gsc-${TIMESTAMP}.log"

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "[$(date)] Starting GSC movies-like sync in ${REPO_DIR}"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "ERROR: Not a git repo: ${REPO_DIR}"
  exit 1
fi

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "Another run is already active. Exiting."
  exit 0
fi
trap 'rmdir "${LOCK_DIR}" 2>/dev/null || true' EXIT

cd "${REPO_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean. Aborting automation."
  git status --short
  exit 1
fi

git pull --rebase origin main

PYTHON_BIN="${PYTHON_BIN}" node scripts/gsc-movieslike-sync.mjs \
  --days "${GSC_DAYS}" \
  --row-limit "${GSC_ROW_LIMIT}" \
  --max-new "${GSC_MAX_NEW}" \
  --min-impressions "${GSC_MIN_IMPRESSIONS}"

git add data/recommendations

if ! git diff --cached --quiet; then
  git commit -m "Auto-generate missing pages from GSC movies-like queries"
  git push origin main

  if [[ "${RUN_VERCEL_DEPLOY}" == "1" ]]; then
    npm run deploy:vercel
  fi
else
  echo "No new pages generated."
fi

echo "HEAD: $(git rev-parse --short HEAD)"
echo "JSON count: $(ls data/recommendations | wc -l)"
echo "[$(date)] Completed GSC movies-like sync"
