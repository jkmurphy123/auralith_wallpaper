#!/usr/bin/env bash
# Disable the Desktop RSS Wall extension.
set -euo pipefail

EXT_UUID="desktop-rss-wall@sagethorn.local"

gnome-extensions disable "${EXT_UUID}" 2>/dev/null || {
    echo "Extension ${EXT_UUID} is not enabled or not installed."
    exit 1
}
echo "Extension ${EXT_UUID} disabled."
