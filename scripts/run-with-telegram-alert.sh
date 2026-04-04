#!/bin/zsh
# Run a command; on non-zero exit, send Telegram (failure only).
#
# Usage:
#   ./scripts/run-with-telegram-alert.sh "Vega GSC Daily" zsh -c 'cd "$HOME/projects/watchthisapp" && npm run cron:gsc'
#
# Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (same as notify-telegram.sh).
set -euo pipefail
JOB_NAME="${1:?usage: JOB_NAME command [args...]}"
shift
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if "$@"; then
  exit 0
fi
ec=$?
if [[ -x "${SCRIPT_DIR}/notify-telegram.sh" ]]; then
  "${SCRIPT_DIR}/notify-telegram.sh" "❌ Hermes job failed: ${JOB_NAME} (exit ${ec})" || true
fi
exit "$ec"
