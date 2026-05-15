#!/usr/bin/env bash
# remove-helper-timer.sh — Remove the systemd user timer for Desktop RSS Wall.
#
# Disables the timer, removes the unit files, and reloads the daemon.

set -euo pipefail

UNIT_DIR="$HOME/.config/systemd/user"

echo "Removing Desktop RSS Wall user timer ..."

systemctl --user disable --now desktop-rss-wall-fetch.timer 2>/dev/null || true

rm -f "$UNIT_DIR/desktop-rss-wall-fetch.service"
rm -f "$UNIT_DIR/desktop-rss-wall-fetch.timer"

echo "  → Removed service + timer from $UNIT_DIR"

systemctl --user daemon-reload

echo "  → Daemon reloaded"
echo ""
echo "Desktop RSS Wall user timer removed."
