#!/usr/bin/env bash
# Install the systemd user timer for periodic cache refresh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SYSTEMD_SRC="${PROJECT_DIR}/systemd"
SYSTEMD_DEST="${HOME}/.config/systemd/user"

echo "=== Install Desktop RSS Wall systemd timer ==="

mkdir -p "${SYSTEMD_DEST}"
cp "${SYSTEMD_SRC}/desktop-rss-wall-fetch.service" "${SYSTEMD_DEST}/"
cp "${SYSTEMD_SRC}/desktop-rss-wall-fetch.timer" "${SYSTEMD_DEST}/"

systemctl --user daemon-reload
systemctl --user enable --now desktop-rss-wall-fetch.timer

echo ""
echo "Timer installed and started."
echo "Check status: systemctl --user status desktop-rss-wall-fetch.timer"
