# Desktop RSS Wall: GNOME Wayland Design Brief for Codex

## Project Summary

Build a small Linux desktop app for Ubuntu GNOME running on Wayland. The app should behave like an active desktop wallpaper/widget layer rather than a normal window. It will display:

1. An RSS feed text panel
2. An image slideshow background or image layer
3. A current date/time display
4. A settings UI for positioning, sizing, opacity, fonts, colors, feed URL, slideshow folder, and refresh behavior

Because the target environment is **Ubuntu GNOME on Wayland**, do **not** implement this as a normal transparent GTK window or a gtk-layer-shell app. GNOME Wayland does not provide the same client-side positioning and desktop-layer control that X11 allows, and GNOME does not support the Layer Shell protocol used by many wlroots desktops. The correct first-class implementation path is a **GNOME Shell extension** with an optional helper service/script for RSS fetching and image indexing.

The project should be designed so the GNOME Shell extension owns the visible desktop layer and preferences UI, while helper scripts handle network/file/cache work outside the shell process.

---

## Target Platform

Primary target:

```text
Ubuntu GNOME
Wayland session
XDG_SESSION_TYPE=wayland
XDG_CURRENT_DESKTOP=ubuntu:GNOME
```

Do not optimize for X11 in the first version. X11 support can be added later as a separate backend, but this project brief is for GNOME Wayland only.

---

## Core Design Decision

Use this architecture:

```text
GNOME Shell Extension
    Owns desktop-visible widgets
    Owns settings/preferences UI
    Reads cached feed/image data
    Uses GSettings for user preferences

Python Helper Tools
    Fetch RSS feed
    Cache parsed feed as JSON
    Index slideshow images
    Optionally validate config/cache

User systemd timer/service or extension timer
    Periodically runs helper scripts
```

Avoid doing heavy network parsing, filesystem crawling, or blocking I/O directly inside the GNOME Shell extension. The extension runs in the shell process, so it should stay small, defensive, and fast.

---

## Functional Requirements

### RSS Feed Display

The app shall display an RSS feed panel on the desktop.

User controls:

- Feed URL
- Refresh interval in minutes
- Maximum number of feed items
- Show/hide feed title
- Show/hide item dates
- Text panel width
- Text panel height
- Horizontal position
- Vertical position
- Opacity
- Font family
- Font size
- Font color
- Optional text shadow/drop shadow
- Optional background box behind text
- Background box opacity
- Background corner radius

Initial rendering format:

```text
Feed Title

• First article title
  Optional date/source

• Second article title
  Optional date/source
```

RSS fetching should be handled by a Python helper and cached to JSON.

### Date/Time Display

The app shall display the current date and time independently from the RSS panel.

User controls:

- Enable/disable clock
- Date/time format string
- Horizontal position
- Vertical position
- Opacity
- Font family
- Font size
- Font color
- Optional text shadow/drop shadow
- Optional background box
- Background box opacity

Default format suggestion:

```text
%A, %B %-d, %Y  %I:%M %p
```

The extension should update the clock once per second or once per minute depending on whether seconds are present in the format string.

### Image Slideshow

The app shall show an image slideshow as a desktop visual layer.

User controls:

- Enable/disable slideshow
- Image folder path
- Include subfolders yes/no
- Shuffle yes/no
- Slide interval in seconds
- Image opacity
- Fit mode:
  - cover
  - contain
  - stretch
  - center
- Optional dim overlay opacity so text remains readable

Initial version may simply display images above the wallpaper but below the RSS/clock widgets. Later versions may explore deeper wallpaper integration.

The Python helper should index image files and write a cache file listing usable images.

Supported formats:

```text
.jpg
.jpeg
.png
.webp
```

Optional later formats:

```text
.gif
.bmp
.avif
```

---

## Non-Functional Requirements

### GNOME Shell Safety

The extension must avoid:

- Blocking network calls in the shell process
- Long-running synchronous file scans
- Unbounded timers
- Large image decoding loops inside GNOME Shell
- Unhandled exceptions that could destabilize the shell

The extension should fail softly. If cached RSS data is unavailable, show a small status message or hide the RSS panel depending on settings.

### Config Persistence

Use GSettings for extension settings. GNOME Shell extensions commonly use schemas compiled with `glib-compile-schemas`.

Use JSON cache files for fetched/generated data.

### User Data Locations

Use these paths by default:

```text
~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/
~/.config/desktop-rss-wall/
~/.cache/desktop-rss-wall/
```

Suggested cache files:

