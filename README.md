# Desktop RSS Wall

A GNOME Shell extension that turns your desktop wallpaper into a living dashboard — displaying an RSS feed, image slideshow, and clock on Ubuntu GNOME (Wayland).

## Features

- **RSS Panel** — Displays feed title and items with configurable font, color, opacity, and background box
- **Image Slideshow** — Full-screen wallpaper layer with cover/contain/stretch/center fit modes, shuffle, and dim overlay
- **Live Clock** — strftime-formatted date/time with independent positioning and styling
- **Full Preferences UI** — GTK/Adwaita settings window with three tabbed pages
- **Python Helper** — CLI tool fetches RSS feeds and indexes image folders, writing JSON caches the extension reads
- **Optional systemd Timer** — Auto-refreshes RSS and images on schedule (no manual CLI needed after setup)

## Requirements

- **Ubuntu GNOME** on Wayland (GNOME Shell 46–50)
- Python 3.11+ (for the helper)
- `glib-compile-schemas` (part of `libglib2.0-dev` or `glib2-devel`)

## Quick Install

```bash
git clone https://github.com/sagethorn/desktop-rss-wall.git
cd desktop-rss-wall

# One command:
./scripts/install-local.sh
```

This copies the extension, compiles GSettings schemas, installs the Python helper, and enables the extension.

On Wayland you must **log out and back in** (or restart GNOME Shell) for the extension to appear. On X11 press Alt+F2, type `r`, Enter.

## Usage

### 1. Open Preferences

Open the **GNOME Extensions** app, find "Desktop RSS Wall", click the gear icon. Three pages of settings:

| Page | What you configure |
|------|-------------------|
| **RSS Panel** | Feed URL, position, size, font, colors, background box |
| **Clock** | Position, format string, font, colors, background box |
| **Slideshow** | Image folder, interval, fit mode, shuffle, dim overlay |

All settings take effect immediately.

### 2. Fetch Data

The extension reads cache files written by the helper. Run these manually:

```bash
# Fetch RSS feed
desktop-rss-wall-helper fetch-rss \
  --url "https://example.com/feed.xml" \
  --output ~/.cache/desktop-rss-wall/feed.json \
  --max-items 5

# Index an image folder
desktop-rss-wall-helper index-images \
  --folder ~/Pictures/wallpapers \
  --output ~/.cache/desktop-rss-wall/images.json \
  --recursive
```

Or refresh both at once (reads GSettings for feed URL and image folder):

```bash
desktop-rss-wall-helper refresh-all
```

### 3. Auto-Refresh (Optional)

Install the systemd user timer so `refresh-all` runs automatically:

```bash
./scripts/install-helper-timer.sh
```

The timer fires 30 seconds after login, then every 15 minutes. Check status:

```bash
systemctl --user status desktop-rss-wall-fetch.timer
journalctl --user -u desktop-rss-wall-fetch.service
```

## Manual Install

If the quick install doesn't work for you:

```bash
# 1. Copy extension
cp -r extension/desktop-rss-wall@sagethorn.local \
  ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local

# 2. Compile schemas
glib-compile-schemas \
  ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas

# 3. Install helper
cd helper
python3 -m venv .venv
.venv/bin/pip install -e .
ln -sf "$(pwd)/.venv/bin/desktop-rss-wall-helper" ~/.local/bin/desktop-rss-wall-helper
cd ..

# 4. Log out and back in (Wayland) or Alt+F2, r (X11)
```

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common issues and their fixes.

Quick checks:

```bash
# Is the extension installed?
ls ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/

# Is it enabled?
gnome-extensions info desktop-rss-wall@sagethorn.local

# Any errors in the log?
journalctl --user -f -o cat /usr/bin/gnome-shell | grep desktop-rss-wall
```

## Project Structure

```
desktop-rss-wall/
├── README.md
├── AGENTS.md
├── desktop-rss-wall-design.md
│
├── extension/
│   └── desktop-rss-wall@sagethorn.local/
│       ├── metadata.json
│       ├── extension.js          # Main GNOME Shell extension
│       ├── prefs.js              # Preferences UI (GTK/Adwaita)
│       ├── stylesheet.css
│       └── schemas/
│           └── *.gschema.xml     # GSettings definitions
│
├── helper/
│   ├── desktop_rss_wall_helper/  # Python package
│   │   ├── cli.py                # Typer CLI entry point
│   │   ├── rss_fetcher.py        # RSS feed fetching (feedparser)
│   │   ├── image_indexer.py      # Image folder indexing
│   │   ├── cache.py              # JSON cache read/write
│   │   ├── models.py             # Data models (dataclasses)
│   │   └── config.py             # Helper configuration
│   ├── tests/                    # pytest test suite (29 tests)
│   └── pyproject.toml
│
├── scripts/                      # Shell scripts
│   ├── install-local.sh
│   ├── uninstall-local.sh
│   ├── enable-extension.sh
│   ├── disable-extension.sh
│   ├── compile-schemas.sh
│   ├── install-helper-timer.sh
│   └── remove-helper-timer.sh
│
├── systemd/                      # systemd user units
│   ├── desktop-rss-wall-fetch.service
│   └── desktop-rss-wall-fetch.timer
│
└── docs/
    ├── development.md
    └── troubleshooting.md
```

## Uninstall

```bash
./scripts/uninstall-local.sh
```

Or manually:

```bash
gnome-extensions disable desktop-rss-wall@sagethorn.local
rm -rf ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local
systemctl --user disable --now desktop-rss-wall-fetch.timer 2>/dev/null
rm -f ~/.config/systemd/user/desktop-rss-wall-fetch.*
pip uninstall desktop-rss-wall-helper
```

## License

MIT
