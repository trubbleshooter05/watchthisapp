#!/bin/zsh
# Sync watchthisapp over SMB-mounted volumes (no git fetch required).
#
# Typical setup (one Mac has BOTH mounts visible — e.g. Air with external + network share):
#   SMB_SRC  = Mac mini home / project tree (ladmin volume)
#   SMB_DST  = OpenClaw user projects on the mounted laptop disk
#
# Defaults match paths you provided:
#   /Volumes/ladmin/watchthisapp  ->  /Volumes/Macintosh HD-1/Users/openclaw/projects/watchthisapp
#
# Usage:
#   zsh scripts/sync-watchthisapp-smb.sh              # push mini -> openclaw disk
#   SMB_REVERSE=1 zsh scripts/sync-watchthisapp-smb.sh   # openclaw disk -> mini
#
# Optional: SYNC_DELETE=1  (rsync --delete: destination becomes exact mirror of source)
#
set -euo pipefail

SRC="${SMB_SRC:-/Volumes/ladmin/watchthisapp}"
DST="${SMB_DST:-/Volumes/Macintosh HD-1/Users/openclaw/projects/watchthisapp}"

if [[ "${SMB_REVERSE:-0}" == "1" ]]; then
  tmp="$SRC"
  SRC="$DST"
  DST="$tmp"
fi

if [[ ! -d "$SRC" ]]; then
  echo "sync-watchthisapp-smb: source not mounted or missing: $SRC" >&2
  exit 1
fi
if [[ ! -d "$(dirname "$DST")" ]]; then
  echo "sync-watchthisapp-smb: parent of destination missing (mount disk?): $(dirname "$DST")" >&2
  exit 1
fi

mkdir -p "$DST"

RSYNC=(rsync -a)
if [[ "${SYNC_DELETE:-0}" == "1" ]]; then
  RSYNC+=(-v --delete)
else
  RSYNC+=(-v)
fi

# Heavy / reproducible dirs — copy project + .git but skip huge caches (re-run npm on destination if needed)
EXCLUDES=(
  --exclude node_modules
  --exclude .next
  --exclude .turbo
  --exclude '**/scripts/__pycache__'
)

echo "Syncing:"
echo "  FROM: $SRC"
echo "  TO:   $DST"
if [[ "${SYNC_DELETE:-0}" != "1" ]]; then
  echo "(incremental; set SYNC_DELETE=1 for exact mirror + deletions on destination)"
fi

"${RSYNC[@]}" "${EXCLUDES[@]}" "$SRC/" "$DST/"

echo "Done. On destination: cd \"$DST\" && npm install   # if node_modules was excluded"