```text
~/.cache/desktop-rss-wall/feed.json
~/.cache/desktop-rss-wall/images.json
~/.cache/desktop-rss-wall/state.json
```

Suggested helper config file:

```text
~/.config/desktop-rss-wall/helper.json
```

Most user-facing settings should live in GSettings, but helper scripts may read exported settings or a helper config file if that keeps Python simpler.

---

## Proposed Repository Layout

```text
desktop-rss-wall/
  README.md
  AGENTS.md
  pyproject.toml
  package.json                         # optional, only if build tooling is needed

  extension/
    desktop-rss-wall@sagethorn.local/
      metadata.json
      extension.js
      prefs.js
      stylesheet.css
      schemas/
        org.gnome.shell.extensions.desktop-rss-wall.gschema.xml

  helper/
    desktop_rss_wall_helper/
      __init__.py
      cli.py
      config.py
      rss_fetcher.py
      image_indexer.py
      cache.py
      models.py
    tests/
      test_rss_fetcher.py
      test_image_indexer.py
      test_cache.py

  scripts/
    install-local.sh
    uninstall-local.sh
    enable-extension.sh
    disable-extension.sh
    compile-schemas.sh
    install-helper-timer.sh
    remove-helper-timer.sh

  systemd/
    desktop-rss-wall-fetch.service
    desktop-rss-wall-fetch.timer

  docs/
    design.md
    development.md
    troubleshooting.md
```

---

## GNOME Extension Files

### metadata.json

Create extension metadata similar to:

```json
{
  "uuid": "desktop-rss-wall@sagethorn.local",
  "name": "Desktop RSS Wall",
  "description": "Displays an RSS feed, slideshow, and clock on the GNOME desktop.",
  "shell-version": ["46", "47", "48", "49", "50"],
  "url": "https://example.local/desktop-rss-wall",
  "version": 1
}
```

Codex should verify the installed GNOME Shell version with:

```bash
gnome-shell --version
```

Then set `shell-version` appropriately.

### extension.js

Responsibilities:

- Create a root desktop actor/container
- Create child actors for:
  - slideshow image layer
  - dim overlay layer
  - RSS text panel
  - clock text panel
- Bind actor properties to GSettings values
- Read cached RSS JSON from `~/.cache/desktop-rss-wall/feed.json`
- Read cached image JSON from `~/.cache/desktop-rss-wall/images.json`
- Update RSS display when cache changes or on timer
- Update clock display on timer
- Rotate slideshow image on timer
- Clean up all timers, signals, actors, and file monitors on disable

Preferred implementation style:

- Use modern GJS extension patterns for the target GNOME version
- Keep code split into small classes/modules if supported by target shell version
- Add defensive logging with `console.log()` / GNOME logging conventions
- Never leave timers running after extension disable

### prefs.js

Responsibilities:

- Provide preferences UI in GNOME Extensions app
- Use GTK/Adwaita widgets suitable for the target GNOME version
- Bind controls to GSettings
- Include sections:
  - RSS
  - Clock
  - Slideshow
  - Appearance
  - Advanced / Debug

Minimum preferences controls for Milestone 2:

- RSS x position
- RSS y position
- RSS width
- RSS height
- RSS opacity
- Clock x position
- Clock y position
- Clock font size

Later preferences controls add full font, color, URL, slideshow, and helper options.

### stylesheet.css

Responsibilities:

- Define classes for RSS panel, clock panel, background boxes, shadows
- Keep styling simple and generated mostly from settings

Example classes:

```css
.desktop-rss-wall-root {
}

.desktop-rss-wall-rss-panel {
}

.desktop-rss-wall-clock-panel {
}

.desktop-rss-wall-background-box {
}
```

---

## GSettings Schema

Create:

```text
schemas/org.gnome.shell.extensions.desktop-rss-wall.gschema.xml
```

Suggested keys:

