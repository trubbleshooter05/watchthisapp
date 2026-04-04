#!/bin/zsh
# When ~/.hermes/hermes-agent is corrupt, not a git repo, or permissions are
# beyond repair: move it aside and run Nous Research install.sh.
# Your config stays in ~/.hermes/.env, ~/.hermes/config.yaml, skills/, cron/, etc.

set -euo pipefail

AGENT_DIR="${HERMES_AGENT_DIR:-$HOME/.hermes/hermes-agent}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${AGENT_DIR}.moved-aside-${STAMP}"

if [[ ! -d "$AGENT_DIR" ]]; then
  echo "No $AGENT_DIR — nothing to move. Run the installer only:"
  echo "  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
  exit 0
fi

echo "This will rename:"
echo "  $AGENT_DIR"
echo "→ $BACKUP"
echo "then run the official Hermes installer (fresh git clone + uv)."
echo "Config outside that folder (e.g. ~/.hermes/.env) is left in place."
if [[ -z "${YES:-}" ]]; then
  echo ""
  read -r "REPLY?Continue? [y/N] "
  [[ "$REPLY" == [yY]* ]] || { echo "Aborted."; exit 1; }
fi

echo "Taking ownership (sudo) in case TM left root-owned files..."
sudo chown -R "$(whoami):$(id -gn)" "$HOME/.hermes" 2>/dev/null || true

mv "$AGENT_DIR" "$BACKUP"
echo "Moved old tree to: $BACKUP"

echo "Running installer..."
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

echo ""
echo "Done. Try: hermes status"
