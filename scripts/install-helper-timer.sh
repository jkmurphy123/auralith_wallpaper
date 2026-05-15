#!/usr/bin/env bash
# install-helper-timer.sh — Install the systemd user timer for Desktop RSS Wall.
#
# Copies the service and timer files to ~/.config/systemd/user/
# and enables the timer.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
UNIT_DIR="$HOME/.config/systemd/user"

echo "Installing Desktop RSS Wall user timer ..."

mkdir -p "$UNIT_DIR"

cp "$PROJECT_DIR/systemd/desktop-rss-wall-fetch.service" "$UNIT_DIR/"
cp "$PROJECT_DIR/systemd/desktop-rss-wall-fetch.timer"   "$UNIT_DIR/"

echo "  → Copied service + timer to $UNIT_DIR"

systemctl --user daemon-reload
systemctl --user enable --now desktop-rss-wall-fetch.timer

echo "  → Timer enabled and started"
echo ""
echo "Check status with:"
echo "  systemctl --user status desktop-rss-wall-fetch.timer"
echo ""
echo "To see recent refresh output:"
echo "  journalctl --user -u desktop-rss-wall-fetch.service"