```xml
<schemalist>
  <schema id="org.gnome.shell.extensions.desktop-rss-wall" path="/org/gnome/shell/extensions/desktop-rss-wall/">

    <key name="rss-enabled" type="b">
      <default>true</default>
    </key>

    <key name="rss-feed-url" type="s">
      <default>"https://example.com/feed.xml"</default>
    </key>

    <key name="rss-refresh-minutes" type="i">
      <default>15</default>
    </key>

    <key name="rss-max-items" type="i">
      <default>5</default>
    </key>

    <key name="rss-x" type="i">
      <default>80</default>
    </key>

    <key name="rss-y" type="i">
      <default>120</default>
    </key>

    <key name="rss-width" type="i">
      <default>650</default>
    </key>

    <key name="rss-height" type="i">
      <default>420</default>
    </key>

    <key name="rss-opacity" type="d">
      <default>0.85</default>
    </key>

    <key name="rss-font-family" type="s">
      <default>"DejaVu Sans"</default>
    </key>

    <key name="rss-font-size" type="i">
      <default>18</default>
    </key>

    <key name="rss-font-color" type="s">
      <default>"#ffffff"</default>
    </key>

    <key name="rss-background-enabled" type="b">
      <default>true</default>
    </key>

    <key name="rss-background-color" type="s">
      <default>"#000000"</default>
    </key>

    <key name="rss-background-opacity" type="d">
      <default>0.35</default>
    </key>

    <key name="clock-enabled" type="b">
      <default>true</default>
    </key>

    <key name="clock-format" type="s">
      <default>"%A, %B %-d, %Y  %I:%M %p"</default>
    </key>

    <key name="clock-x" type="i">
      <default>80</default>
    </key>

    <key name="clock-y" type="i">
      <default>40</default>
    </key>

    <key name="clock-opacity" type="d">
      <default>0.95</default>
    </key>

    <key name="clock-font-family" type="s">
      <default>"DejaVu Sans Mono"</default>
    </key>

    <key name="clock-font-size" type="i">
      <default>32</default>
    </key>

    <key name="clock-font-color" type="s">
      <default>"#ffffff"</default>
    </key>

    <key name="slideshow-enabled" type="b">
      <default>true</default>
    </key>

    <key name="slideshow-folder" type="s">
      <default>""</default>
    </key>

    <key name="slideshow-include-subfolders" type="b">
      <default>false</default>
    </key>

    <key name="slideshow-shuffle" type="b">
      <default>true</default>
    </key>

    <key name="slideshow-interval-seconds" type="i">
      <default>60</default>
    </key>

    <key name="slideshow-opacity" type="d">
      <default>1.0</default>
    </key>

    <key name="slideshow-fit-mode" type="s">
      <default>"cover"</default>
    </key>

    <key name="dim-overlay-opacity" type="d">
      <default>0.15</default>
    </key>

  </schema>
</schemalist>
```

Codex may refine this schema as implementation details become clearer.

---

## Helper CLI Design

Use Python for helper tools.

Installable command:

```bash
desktop-rss-wall-helper
```

Subcommands:

```bash
desktop-rss-wall-helper fetch-rss --url URL --output ~/.cache/desktop-rss-wall/feed.json --max-items 5

desktop-rss-wall-helper index-images --folder ~/Pictures/wallpaper-feed --output ~/.cache/desktop-rss-wall/images.json --recursive false

desktop-rss-wall-helper refresh-all

desktop-rss-wall-helper validate-cache
```

### feed.json format

```json
{
  "version": 1,
  "fetched_at": "2026-05-15T09:00:00-04:00",
  "source_url": "https://example.com/feed.xml",
  "feed_title": "Example Feed",
  "items": [
    {
      "title": "First article title",
      "link": "https://example.com/article-1",
      "published": "2026-05-15T08:30:00-04:00",
      "summary": "Optional short summary"
    }
  ],
  "error": null
}
```

If fetching fails, preserve the last successful feed when possible and write error details to `state.json` rather than destroying usable cached content.

### images.json format

```json
{
  "version": 1,
  "indexed_at": "2026-05-15T09:00:00-04:00",
  "folder": "/home/user/Pictures/wallpaper-feed",
  "recursive": false,
  "images": [
    {
      "path": "/home/user/Pictures/wallpaper-feed/image1.jpg",
      "mtime": 1778845200,
      "size_bytes": 1234567
    }
  ],
  "error": null
}
```

---

## systemd User Timer

Provide optional user-level systemd files.

### desktop-rss-wall-fetch.service

```ini
[Unit]
Description=Refresh Desktop RSS Wall cache

[Service]
Type=oneshot
ExecStart=%h/.local/bin/desktop-rss-wall-helper refresh-all
```

### desktop-rss-wall-fetch.timer

```ini
[Unit]
Description=Refresh Desktop RSS Wall cache periodically

[Timer]
OnBootSec=30s
OnUnitActiveSec=15min
Persistent=true

[Install]
WantedBy=timers.target
```

Install commands:

```bash
mkdir -p ~/.config/systemd/user
cp systemd/desktop-rss-wall-fetch.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now desktop-rss-wall-fetch.timer
```

