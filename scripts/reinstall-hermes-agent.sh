#!/bin/zsh
# When ~/.hermes/hermes-agent is corrupt, not a git repo, or permissions are
# beyond repair: remove it and run Nous Research install.sh.
# Your config stays in ~/.hermes/.env, ~/.hermes/config.yaml, skills/, cron/, etc.
#
# IMPORTANT: If you `rm -rf ~/.hermes/hermes-agent` while your shell is *inside*
# that path, cwd becomes invalid and the installer breaks — always `cd ~` first.
# This script forces cd to $HOME at startup.

set -euo pipefail
cd "$HOME" || exit 1

AGENT_DIR="${HERMES_AGENT_DIR:-$HOME/.hermes/hermes-agent}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${AGENT_DIR}.moved-aside-${STAMP}"

run_installer() {
  echo "Running installer from $HOME ..."
  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
}

if [[ ! -d "$AGENT_DIR" ]]; then
  echo "No $AGENT_DIR — running official installer only (fresh clone)."
  run_installer
  echo ""
  echo "Done. Try: hermes status"
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

cd "$HOME"

if [[ -d "$AGENT_DIR" ]]; then
  echo "ERROR: $AGENT_DIR still exists. Try manually:"
  echo "  cd ~"
  echo "  sudo chflags -R nouchg,noschg $AGENT_DIR"
  echo "  sudo rm -rf $AGENT_DIR"
  exit 1
fi

run_installer

echo ""
echo "Done. Try: hermes status"
