# Development Guide

## Architecture

```
GNOME Shell Extension (extension.js, prefs.js, stylesheet.css)
  └─ Owns desktop-visible widgets and preferences UI
  └─ Reads cached data (feed.json, images.json)
  └─ Uses GSettings for user preferences

Python Helper (desktop_rss_wall_helper)
  └─ Fetches RSS feeds → caches to JSON
  └─ Indexes image folders → caches to JSON
  └─ Runs via CLI or systemd timer
```

## Setup

```bash
git clone <repo>
cd desktop-rss-wall

# Install extension for development
./scripts/install-local.sh

# Or manually copy (Wayland can't use symlinks):
cp -r extension/desktop-rss-wall@sagethorn.local \
  ~/.local/share/gnome-shell/extensions/
glib-compile-schemas \
  ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas

# Install helper in editable mode
cd helper
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
cd ..
```

On Wayland, log out and back in for the extension to appear. On X11, Alt+F2 → `r`.

## Running Tests

```bash
# All Python tests
cd helper
.venv/bin/python -m pytest -v

# With coverage
.venv/bin/python -m pytest --cov=desktop_rss_wall_helper --cov-report=term-missing

# Single test file
.venv/bin/python -m pytest tests/test_image_indexer.py -v
```

JavaScript (extension) has no automated tests — it must be tested manually in GNOME Shell.

## Verifying the Extension

```bash
# Check JS syntax
node --check extension/desktop-rss-wall@sagethorn.local/extension.js
node --check extension/desktop-rss-wall@sagethorn.local/prefs.js

# Compile schemas
glib-compile-schemas extension/desktop-rss-wall@sagethorn.local/schemas/

# List installed extensions
gnome-extensions list

# Info about our extension
gnome-extensions info desktop-rss-wall@sagethorn.local

# Watch GNOME Shell logs
journalctl --user -f -o cat /usr/bin/gnome-shell | grep desktop-rss-wall
```

## Extension Development

### Reloading After Changes

On **Wayland**: changes to `extension.js` require logging out and back in. There is no runtime reload.

On **X11**: Alt+F2, type `r`, Enter to restart GNOME Shell.

The `prefs.js` (settings window) can be tested by closing and reopening the GNOME Extensions app — no shell restart needed.

### Debugging

```javascript
// In extension.js — use console.log()
console.log('[desktop-rss-wall] some message');

// View output:
journalctl --user -f -o cat /usr/bin/gnome-shell
```

Common GJS pitfalls:
- Clutter uses 0–255 for opacity, not 0.0–1.0. Always multiply GSettings doubles by 255.
- Actor properties like `x`, `y`, `width`, `height` are integers.
- `imports.byteArray.toString(contents)` is needed when parsing GLib file contents as JSON.
- GSettings bind flag `Gio.SettingsBindFlags.DEFAULT` does bidirectional sync.
- For ComboRow with string values, use `bind_with_mapping` to convert between the widget's integer `selected` property and GSettings' string key.

### Extension File Layout

```
extension/desktop-rss-wall@sagethorn.local/
├── metadata.json          # UUID, name, shell versions
├── extension.js           # Main extension class (enable/disable)
├── prefs.js               # Preferences window
├── stylesheet.css         # CSS classes for actors
└── schemas/
    └── org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local.gschema.xml
```

### Key Rules

1. No blocking network calls in extension.js — all I/O goes through Python helpers.
2. Extension must fail soft: missing/bad cache files should never crash GNOME Shell.
3. Always clean up actors, timers, signals, and file monitors on disable.
4. Target platform: Ubuntu GNOME on Wayland. Do NOT use gtk-layer-shell.

## Helper Development

### CLI

```bash
desktop-rss-wall-helper --help
desktop-rss-wall-helper fetch-rss --help
desktop-rss-wall-helper index-images --help
desktop-rss-wall-helper refresh-all --help
```

### Data Models

```python
# models.py

@dataclass
class FeedItem:
    title: str
    link: str = ""
    published: str = ""
    summary: str = ""

@dataclass
class FeedCache:
    version: int = 1
    fetched_at: str = ""
    source_url: str = ""
    feed_title: str = ""
    items: list[FeedItem] = field(default_factory=list)
    error: str | None = None

@dataclass
class ImageEntry:
    path: str
    mtime: float = 0.0
    size_bytes: int = 0

@dataclass
class ImageCache:
    version: int = 1
    indexed_at: str = ""
    folder: str = ""
    recursive: bool = False
    images: list[ImageEntry] = field(default_factory=list)
    error: str | None = None
```

### Cache Format

`~/.cache/desktop-rss-wall/feed.json`:
```json
{
  "version": 1,
  "fetched_at": "2026-05-15T09:00:00+00:00",
  "source_url": "https://example.com/feed.xml",
  "feed_title": "Example Feed",
  "items": [
    {"title": "Article", "link": "...", "published": "...", "summary": "..."}
  ],
  "error": null
}
```

`~/.cache/desktop-rss-wall/images.json`:
```json
{
  "version": 1,
  "indexed_at": "2026-05-15T09:00:00+00:00",
  "folder": "/home/user/Pictures/wallpapers",
  "recursive": false,
  "images": [
    {"path": "/home/user/Pictures/wallpapers/photo.jpg", "mtime": 1778845200.0, "size_bytes": 1234567}
  ],
  "error": null
}
```

### GSettings from Python

`refresh-all` reads GSettings via the `gsettings` CLI (subprocess). This avoids adding PyGObject/gi as a Python dependency. The schema must be installed (`glib-compile-schemas` in the extension dir) for this to work.

### Test Fixtures

RSS fixture XML files live in `helper/tests/fixtures/`:
- `valid_rss.xml` — 6 items, feedparser-compatible
- `valid_atom.xml` — Atom format
- `empty_rss.xml` — valid XML with no entries
- `malformed_rss.xml` — broken XML

Image tests use `tmp_path` (pytest fixture) to create temporary files — no fixed fixtures needed.

## Manual Test Checklist

After each milestone, verify:

1. Extension enables without errors
2. Desktop actors appear (RSS panel, clock, slideshow)
3. Preferences window opens and all controls work
4. Changing settings updates the display immediately
5. Disabling extension removes all actors and timers
6. Re-enabling restores the previous state
7. Log out and back in — extension returns with all settings intact
8. Missing/empty cache files don't crash the shell
9. systemd timer fires and refreshes caches
10. Changing feed URL in prefs → next helper run uses new URL