The interval can later be generated from the user’s RSS refresh setting.

---

## Installation Workflow

Local development install:

```bash
./scripts/install-local.sh
```

Expected behavior:

1. Copy or symlink the extension folder into:

```text
~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local
```

2. Compile GSettings schemas:

```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas
```

3. Enable extension:

```bash
gnome-extensions enable desktop-rss-wall@sagethorn.local
```

4. Install helper package in editable mode:

```bash
python -m pip install -e ./helper
```

5. Optionally install systemd user timer.

On Wayland, GNOME Shell extension reload behavior can be more awkward than on X11. Provide instructions in `docs/development.md` explaining how to log out/in, disable/enable the extension, and inspect logs.

---

## Development Commands

Useful commands to document and support:

```bash
gnome-shell --version

gnome-extensions list

gnome-extensions info desktop-rss-wall@sagethorn.local

gnome-extensions enable desktop-rss-wall@sagethorn.local

gnome-extensions disable desktop-rss-wall@sagethorn.local

journalctl --user -f

journalctl /usr/bin/gnome-shell -f
```

Depending on distro/session, GNOME Shell logs may be visible through different journal queries. Document whatever works during testing.

---

## Milestone Plan

### Milestone 0: Project Scaffold

Goal: Create repo structure, scripts, README, AGENTS.md, and empty extension/helper skeleton.

Deliverables:

- Repository layout exists
- `metadata.json` exists
- Empty `extension.js` that logs enable/disable
- Empty `prefs.js`
- GSettings schema compiles
- Helper Python package imports
- Basic pytest setup works

Acceptance tests:

```bash
./scripts/compile-schemas.sh
python -m pytest
```

Manual test:

```bash
gnome-extensions enable desktop-rss-wall@sagethorn.local
gnome-extensions disable desktop-rss-wall@sagethorn.local
```

### Milestone 1: Desktop Text Proof of Concept

Goal: Display fixed desktop text through the GNOME Shell extension.

Display:

```text
Desktop RSS Wall
Friday, May 15, 2026
```

Deliverables:

- Extension creates a visible desktop actor
- Actor is styled through CSS
- Actor is removed cleanly on disable
- No helper involvement yet

Acceptance:

- Text appears after enabling extension
- Text disappears after disabling extension
- No shell errors in logs

### Milestone 2: GSettings + Preferences Basics

Goal: Add basic settings and preferences UI.

Controls:

- RSS x
- RSS y
- RSS width
- RSS height
- RSS opacity
- Clock x
- Clock y
- Clock font size

Deliverables:

- GSettings schema with above keys
- Preferences window edits values
- Extension responds to setting changes live or after disable/enable

Acceptance:

- Moving sliders changes actor placement/size/opacity
- Settings persist after logout/login

### Milestone 3: Clock Widget

Goal: Implement the date/time display fully.

Deliverables:

- Clock text actor
- Format setting
- Font family setting
- Font size setting
- Font color setting
- Opacity setting
- Optional background box

Acceptance:

- Clock updates correctly
- Clock obeys settings
- Timer is cleaned up on disable

### Milestone 4: RSS Helper and Cache

Goal: Implement Python helper to fetch RSS and write cache.

Deliverables:

- `desktop-rss-wall-helper fetch-rss`
- Feed parsing via `feedparser`
- JSON cache writer
- Unit tests with fixture RSS files
- Error handling preserving last successful cache

Acceptance:

```bash
desktop-rss-wall-helper fetch-rss --url "https://example.com/feed.xml" --output ~/.cache/desktop-rss-wall/feed.json --max-items 5
```

Expected:

- Valid JSON cache exists
- Tests cover good feed, bad URL, malformed feed fixture

### Milestone 5: RSS Display

Goal: Extension reads `feed.json` and renders feed items.

Deliverables:

- RSS panel actor
- Feed title display
- Item title display
- Max items support
- Empty/error fallback state
- Periodic cache reload or file monitor

Acceptance:

- Manually generated `feed.json` appears in desktop panel
- Updating cache refreshes display
- Missing cache does not crash extension

### Milestone 6: Image Index Helper

Goal: Implement image folder indexing.

Deliverables:

- `desktop-rss-wall-helper index-images`
- Recursive option
- Supported image extension filtering
- JSON cache writer
- Tests using temporary image fixture files

Acceptance:

```bash
desktop-rss-wall-helper index-images --folder ~/Pictures/wallpaper-feed --output ~/.cache/desktop-rss-wall/images.json
```

