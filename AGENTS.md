# AGENTS.md

## Project: Desktop RSS Wall (auralith_wallpaper)

A GNOME Shell extension that displays an RSS feed, image slideshow, and clock
as a desktop wallpaper layer on Ubuntu GNOME Wayland.

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

## Key Design Rules

1. No blocking network calls in extension.js — all I/O goes through Python helpers.
2. Extension must fail soft: missing/bad cache files should never crash GNOME Shell.
3. Always clean up actors, timers, signals, and file monitors on extension disable.
4. Target platform: Ubuntu GNOME on Wayland. Do NOT use gtk-layer-shell.
5. Work milestone by milestone. Do not skip the proof-of-concept.

## GNOME Version

Target: GNOME Shell 46 (confirmed via `gnome-shell --version` on dev machine).
Extend to 47-50 as testing confirms compatibility.

## Technology Stack

- GNOME Shell extension: GJS (JavaScript), GTK/Adwaita for prefs
- Python helper: Python 3.11+, Typer CLI, feedparser
- Build: glib-compile-schemas, setuptools
- Test: pytest for Python, manual testing for extension

## Data Locations

```
~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/  (extension)
~/.config/desktop-rss-wall/                                               (config)
~/.cache/desktop-rss-wall/                                                (cache)
```

## Milestones

See `desktop-rss-wall-design.md` for the full milestone plan (0-10).

Current: Milestone 6 (Image Index Helper) — complete.
Next: Milestone 7 (Slideshow Display).
