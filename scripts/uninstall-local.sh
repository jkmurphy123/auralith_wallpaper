#!/usr/bin/env bash
# Uninstall the Desktop RSS Wall GNOME Shell extension.
set -euo pipefail

EXT_UUID="desktop-rss-wall@sagethorn.local"
EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/${EXT_UUID}"

echo "=== Desktop RSS Wall — Uninstall ==="

# 1. Disable extension
echo ""
echo "[1/3] Disabling extension ..."
gnome-extensions disable "${EXT_UUID}" 2>/dev/null || echo "       (already disabled or not loaded)"

# 2. Remove extension files
echo ""
echo "[2/3] Removing extension files ..."
rm -rf "${EXT_DIR}"
echo "       Removed ${EXT_DIR}"

# 3. Uninstall helper
echo ""
echo "[3/3] Uninstalling helper package ..."
python3 -m pip uninstall -y desktop-rss-wall-helper 2>/dev/null || echo "       (not installed)"

echo ""
echo "=== Uninstall complete ==="
echo "Restart GNOME Shell or log out/in to fully remove."
