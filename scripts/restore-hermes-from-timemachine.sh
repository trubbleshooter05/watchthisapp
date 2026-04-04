#!/bin/zsh
# One-shot Hermes restore from your Time Machine snapshot (2026-04-03).
#
# From the repo root (Time Machine volume must be mounted):
#
#   ./scripts/restore-hermes-from-timemachine.sh
#
# No arguments needed. Optional overrides:
#   BACKUP_ROOT=/other/snapshot ./scripts/restore-hermes-from-timemachine.sh
#   USER_NAME=otheruser ./scripts/restore-hermes-from-timemachine.sh
#
# Push restored ~/.hermes to Mac mini in the same run (optional):
#   MINI_HOST=openclaw@your-mini.local ./scripts/restore-hermes-from-timemachine.sh

set -euo pipefail

# --- defaults (everything you need in one place) ---
DEFAULT_BACKUP_ROOT="/Volumes/.timemachine/8827A54A-BE10-414D-83D1-8A668E70D4C5/2026-04-03-114612.backup/2026-04-03-114612.backup"
BACKUP_ROOT="${1:-${BACKUP_ROOT:-$DEFAULT_BACKUP_ROOT}}"
# Home folder name *inside the backup* (usually openclaw on the laptop snapshot)
USER_NAME="${USER_NAME:-openclaw}"
DEST="${HERMES_HOME:-$HOME/.hermes}"

if [[ ! -d "$BACKUP_ROOT" ]]; then
  echo "ERROR: Backup snapshot not mounted or wrong path:"
  echo "  $BACKUP_ROOT"
  echo "Plug/mount the Time Machine disk, or run:"
  echo "  BACKUP_ROOT=/path/to/snapshot $0"
  exit 1
fi

echo "Backup root: $BACKUP_ROOT"
echo "Looking for: Users/${USER_NAME}/.hermes"
echo ""

CANDIDATES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && CANDIDATES+=("$line")
done < <(find "$BACKUP_ROOT" -type d -path '*/.hermes' 2>/dev/null | head -30)

if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
  echo "ERROR: No .hermes directory under this snapshot."
  echo "Try: find \"$BACKUP_ROOT\" -type d -name '.hermes'"
  exit 1
fi

SOURCE=""
for c in "${CANDIDATES[@]}"; do
  if [[ "$c" == *"/Users/${USER_NAME}/.hermes" ]]; then
    SOURCE="$c"
    break
  fi
done
if [[ -z "$SOURCE" ]]; then
  for c in "${CANDIDATES[@]}"; do
    if [[ "$c" == *"/${USER_NAME}/"* ]]; then
      SOURCE="$c"
      break
    fi
  done
fi
if [[ -z "$SOURCE" ]]; then
  SOURCE="${CANDIDATES[1]}"
  echo "WARNING: No Users/${USER_NAME}/.hermes — using: $SOURCE"
else
  echo "Using: $SOURCE"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SAFE="${DEST}.pre-restore-${STAMP}"

if [[ -d "$DEST" ]]; then
  echo "Saving current Hermes → $SAFE"
  mv "$DEST" "$SAFE"
else
  echo "No existing $DEST (fresh install)."
  SAFE="(none)"
fi

mkdir -p "$(dirname "$DEST")"
echo "Restoring → $DEST"
cp -a "$SOURCE" "$DEST"

echo ""
echo "OK — restored Hermes config."
echo "Previous dir: $SAFE"
echo "Check: hermes status && hermes cron list"
echo ""

if [[ -n "${MINI_HOST:-}" ]]; then
  echo "Syncing to Mac mini: $MINI_HOST:$DEST"
  rsync -avz --delete "$DEST/" "${MINI_HOST}:$DEST/"
  echo "Mini sync done."
else
  echo "Optional — push this ~/.hermes to the mini later:"
  echo "  MINI_HOST=openclaw@your-mini.local $0"
fi
