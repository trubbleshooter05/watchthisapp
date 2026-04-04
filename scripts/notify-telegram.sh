#!/bin/zsh
# Send a plain-text message to Telegram. Reads TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
# from the environment (export in ~/.zshrc or ~/.hermes/.env before Hermes runs skills).
#
# Usage: notify-telegram.sh "Your message here"
set -euo pipefail
MSG="${*:-}"
if [[ -z "$MSG" ]]; then
  echo "usage: $0 message..." >&2
  exit 1
fi
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "notify-telegram: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" >&2
  exit 1
fi
curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MSG}" \
  --data-urlencode "disable_web_page_preview=true" \
  >/dev/null
echo "notify-telegram: sent."
