#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Prefer git's root so we always match the real repo (also works if scripts/ is symlinked).
REPO_DIR="${REPO_DIR:-$(git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null || echo "")}"
if [[ -z "${REPO_DIR}" ]]; then
  REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
fi

USER_HOME="$(cd ~ && pwd -P)"
if [[ "${REPO_DIR}" != "${USER_HOME}"/* ]]; then
  echo "ERROR: watchthisapp must live under your home directory, not:" >&2
  echo "  ${REPO_DIR}" >&2
  echo "A symlink or SMB path to another macOS user (e.g. /Users/gp/...) causes mkdir/git to fail." >&2
  echo "Fix: clone into your own home, e.g." >&2
  echo "  cd ~ && mkdir -p projects && git clone https://github.com/trubbleshooter05/watchthisapp.git projects/watchthisapp" >&2
  exit 1
fi

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

# Untracked files (e.g. local notes) do not block; only staged/unstaged *tracked* changes do.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "ERROR: Working tree is not clean. Aborting automation."
  git status --short
  exit 1
fi

git pull --no-rebase origin main

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
    npm run indexing:health
  fi
else
  echo "No new pages generated."
fi

echo "HEAD: $(git rev-parse --short HEAD)"
echo "JSON count: $(ls data/recommendations | wc -l)"
echo "[$(date)] Completed GSC movies-like sync"
