#!/bin/zsh
# After a Time Machine restore, ~/.hermes/hermes-agent may be owned by the wrong
# user → Permission denied on xattr/rm/setuptools "Cannot update time stamp of
# hermes_agent.egg-info". Fix ownership first (requires your password once).

set -euo pipefail

SRC="${HERMES_AGENT_SRC:-$HOME/.hermes/hermes-agent}"

if [[ ! -d "$SRC" ]]; then
  echo "Nothing to fix: missing $SRC"
  exit 1
fi

echo "Step 1 — Take ownership of the tree (needed after TM restore if files are root/other-user):"
echo "  sudo chown -R \"$(whoami):$(id -gn)\" \"$SRC\""
echo ""
if [[ "${SKIP_CHOWN:-}" != "1" ]]; then
  sudo chown -R "$(whoami):$(id -gn)" "$SRC"
fi

echo "Step 2 — Permissions + metadata..."
chmod -R u+rwX "$SRC"
xattr -cr "$SRC" 2>/dev/null || true
if command -v chflags >/dev/null 2>&1; then
  chflags -R nouchg,noschg "$SRC" 2>/dev/null || true
fi

echo "Step 3 — Remove stale build dirs..."
rm -rf \
  "$SRC/hermes_agent.egg-info" \
  "$SRC/build" \
  "$SRC/dist" \
  "$SRC/.eggs" \
  "$SRC/.pytest_cache" \
  2>/dev/null || true
find "$SRC" -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true

if [[ -d "$SRC/.git" ]]; then
  echo "Step 4 — Git submodules..."
  (cd "$SRC" && git submodule update --init --recursive 2>/dev/null) || true
else
  echo ""
  echo "WARNING: $SRC is not a git clone — the official installer will refuse."
  echo "Run:  curl -fsSL .../install.sh | bash   AFTER moving this folder aside:"
  echo "  mv \"$SRC\" \"$SRC.broken-\$(date +%Y%m%d)\""
  echo "Or use: scripts/reinstall-hermes-agent.sh (same repo, raw GitHub)"
fi

echo ""
echo "Try:  hermes status"
echo "If it still fails: reinstall (see HERMES-RESTORE.txt or reinstall-hermes-agent.sh)."
