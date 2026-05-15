# Troubleshooting

## Extension not showing in GNOME Extensions list

**Cause:** You're on Wayland. GNOME Shell only discovers new extensions after a shell restart.

**Fix:** Log out and back in. Or on X11: Alt+F2 → `r` → Enter.

Also verify the extension directory exists with the right permissions:

```bash
ls ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/
# Should show: extension.js  prefs.js  stylesheet.css  metadata.json  schemas/

# Check schemas are compiled
file ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas/gschemas.compiled
# Should show: "GSettings schema compiled file"
```

If the `gschemas.compiled` file is missing, run:

```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas/
```

## Extension installed but not enabled

```bash
# Check if it's listed
gnome-extensions list | grep desktop-rss-wall

# Enable it
gnome-extensions enable desktop-rss-wall@sagethorn.local

# Check status
gnome-extensions info desktop-rss-wall@sagethorn.local
```

## "No feed cache yet" shown on desktop

You need to run the helper to fetch data:

```bash
desktop-rss-wall-helper fetch-rss \
  --url "https://example.com/feed.xml" \
  --output ~/.cache/desktop-rss-wall/feed.json
```

If `desktop-rss-wall-helper` is not found, install it:

```bash
cd desktop-rss-wall/helper
python3 -m venv .venv
.venv/bin/pip install -e .
ln -sf "$(pwd)/.venv/bin/desktop-rss-wall-helper" ~/.local/bin/desktop-rss-wall-helper
```

Make sure `~/.local/bin` is in your `$PATH`.

## Blank slideshow / no images

**Cause:** Either the image folder is empty, doesn't exist, or contains no supported image files (.jpg, .jpeg, .png, .webp).

**Fix:**

```bash
# Check the cache
cat ~/.cache/desktop-rss-wall/images.json

# Run the indexer manually
desktop-rss-wall-helper index-images \
  --folder ~/Pictures/wallpapers \
  --output ~/.cache/desktop-rss-wall/images.json \
  --recursive

# Check the folder exists and has images
ls ~/Pictures/wallpapers/ | head
```

## Preferences window is empty or broken

**Cause:** The GSettings schema may be missing or not compiled.

**Fix:**

```bash
# Verify the schema file exists
ls ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas/

# Recompile
glib-compile-schemas ~/.local/share/gnome-shell/extensions/desktop-rss-wall@sagethorn.local/schemas/
```

Then close and reopen the GNOME Extensions preferences window.

## Clock shows wrong format or garbled text

**Cause:** An invalid strftime format string in the Clock preferences.

**Fix:** Open preferences → Clock → Date/Time Format. Use a valid format like:

```
%A, %B %-d, %Y  %I:%M %p
```

The extension falls back to `toLocaleString()` if the format is invalid, so you'll always see something.

## Extension crashes GNOME Shell

If the extension causes a shell crash:

```bash
# Disable it immediately (from another TTY if needed)
gnome-extensions disable desktop-rss-wall@sagethorn.local

# Check the error log
journalctl --user -u /usr/bin/gnome-shell --since "5 minutes ago" -o cat | grep -i "desktop-rss-wall\|error\|traceback\|warning"
```

Most crashes are caused by:
- Uncaught exceptions in `enable()` — check that all imports work
- Not cleaning up timers/signals on `disable()` — make sure every `timeout_add_seconds` / `connect` is paired with a `source_remove` / `disconnect`
- Trying to access a destroyed actor — null-check `this._rootActor` and children before use

## systemd timer not running

```bash
# Check timer status
systemctl --user status desktop-rss-wall-fetch.timer

# Check if the units are installed
ls ~/.config/systemd/user/desktop-rss-wall-fetch.*

# Install the timer
./scripts/install-helper-timer.sh

# If the helper binary isn't found by systemd, make sure it's symlinked
ls -la ~/.local/bin/desktop-rss-wall-helper

# See timer execution logs
journalctl --user -u desktop-rss-wall-fetch.service
```

## Images rotate but are positioned wrong

**Cause:** The fit mode or dim overlay setting may need adjustment.

Open preferences → Slideshow:
- **Fit Mode:** `cover` (recommended) fills the screen cropping if needed. `contain` shows the full image with black bars. `stretch` distorts to fill. `center` shows at original size.
- **Dim Overlay Opacity:** Increase for better text readability (0.15 default).

## Help — nothing works

Start fresh:

```bash
# Full uninstall
./scripts/uninstall-local.sh

# Remove any leftover cache or state
rm -rf ~/.cache/desktop-rss-wall ~/.config/desktop-rss-wall

# Reinstall
./scripts/install-local.sh

# Log out and back in
```

If the issue persists, open a GitHub issue with:
- GNOME Shell version: `gnome-shell --version`
- Distro: `lsb_release -a`
- Extension log output: `journalctl --user -o cat /usr/bin/gnome-shell | grep desktop-rss-wall`
- Error messages from the helper: `desktop-rss-wall-helper refresh-all 2>&1`
