#!/bin/zsh
# After restoring ~/.hermes from Time Machine, `hermes status` may fail building
# the editable install at ~/.hermes/hermes-agent with:
#   Cannot update time stamp of directory 'hermes_agent.egg-info'
# Run this on the Hermes laptop, then `hermes status` again.

set -euo pipefail

SRC="${HERMES_AGENT_SRC:-$HOME/.hermes/hermes-agent}"

if [[ ! -d "$SRC" ]]; then
  echo "Nothing to fix: missing $SRC"
  exit 1
fi

echo "Fixing permissions and stripping macOS metadata on: $SRC"
chmod -R u+rwX "$SRC"
xattr -cr "$SRC" 2>/dev/null || true

# Drop immutable flags if any (Time Machine / copies sometimes set them)
if command -v chflags >/dev/null 2>&1; then
  chflags -R nouchg,noschg "$SRC" 2>/dev/null || true
fi

echo "Removing stale Python build artifacts..."
rm -rf \
  "$SRC/hermes_agent.egg-info" \
  "$SRC/build" \
  "$SRC/dist" \
  "$SRC/.eggs" \
  "$SRC/.pytest_cache" \
  2>/dev/null || true
find "$SRC" -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true

if [[ -d "$SRC/.git" ]]; then
  echo "Refreshing git submodules (Hermes often needs them)..."
  (cd "$SRC" && git submodule update --init --recursive 2>/dev/null) || true
fi

echo ""
echo "Done. Try:  hermes status"
echo "If it still fails, reinstall the CLI (keeps ~/.hermes config):"
echo "  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
echo "Or from source:"
echo "  cd \"$SRC\" && command -v uv >/dev/null && uv sync"
