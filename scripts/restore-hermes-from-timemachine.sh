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

# Do NOT use [[ -d ... ]] on deep paths inside Time Machine — it can hang forever.
# Use find with -maxdepth so we never walk the entire backup tree.

echo "Searching (bounded depth; should finish quickly)..."
SOURCE=""
while IFS= read -r line; do
  [[ -n "$line" ]] && SOURCE="$line" && break
done < <(find "$BACKUP_ROOT" -maxdepth 28 -type d -path "*/Users/${USER_NAME}/.hermes" 2>/dev/null | head -1)

if [[ -z "$SOURCE" ]]; then
  echo "No match at */Users/${USER_NAME}/.hermes — trying any .hermes (still bounded)..."
  CANDIDATES=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && CANDIDATES+=("$line")
  done < <(find "$BACKUP_ROOT" -maxdepth 28 -type d -name '.hermes' 2>/dev/null | head -10)

  if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
    echo "ERROR: No .hermes under this snapshot (within depth 28)."
    echo "List top of backup:  ls -la \"$BACKUP_ROOT\""
    echo "Manual search:       find \"$BACKUP_ROOT\" -maxdepth 30 -type d -name '.hermes'"
    exit 1
  fi

  for c in "${CANDIDATES[@]}"; do
    if [[ "$c" == *"/${USER_NAME}/"* ]]; then
      SOURCE="$c"
      break
    fi
  done
  [[ -z "$SOURCE" ]] && SOURCE="${CANDIDATES[1]}"
  echo "WARNING: Using: $SOURCE"
else
  echo "Found: $SOURCE"
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
