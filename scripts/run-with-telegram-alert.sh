#!/bin/zsh
# Run a command; on non-zero exit, print the failure for centralized logging.
#
# Usage:
#   ./scripts/run-with-telegram-alert.sh "Vega GSC Daily" zsh -c 'cd "$HOME/projects/watchthisapp" && npm run cron:gsc'
#
set -euo pipefail
JOB_NAME="${1:?usage: JOB_NAME command [args...]}"
shift
if "$@"; then
  exit 0
fi
ec=$?
echo "Hermes job failed: ${JOB_NAME} (exit ${ec})" >&2
exit "$ec"
