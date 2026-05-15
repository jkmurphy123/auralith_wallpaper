#!/usr/bin/env bash
# Compile GSettings schemas for the Desktop RSS Wall extension.
set -euo pipefail

SCHEMA_DIR="$(cd "$(dirname "$0")/../extension/desktop-rss-wall@sagethorn.local/schemas" && pwd)"

echo "Compiling schemas in ${SCHEMA_DIR} ..."
glib-compile-schemas "${SCHEMA_DIR}"
echo "Done."
