#!/bin/zsh
# When ~/.hermes/hermes-agent is corrupt, not a git repo, or permissions are
# beyond repair: remove it and run Nous Research install.sh.
# Your config stays in ~/.hermes/.env, ~/.hermes/config.yaml, skills/, cron/, etc.

set -euo pipefail

AGENT_DIR="${HERMES_AGENT_DIR:-$HOME/.hermes/hermes-agent}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${AGENT_DIR}.moved-aside-${STAMP}"

if [[ ! -d "$AGENT_DIR" ]]; then
  echo "No $AGENT_DIR — nothing to remove. Run the installer only:"
  echo "  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
  exit 0
fi

echo "This will remove or rename:"
echo "  $AGENT_DIR"
echo "then run the official Hermes installer (fresh git clone + uv)."
echo "Config outside that folder (e.g. ~/.hermes/.env) is left in place."
if [[ -z "${YES:-}" ]]; then
  echo ""
  read -r "REPLY?Continue? [y/N] "
  [[ "$REPLY" == [yY]* ]] || { echo "Aborted."; exit 1; }
fi

echo "Fixing ownership, flags, and parent dir permissions (sudo)..."
sudo chown -R "$(whoami):$(id -gn)" "$HOME/.hermes"
sudo chmod u+rwx "$HOME/.hermes"
# Time Machine sometimes sets user immutable flags — mv/rm fail until cleared
sudo chflags -R nouchg,noschg "$AGENT_DIR" 2>/dev/null || true

if mv "$AGENT_DIR" "$BACKUP" 2>/dev/null; then
  echo "Moved old tree to: $BACKUP"
else
  echo "mv failed (common after TM). Removing directory with sudo rm -rf:"
  echo "  $AGENT_DIR"
  sudo rm -rf "$AGENT_DIR"
fi

if [[ -d "$AGENT_DIR" ]]; then
  echo "ERROR: $AGENT_DIR still exists. Try manually:"
  echo "  sudo chflags -R nouchg,noschg $AGENT_DIR"
  echo "  sudo rm -rf $AGENT_DIR"
  exit 1
fi

echo "Running installer..."
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

echo ""
echo "Done. Try: hermes status"
