#!/usr/bin/env bash
# Install the Desktop RSS Wall GNOME Shell extension locally.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXT_SRC="${PROJECT_DIR}/extension/desktop-rss-wall@sagethorn.local"
EXT_DEST="${HOME}/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local"
HELPER_DIR="${PROJECT_DIR}/helper"

echo "=== Desktop RSS Wall — Local Install ==="

# 1. Copy extension
echo ""
echo "[1/4] Installing extension ..."
mkdir -p "$(dirname "${EXT_DEST}")"
rm -rf "${EXT_DEST}"
cp -r "${EXT_SRC}" "${EXT_DEST}"
echo "       → ${EXT_DEST}"

# 2. Compile GSettings schemas
echo ""
echo "[2/4] Compiling GSettings schemas ..."
glib-compile-schemas "${EXT_DEST}/schemas"
echo "       Done."

# 3. Install helper Python package
echo ""
echo "[3/4] Installing helper Python package ..."
cd "${HELPER_DIR}"
python3 -m venv .venv 2>/dev/null || true
.venv/bin/pip install -e . -q 2>&1 | tail -1
# Symlink the CLI entry point to ~/.local/bin
mkdir -p "${HOME}/.local/bin"
ln -sf "${HELPER_DIR}/.venv/bin/desktop-rss-wall-helper" "${HOME}/.local/bin/desktop-rss-wall-helper"
cd "${PROJECT_DIR}"

# 4. Enable extension
echo ""
echo "[4/4] Enabling extension ..."
if gnome-extensions list | grep -q "desktop-rss-wall"; then
    gnome-extensions enable desktop-rss-wall@sagethorn.local 2>/dev/null || true
    echo "       Extension enabled."
else
    echo "       Extension installed but not yet listed. Restart GNOME Shell (Alt+F2, r) or log out/in."
fi

echo ""
echo "=== Install complete ==="
echo ""
echo "If the extension doesn't appear, try:"
echo "  - Log out and back in (Wayland requires a full session restart)"
echo "  - Or run: gnome-extensions enable desktop-rss-wall@sagethorn.local"
echo "  - Check logs: journalctl --user -f -o cat /usr/bin/gnome-shell"
