#!/usr/bin/env bash
# Enable the Desktop RSS Wall extension.
set -euo pipefail

EXT_UUID="desktop-rss-wall@sagethorn.local"

if gnome-extensions list | grep -q "${EXT_UUID}"; then
    gnome-extensions enable "${EXT_UUID}"
    echo "Extension ${EXT_UUID} enabled."
else
    echo "Extension ${EXT_UUID} is not installed."
    echo "Run ./scripts/install-local.sh first."
    exit 1
fi
