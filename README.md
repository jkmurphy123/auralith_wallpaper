# Desktop RSS Wall

A GNOME Shell extension that displays an RSS feed, image slideshow, and clock
as a desktop wallpaper layer on Ubuntu GNOME Wayland.

## Status

Milestone 0 — Project scaffold. Skeleton extension and helper tools are in place.
No visible desktop content yet.

## Prerequisites

- Ubuntu GNOME on Wayland
- GNOME Shell 46+
- Python 3.11+
- `glib-compile-schemas` (from `libglib2.0-dev` or equivalent)

## Quick Start

```bash
# Install
./scripts/install-local.sh

# After install, restart GNOME Shell (Alt+F2, r on X11; log out/in on Wayland)

# Verify
gnome-extensions info desktop-rss-wall@sagethorn.local
```

## Uninstall

```bash
./scripts/uninstall-local.sh
```

## Project Layout

```
extension/          GNOME Shell extension (JavaScript, GSettings, CSS)
helper/             Python helper tools (RSS fetching, image indexing)
scripts/            Install, uninstall, enable, disable scripts
systemd/            User systemd timer for periodic cache refresh
docs/               Design docs and development guides
```

## Development

```bash
# Compile schemas
./scripts/compile-schemas.sh

# Run Python tests
cd helper && python -m pip install -e ".[dev]" && python -m pytest
```

## License

MIT
