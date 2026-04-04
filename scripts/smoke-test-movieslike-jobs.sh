#!/bin/zsh
# Smoke-test watchthisapp commands used by Hermes movieslike-* skills (no API writes where possible).
# Run on the Hermes laptop from anywhere:
#   zsh /path/to/watchthisapp/scripts/smoke-test-movieslike-jobs.sh
#
# Does NOT test: job-hunter, fursbliss-*, or Hermes itself — only this repo's CLIs.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

echo "== Repo: $REPO_DIR"
failures=0

run() {
  local name="$1"
  shift
  echo ""
  echo "== $name"
  if "$@"; then
    echo "OK: $name"
  else
    echo "FAIL: $name (exit $?)"
    failures=$((failures + 1))
  fi
}

# Reads local JSON — quiet (report still written to scripts/audit-quality-report.json)
run "audit-quality (local data)" zsh -c 'node scripts/audit-quality.mjs >/dev/null'

# Forge CLI parses args
run "forge_pagegen --help" python3 scripts/forge_pagegen.py --help

# GSC dry-run needs credentials; skip instead of failing when not configured
CREDS="${GSC_SERVICE_ACCOUNT_FILE:-}"
if [[ -z "$CREDS" ]] && [[ -f "${REPO_DIR}/gsc-service-account.json" ]]; then
  CREDS="${REPO_DIR}/gsc-service-account.json"
fi
if [[ -n "$CREDS" && -f "$CREDS" ]]; then
  run "gsc-movieslike-sync --dry-run" node scripts/gsc-movieslike-sync.mjs --dry-run
else
  echo ""
  echo "== gsc-movieslike-sync --dry-run"
  echo "SKIP: set GSC_SERVICE_ACCOUNT_FILE or add gsc-service-account.json at repo root"
fi

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "All smoke tests passed."
  exit 0
fi
echo "$failures smoke test(s) failed."
exit 1
