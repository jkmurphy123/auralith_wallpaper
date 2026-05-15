#!/usr/bin/env bash
# Remove the systemd user timer.
set -euo pipefail

echo "=== Remove Desktop RSS Wall systemd timer ==="

systemctl --user stop desktop-rss-wall-fetch.timer 2>/dev/null || true
systemctl --user disable desktop-rss-wall-fetch.timer 2>/dev/null || true

rm -f "${HOME}/.config/systemd/user/desktop-rss-wall-fetch.service"
rm -f "${HOME}/.config/systemd/user/desktop-rss-wall-fetch.timer"

systemctl --user daemon-reload

echo "Timer removed."
