# Desktop RSS Wall

A GNOME Shell extension that displays an RSS feed, image slideshow, and clock
as a desktop wallpaper layer on Ubuntu GNOME Wayland.

## Status

Milestone 2 — GSettings + Preferences basics. Position, size, opacity,
and font-size are configurable via the GNOME Extensions preferences window
and update live on the desktop.

## What's Visible

After enabling the extension, you'll see on the desktop:

```
Desktop RSS Wall        (RSS panel — configurable position/size/opacity)
Friday, May 15, 2026    (Clock — configurable position/font-size)
```

Open Extensions → Desktop RSS Wall → Preferences to adjust:

- **RSS Panel**: X, Y, Width, Height, Opacity
- **Clock**: X, Y, Font Size

All changes apply live — no restart needed.

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