Expected:

- Valid `images.json`
- Only supported image files included

### Milestone 7: Slideshow Display

Goal: Extension displays slideshow images from cache.

Deliverables:

- Slideshow actor
- Image rotation timer
- Fit mode support
- Opacity support
- Shuffle support
- Dim overlay support

Acceptance:

- Images rotate at configured interval
- RSS and clock remain visible above slideshow
- Missing image files are skipped safely

### Milestone 8: Full Preferences UI

Goal: Complete settings UI.

Add controls for:

- RSS feed URL
- RSS refresh interval
- RSS max items
- RSS font family
- RSS font size
- RSS font color
- RSS background options
- Clock format
- Clock full font/color/background options
- Slideshow folder
- Slideshow interval
- Slideshow fit mode
- Slideshow opacity
- Dim overlay opacity

Acceptance:

- All settings persist
- Invalid settings are handled gracefully
- Feed URL changes are reflected by helper on next refresh

### Milestone 9: User Timer Integration

Goal: Add optional systemd user timer for refreshes.

Deliverables:

- systemd service/timer files
- install/remove scripts
- docs
- Helper `refresh-all` reads settings/config and updates feed/images cache

Acceptance:

```bash
systemctl --user status desktop-rss-wall-fetch.timer
```

Shows active timer.

### Milestone 10: Packaging and Polish

Goal: Make it pleasant to install and maintain.

Deliverables:

- `README.md` with install/use/troubleshooting
- `docs/development.md`
- `docs/troubleshooting.md`
- `scripts/install-local.sh`
- `scripts/uninstall-local.sh`
- Versioned release zip target
- Screenshots if possible

Acceptance:

- Fresh clone can install locally from README instructions
- User can enable extension, open preferences, configure feed and slideshow

---

## Testing Strategy

### Python Helper Tests

Use pytest.

Test areas:

- RSS parsing from fixture files
- RSS fetch error behavior
- Cache JSON schema
- Image indexing
- Recursive/non-recursive behavior
- Unsupported file filtering
- Preserve last successful cache behavior

### GNOME Extension Manual Tests

Manual checklist:

1. Enable extension
2. Verify desktop actors appear
3. Open preferences
4. Move RSS panel
5. Resize RSS panel
6. Change opacity
7. Change clock format
8. Disable extension
9. Verify actors disappear
10. Re-enable extension
11. Verify settings persisted
12. Log out/in
13. Verify extension returns

### Failure Tests

Manually test:

- No feed cache
- Malformed feed cache
- Empty image folder
- Deleted image after indexing
- Invalid slideshow folder
- Bad feed URL
- Network disconnected

Expected behavior: no shell crash, no infinite error loops, clear log message or unobtrusive UI fallback.

---

## Codex Implementation Instructions

When implementing this project:

1. Work milestone by milestone.
2. Do not skip the GNOME desktop proof-of-concept.
3. Keep extension code small and defensive.
4. Do not perform blocking network calls inside `extension.js`.
5. Put network and filesystem-heavy work in Python helper scripts.
6. Write tests for Python helper code before expanding features.
7. Prefer simple visible behavior over clever hidden behavior.
8. Always clean up GNOME Shell actors, timers, signal handlers, and file monitors on extension disable.
9. Document any GNOME version-specific APIs encountered.
10. Preserve the target assumption: Ubuntu GNOME Wayland.

---

## Open Questions for Later

These are not blockers for Milestone 0 or Milestone 1:

- Should the slideshow replace the actual wallpaper or simply render above it?
- Should clicking RSS items open the browser, or should the layer remain non-interactive?
- Should the RSS panel support summaries, only titles, or both?
- Should there be multiple feeds?
- Should there be per-monitor configuration?
- Should settings support profiles/themes?
- Should the helper read GSettings directly, or should settings be exported to a helper JSON file?

For the first implementation, keep it single-monitor, single-feed, and local-cache based.

---

## Definition of Done for First Usable Version

The first usable version is complete when:

1. The GNOME Shell extension displays a configurable RSS panel, clock, and slideshow on Ubuntu GNOME Wayland.
2. The preferences UI can edit position, size, opacity, fonts, colors, feed URL, and slideshow folder.
3. RSS data is fetched by a Python helper and cached as JSON.
4. Slideshow images are indexed by a Python helper and cached as JSON.
5. The helper refresh runs automatically through a user systemd timer or a documented manual command.
6. The extension survives missing/bad cache files without crashing GNOME Shell.
7. Installation and removal are documented and scripted.
