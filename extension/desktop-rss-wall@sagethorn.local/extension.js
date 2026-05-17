/**
 * Desktop RSS Wall — GNOME Shell Extension
 *
 * Milestone 7: Slideshow display — image layer reads images.json,
 * rotates on a timer, supports fit modes (cover/contain/stretch/center),
 * shuffle, opacity, and a dim overlay for text readability.
 */
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GdkPixbuf from 'gi://GdkPixbuf';
import Pango from 'gi://Pango';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Paths
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), 'desktop-rss-wall']);
const FEED_CACHE_PATH = GLib.build_filenamev([CACHE_DIR, 'feed.json']);
const IMAGE_CACHE_PATH = GLib.build_filenamev([CACHE_DIR, 'images.json']);

export default class DesktopRssWallExtension extends Extension {
    enable() {
        console.log('[desktop-rss-wall] enabling');

        this._settings = this.getSettings(
            'org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local',
        );
        this._signalIds = [];
        this._feedMonitor = null;
        this._feedMonitorId = 0;
        this._imageMonitor = null;
        this._imageMonitorId = 0;
        this._rssRefreshTimerId = 0;
        this._rssItemLabels = [];
        this._rssSummaryLabels = [];
        this._storyFileIndex = 0;
        this._slideTimerId = 0;
        this._slideIndex = 0;
        this._shuffledImages = [];

        // --- Load stylesheet ---
        const sheet = this.dir.get_child('stylesheet.css');
        if (sheet.query_exists(null)) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().load_stylesheet(sheet);
            this._stylesheet = sheet;
            console.log('[desktop-rss-wall] stylesheet loaded');
        }

        // --- Screen dimensions ---
        const monitor = Main.layoutManager.primaryMonitor;
        this._screenWidth = monitor.width;
        this._screenHeight = monitor.height;

        // --- Create root container ---
        this._rootActor = new Clutter.Actor({
            name: 'desktop-rss-wall-root',
            reactive: false,
            x: 0,
            y: 0,
        });

        // ==================================================================
        //  Slideshow layer (bottom — behind everything else)
        // ==================================================================
        this._slideshowBin = new St.Bin({
            name: 'desktop-rss-wall-slideshow-bin',
            style_class: 'desktop-rss-wall-slideshow',
            x: 0,
            y: 0,
            width: this._screenWidth,
            height: this._screenHeight,
            clip_to_allocation: true,
            x_expand: false,
            y_expand: false,
        });

        this._slideshowContent = new Clutter.Actor({
            name: 'desktop-rss-wall-slideshow-content',
            reactive: false,
        });
        this._slideshowBin.set_child(this._slideshowContent);

        this._rootActor.add_child(this._slideshowBin);

        // ==================================================================
        //  Dim overlay (between slideshow and text layers)
        // ==================================================================
        this._dimOverlay = new Clutter.Actor({
            name: 'desktop-rss-wall-dim-overlay',
            reactive: false,
            x: 0,
            y: 0,
            width: this._screenWidth,
            height: this._screenHeight,
            background_color: new Clutter.Color({
                red: 0,
                green: 0,
                blue: 0,
                alpha: 255,
            }),
        });
        this._rootActor.add_child(this._dimOverlay);

        // ==================================================================
        //  RSS panel — structured layout with background box
        // ==================================================================
        this._rssActor = new Clutter.Actor({
            name: 'desktop-rss-wall-rss-actor',
            reactive: false,
        });

        this._rssBin = new St.Bin({
            name: 'desktop-rss-wall-rss-bin',
            style_class: 'desktop-rss-wall-rss-panel',
            x_expand: false,
            y_expand: false,
        });
        this._rssActor.add_child(this._rssBin);

        this._rssBox = new St.BoxLayout({
            name: 'desktop-rss-wall-rss-box',
            style_class: 'desktop-rss-wall-rss-box',
            vertical: true,
            x_expand: false,
            y_expand: false,
        });

        this._rssTitleLabel = new St.Label({
            text: '',
            style_class: 'desktop-rss-wall-rss-title',
        });
        this._rssBox.add_child(this._rssTitleLabel);

        this._rssBin.set_child(this._rssBox);
        this._rootActor.add_child(this._rssActor);

        // ==================================================================
        //  Clock widget (label inside optional background box)
        // ==================================================================
        this._clockActor = new Clutter.Actor({
            name: 'desktop-rss-wall-clock-actor',
            reactive: false,
        });

        this._clockBin = new St.Bin({
            name: 'desktop-rss-wall-clock-bin',
            style_class: 'desktop-rss-wall-clock-panel',
            x_expand: false,
            y_expand: false,
        });
        this._clockActor.add_child(this._clockBin);

        this._clockLabel = new St.Label({
            text: '',
            style_class: 'desktop-rss-wall-date',
        });
        this._clockBin.set_child(this._clockLabel);

        this._rootActor.add_child(this._clockActor);

        // --- Apply GSettings ---
        this._applySlideshowSettings();
        this._applyRssSettings();
        this._applyClockSettings();

        // --- Connect change signals for live updates ---

        // RSS visual keys
        const rssVisualKeys = [
            'rss-x', 'rss-y', 'rss-width', 'rss-height', 'rss-opacity',
            'rss-enabled',
            'rss-font-family', 'rss-font-size', 'rss-font-color',
            'rss-background-enabled', 'rss-background-color', 'rss-background-opacity',
        ];
        for (const key of rssVisualKeys) {
            const id = this._settings.connect(
                `changed::${key}`,
                () => this._applyRssSettings(),
            );
            this._signalIds.push(id);
        }

        // RSS content keys — trigger full reload (source, URL, folder, max items)
        const rssContentKeys = [
            'rss-source-mode', 'rss-feed-url', 'rss-file-folder', 'rss-max-items',
        ];
        for (const key of rssContentKeys) {
            const id = this._settings.connect(
                `changed::${key}`,
                () => this._loadRssCache(),
            );
            this._signalIds.push(id);
        }

        // Clock keys
        const clockKeys = [
            'clock-x', 'clock-y',
            'clock-font-size', 'clock-font-family', 'clock-font-color',
            'clock-opacity', 'clock-format',
            'clock-enabled',
            'clock-background-enabled', 'clock-background-color', 'clock-background-opacity',
        ];
        for (const key of clockKeys) {
            const id = this._settings.connect(
                `changed::${key}`,
                () => this._applyClockSettings(),
            );
            this._signalIds.push(id);
        }

        // Slideshow keys
        const slideKeys = [
            'slideshow-enabled', 'slideshow-opacity', 'slideshow-fit-mode',
            'dim-overlay-opacity', 'slideshow-interval-seconds',
            'slideshow-shuffle',
        ];
        for (const key of slideKeys) {
            const id = this._settings.connect(
                `changed::${key}`,
                () => this._applySlideshowSettings(),
            );
            this._signalIds.push(id);
        }

        // --- Load caches ---
        this._loadImageCache();
        this._loadRssCache();

        // --- File monitors (helper writes to these) ---
        this._startFeedMonitor();
        this._startImageMonitor();

        // --- Periodic RSS reload (safety net) ---
        this._startRssRefreshTimer();

        // --- Slideshow rotation timer ---
        this._startSlideTimer();

        // --- Live clock timer ---
        this._clockTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            1,
            () => {
                this._updateClockDisplay();
                return GLib.SOURCE_CONTINUE;
            },
        );

        // --- Add to desktop layer (above wallpaper, below windows) ---
        // Insert at index 0 of window_group: above the Meta.BackgroundActor
        // that draws the system wallpaper, but below all Meta.WindowActors
        // (normal application windows). On Wayland, Meta.WindowActors render
        // on top regardless of Clutter Z-order within the group, so our actor
        // naturally stays behind all windows.
        global.window_group.insert_child_at_index(this._rootActor, 0);

        console.log('[desktop-rss-wall] actors placed on desktop');
    }

    disable() {
        console.log('[desktop-rss-wall] disabling');

        // Stop file monitors
        this._stopFeedMonitor();
        this._stopImageMonitor();

        // Stop timers
        if (this._rssRefreshTimerId) {
            GLib.source_remove(this._rssRefreshTimerId);
            this._rssRefreshTimerId = 0;
        }
        if (this._slideTimerId) {
            GLib.source_remove(this._slideTimerId);
            this._slideTimerId = 0;
        }
        if (this._clockTimerId) {
            GLib.source_remove(this._clockTimerId);
            this._clockTimerId = null;
        }

        // Disconnect GSettings signals
        if (this._settings && this._signalIds.length > 0) {
            for (const id of this._signalIds) {
                this._settings.disconnect(id);
            }
            this._signalIds = [];
        }
        this._settings = null;

        // Remove actors
        if (this._rootActor) {
            global.window_group.remove_child(this._rootActor);
            this._rootActor.destroy();
            this._rootActor = null;
            this._slideshowBin = null;
            this._slideshowContent = null;
            this._dimOverlay = null;
            this._rssActor = null;
            this._rssBin = null;
            this._rssBox = null;
            this._rssTitleLabel = null;
            this._rssItemLabels = [];
            this._rssSummaryLabels = [];
            this._clockActor = null;
            this._clockBin = null;
            this._clockLabel = null;
        }

        // Unload stylesheet
        if (this._stylesheet) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        console.log('[desktop-rss-wall] disabled — all state cleaned up');
    }

    // ======================================================================
    //  Image cache loading
    // ======================================================================

    _loadImageCache() {
        if (!this._slideshowContent) return;

        // Check existence first to avoid GLib.FileError noise in logs
        if (!GLib.file_test(IMAGE_CACHE_PATH, GLib.FileTest.EXISTS)) {
            console.log('[desktop-rss-wall] images.json not found — no slideshow');
            this._shuffledImages = [];
            this._slideIndex = 0;
            this._clearSlide();
            this._applySlideshowSettings();
            return;
        }

        const [ok, contents] = GLib.file_get_contents(IMAGE_CACHE_PATH);

        if (!ok) {
            console.log('[desktop-rss-wall] images.json unreadable — no slideshow');
            this._shuffledImages = [];
            this._slideIndex = 0;
            this._clearSlide();
            this._applySlideshowSettings();
            return;
        }

        let data;
        try {
            data = JSON.parse(imports.byteArray.toString(contents));
        } catch (e) {
            console.log(`[desktop-rss-wall] images.json parse error: ${e}`);
            this._shuffledImages = [];
            this._slideIndex = 0;
            this._clearSlide();
            this._applySlideshowSettings();
            return;
        }

        if (data.error && !(data.images && data.images.length > 0)) {
            console.log(`[desktop-rss-wall] image cache error: ${data.error}`);
            this._shuffledImages = [];
            this._slideIndex = 0;
            this._clearSlide();
            this._applySlideshowSettings();
            return;
        }

        const images = data.images || [];

        if (images.length === 0) {
            console.log('[desktop-rss-wall] image cache has no images');
            this._shuffledImages = [];
            this._slideIndex = 0;
            this._clearSlide();
            this._applySlideshowSettings();
            return;
        }

        // Shuffle if enabled
        const shuffle = this._settings
            ? this._settings.get_boolean('slideshow-shuffle')
            : true;

        this._shuffledImages = shuffle
            ? this._fisherYatesShuffle([...images])
            : [...images];

        this._slideIndex = 0;
        console.log(`[desktop-rss-wall] loaded ${images.length} image(s), shuffle=${shuffle}`);
        this._advanceSlide();
        this._applySlideshowSettings();
    }

    // ======================================================================
    //  Image file monitor
    // ======================================================================

    _startImageMonitor() {
        try {
            const imageFile = Gio.File.new_for_path(IMAGE_CACHE_PATH);
            this._imageMonitor = imageFile.monitor_file(
                Gio.FileMonitorFlags.NONE,
                null,
            );
            this._imageMonitorId = this._imageMonitor.connect(
                'changed',
                (_monitor, _file, _otherFile, eventType) => {
                    if (
                        eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
                        eventType === Gio.FileMonitorEvent.CREATED
                    ) {
                        console.log('[desktop-rss-wall] images.json changed — reloading');
                        this._loadImageCache();
                    }
                },
            );
            console.log(`[desktop-rss-wall] monitoring ${IMAGE_CACHE_PATH}`);
        } catch (e) {
            console.log(`[desktop-rss-wall] image monitor setup failed: ${e}`);
        }
    }

    _stopImageMonitor() {
        if (this._imageMonitorId && this._imageMonitor) {
            this._imageMonitor.disconnect(this._imageMonitorId);
            this._imageMonitorId = 0;
        }
        if (this._imageMonitor) {
            this._imageMonitor.cancel();
            this._imageMonitor = null;
        }
    }

    // ======================================================================
    //  Slideshow rotation
    // ======================================================================

    _startSlideTimer() {
        if (this._slideTimerId) {
            GLib.source_remove(this._slideTimerId);
            this._slideTimerId = 0;
        }

        const seconds = this._settings
            ? this._settings.get_int('slideshow-interval-seconds')
            : 60;

        if (seconds <= 0) return;

        this._slideTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            seconds,
            () => {
                this._advanceSlide();
                return GLib.SOURCE_CONTINUE;
            },
        );
    }

    _advanceSlide(startingIndex) {
        if (!this._shuffledImages || this._shuffledImages.length === 0) return;

        // Guard against infinite recursion when all images are missing/broken.
        // Track the index we started at so we stop after trying every image once.
        if (startingIndex === undefined) {
            startingIndex = this._slideIndex;
        }

        const entry = this._shuffledImages[this._slideIndex];
        this._slideIndex = (this._slideIndex + 1) % this._shuffledImages.length;

        const success = this._setSlideImage(entry.path);

        if (!success) {
            console.log(`[desktop-rss-wall] skipping missing image: ${entry.path}`);
            // Only try the next one if we haven't looped through every image
            if (this._slideIndex !== startingIndex) {
                this._advanceSlide(startingIndex);
            } else {
                console.log('[desktop-rss-wall] all images missing — clearing slideshow');
                this._clearSlide();
            }
        }
    }

    /**
     * Load and display a single image on the slideshow layer.
     * Returns false if the file could not be loaded (missing, corrupt, etc.).
     */
    _setSlideImage(imagePath) {
        if (!this._slideshowContent) return false;

        try {
            const file = Gio.File.new_for_path(imagePath);
            if (!file.query_exists(null)) {
                return false;
            }

            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(imagePath);
            const imgW = pixbuf.get_width();
            const imgH = pixbuf.get_height();

            const fitMode = this._settings
                ? this._settings.get_string('slideshow-fit-mode')
                : 'cover';

            const [targetW, targetH] = this._computeFitSize(
                imgW, imgH,
                this._screenWidth, this._screenHeight,
                fitMode,
            );

            // Scale pixbuf to target size
            const scaled = pixbuf.scale_simple(
                targetW, targetH,
                GdkPixbuf.InterpType.BILINEAR,
            );

            // Create Clutter.Image from pixel data
            const hasAlpha = scaled.get_has_alpha();
            const image = new Clutter.Image();
            image.set_data(
                scaled.get_pixels(),
                hasAlpha
                    ? Clutter.ImageDataFormat.RGBA_8888
                    : Clutter.ImageDataFormat.RGB_888,
                scaled.get_width(),
                scaled.get_height(),
                scaled.get_rowstride(),
            );

            this._slideshowContent.content = image;
            this._slideshowContent.set_size(targetW, targetH);

            // Position: center for cover/contain/center; top-left for stretch
            this._slideshowContent.x = Math.round((this._screenWidth - targetW) / 2);
            this._slideshowContent.y = Math.round((this._screenHeight - targetH) / 2);

            return true;
        } catch (e) {
            console.log(`[desktop-rss-wall] setSlideImage error for ${imagePath}: ${e.message}`);
            return false;
        }
    }

    /**
     * Compute the target size for an image given the fit mode.
     */
    _computeFitSize(imgW, imgH, screenW, screenH, fitMode) {
        switch (fitMode) {
            case 'cover': {
                const scale = Math.max(screenW / imgW, screenH / imgH);
                return [
                    Math.round(imgW * scale),
                    Math.round(imgH * scale),
                ];
            }
            case 'contain': {
                const scale = Math.min(screenW / imgW, screenH / imgH);
                return [
                    Math.round(imgW * scale),
                    Math.round(imgH * scale),
                ];
            }
            case 'stretch':
                return [screenW, screenH];
            case 'center':
            default:
                return [imgW, imgH];
        }
    }

    _clearSlide() {
        if (!this._slideshowContent) return;
        this._slideshowContent.content = null;
        this._slideshowContent.set_size(0, 0);
    }

    /**
     * Fisher-Yates shuffle — returns the array in-place.
     */
    _fisherYatesShuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // ======================================================================
    //  Slideshow GSettings
    // ======================================================================

    _applySlideshowSettings() {
        if (!this._settings) return;

        const enabled = this._settings.get_boolean('slideshow-enabled');

        // Slideshow visibility
        if (this._slideshowBin) {
            this._slideshowBin.visible = enabled;
        }

        // Dim overlay: only show when slideshow is enabled AND images are loaded
        if (this._dimOverlay) {
            const hasImages = this._shuffledImages && this._shuffledImages.length > 0;
            this._dimOverlay.visible = enabled && hasImages;
            const dimOpacity = this._settings.get_double('dim-overlay-opacity');
            this._dimOverlay.opacity = Math.round(dimOpacity * 255);
        }

        // Opacity
        if (this._slideshowBin && enabled) {
            const opacity = this._settings.get_double('slideshow-opacity');
            this._slideshowBin.opacity = Math.round(opacity * 255);
        }

        // Re-apply current slide with new fit mode
        if (enabled && this._shuffledImages.length > 0) {
            // Re-show current image with updated fit mode
            const idx = (this._slideIndex - 1 + this._shuffledImages.length) %
                this._shuffledImages.length;
            const entry = this._shuffledImages[idx];
            if (entry) {
                this._setSlideImage(entry.path);
            }
        }

        // Restart slide timer (interval may have changed)
        this._startSlideTimer();

        // Shuffle change triggers cache reload
        if (enabled && this._shuffledImages.length > 0) {
            this._slideIndex = 0;
        }

        console.log(
            `[desktop-rss-wall] slideshow → enabled=${enabled} ` +
            `fit=${this._settings.get_string('slideshow-fit-mode')} ` +
            `dim=${this._settings.get_double('dim-overlay-opacity')}`,
        );
    }

    // ======================================================================
    //  Feed file monitor
    // ======================================================================

    _startFeedMonitor() {
        try {
            const feedFile = Gio.File.new_for_path(FEED_CACHE_PATH);
            this._feedMonitor = feedFile.monitor_file(
                Gio.FileMonitorFlags.NONE,
                null,
            );
            this._feedMonitorId = this._feedMonitor.connect(
                'changed',
                (_monitor, _file, _otherFile, eventType) => {
                    if (
                        eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
                        eventType === Gio.FileMonitorEvent.CREATED
                    ) {
                        console.log('[desktop-rss-wall] feed.json changed — reloading');
                        this._loadRssCache();
                    }
                },
            );
            console.log(`[desktop-rss-wall] monitoring ${FEED_CACHE_PATH}`);
        } catch (e) {
            console.log(`[desktop-rss-wall] feed monitor setup failed: ${e}`);
        }
    }

    _stopFeedMonitor() {
        if (this._feedMonitorId && this._feedMonitor) {
            this._feedMonitor.disconnect(this._feedMonitorId);
            this._feedMonitorId = 0;
        }
        if (this._feedMonitor) {
            this._feedMonitor.cancel();
            this._feedMonitor = null;
        }
    }

    // ======================================================================
    //  RSS periodic refresh timer
    // ======================================================================

    _startRssRefreshTimer() {
        const minutes = this._settings
            ? this._settings.get_int('rss-refresh-minutes')
            : 15;
        const seconds = Math.max(1, minutes * 60);

        if (this._rssRefreshTimerId) {
            GLib.source_remove(this._rssRefreshTimerId);
        }

        this._rssRefreshTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            seconds,
            () => {
                console.log('[desktop-rss-wall] periodic RSS reload');
                this._loadRssCache();
                return GLib.SOURCE_CONTINUE;
            },
        );
    }

    // ======================================================================
    //  RSS cache loading + rendering
    // ======================================================================

    _loadRssCache() {
        const sourceMode = this._settings
            ? this._settings.get_string('rss-source-mode')
            : 'feed';

        if (sourceMode === 'file') {
            this._loadStoryFiles();
            return;
        }

        // Feed mode: read from helper-generated feed.json cache
        // Check existence first to avoid GLib.FileError noise in logs
        if (!GLib.file_test(FEED_CACHE_PATH, GLib.FileTest.EXISTS)) {
            console.log('[desktop-rss-wall] feed.json not found — showing placeholder');
            this._renderRssFallback('No feed cache yet.\nRun desktop-rss-wall-helper refresh');
            return;
        }

        const [ok, contents] = GLib.file_get_contents(FEED_CACHE_PATH);

        if (!ok) {
            console.log('[desktop-rss-wall] feed.json unreadable — showing placeholder');
            this._renderRssFallback('Cannot read feed cache.');
            return;
        }

        let data;
        try {
            data = JSON.parse(imports.byteArray.toString(contents));
        } catch (e) {
            console.log(`[desktop-rss-wall] feed.json parse error: ${e}`);
            this._renderRssFallback('Feed cache is corrupt.');
            return;
        }

        if (data.error) {
            console.log(`[desktop-rss-wall] feed cache error: ${data.error}`);
            this._renderRssFallback(`Feed unavailable.\n${data.error}`);
            return;
        }

        const maxItems = this._settings
            ? this._settings.get_int('rss-max-items')
            : 5;

        const title = data.feed_title || 'Untitled Feed';
        const items = (data.items || []).slice(0, maxItems);

        this._renderRssItems(title, items);
    }

    /**
     * File source mode: read JSON story files directly from the configured
     * folder, bypassing the helper cache.  Each .json file contains a batch
     * of stories (one file per date).  We display the most recent file.
     */
    _loadStoryFiles() {
        if (!this._settings) return;

        let folder = this._settings.get_string('rss-file-folder');
        if (!folder) {
            this._renderRssFallback('No story file folder configured.\nSet it in extension preferences.');
            return;
        }

        // Expand ~ to home directory
        if (folder.startsWith('~')) {
            folder = GLib.get_home_dir() + folder.substring(1);
        }

        const dir = Gio.File.new_for_path(folder);
        if (!dir.query_exists(null)) {
            this._renderRssFallback(`Story folder not found:\n${folder}`);
            return;
        }

        // Enumerate .json files, sorted by name
        let files = [];
        try {
            const enumerator = dir.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null,
            );
            let info;
            while ((info = enumerator.next_file(null))) {
                const name = info.get_name();
                if (name.endsWith('.json') && info.get_file_type() === Gio.FileType.REGULAR) {
                    files.push(name);
                }
            }
            enumerator.close(null);
        } catch (e) {
            console.log(`[desktop-rss-wall] story folder read error: ${e}`);
            this._renderRssFallback(`Cannot read story folder:\n${folder}`);
            return;
        }

        files.sort();

        if (files.length === 0) {
            this._renderRssFallback(`No JSON story files found in:\n${folder}`);
            return;
        }

        // Reset index if it's out of bounds (e.g. folder changed, files removed)
        if (this._storyFileIndex >= files.length) {
            this._storyFileIndex = 0;
        }

        // Pick the current file by index (cycling in alphabetical order)
        const currentFile = files[this._storyFileIndex];

        // Advance to next file for the next refresh (round-robin)
        this._storyFileIndex = (this._storyFileIndex + 1) % files.length;

        const filePath = GLib.build_filenamev([folder, currentFile]);

        let data;
        try {
            const [ok, contents] = GLib.file_get_contents(filePath);
            if (!ok) {
                this._renderRssFallback(`Cannot read story file:\n${currentFile}`);
                return;
            }
            data = JSON.parse(imports.byteArray.toString(contents));
        } catch (e) {
            console.log(`[desktop-rss-wall] story file parse error (${currentFile}): ${e}`);
            this._renderRssFallback(`Story file is corrupt:\n${currentFile}`);
            return;
        }

        if (!data || typeof data !== 'object') {
            this._renderRssFallback(`Invalid story file format:\n${currentFile}`);
            return;
        }

        const batchDate = data.date || currentFile.replace('.json', '');
        const stories = data.stories || [];

        const maxItems = this._settings.get_int('rss-max-items');
        const title = `${batchDate} — file ${this._storyFileIndex}/${files.length}`;
        const items = stories.slice(0, maxItems).map(story => ({
            title: story.headline || '(no headline)',
            summary: story.summary || '',
        }));

        if (items.length === 0) {
            this._renderRssFallback(`No stories in:\n${currentFile}`);
            return;
        }

        this._renderRssItems(title, items);
        console.log(`[desktop-rss-wall] loaded ${items.length} story(s) from ${currentFile}`);
    }

    _renderRssItems(title, items) {
        // Tear down old labels (both headline and summary)
        for (const label of this._rssItemLabels) {
            this._rssBox.remove_child(label);
            label.destroy();
        }
        this._rssItemLabels = [];
        for (const label of this._rssSummaryLabels) {
            this._rssBox.remove_child(label);
            label.destroy();
        }
        this._rssSummaryLabels = [];

        this._rssTitleLabel.text = title;
        this._rssTitleLabel.visible = true;

        if (items.length === 0) {
            const emptyLabel = new St.Label({
                text: '(no items)',
                style_class: 'desktop-rss-wall-rss-item',
                x_expand: true,
            });
            this._rssBox.add_child(emptyLabel);
            this._rssItemLabels.push(emptyLabel);
        }

        for (const item of items) {
            // --- Headline label ---
            const headlineText = `\u2022 ${item.title}`;
            const headlineLabel = new St.Label({
                text: headlineText,
                style_class: 'desktop-rss-wall-rss-item',
                x_expand: true,
            });
            headlineLabel.clutter_text.line_wrap = true;
            headlineLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            this._rssBox.add_child(headlineLabel);
            this._rssItemLabels.push(headlineLabel);

            // --- Body / summary label (below headline) ---
            if (item.summary) {
                const bodyLabel = new St.Label({
                    text: item.summary,
                    style_class: 'desktop-rss-wall-rss-summary',
                    x_expand: true,
                });
                bodyLabel.clutter_text.line_wrap = true;
                bodyLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
                this._rssBox.add_child(bodyLabel);
                this._rssSummaryLabels.push(bodyLabel);
            }
        }

        this._applyRssFontStyle();
    }

    _renderRssFallback(message) {
        for (const label of this._rssItemLabels) {
            this._rssBox.remove_child(label);
            label.destroy();
        }
        this._rssItemLabels = [];

        this._rssTitleLabel.text = '';
        this._rssTitleLabel.visible = false;

        const label = new St.Label({
            text: message,
            style_class: 'desktop-rss-wall-rss-fallback',
        });
        this._rssBox.add_child(label);
        this._rssItemLabels.push(label);

        this._applyRssFontStyle();
    }

    // ======================================================================
    //  RSS Settings
    // ======================================================================

    _applyRssSettings() {
        if (!this._settings || !this._rssActor) return;

        const enabled = this._settings.get_boolean('rss-enabled');
        this._rssActor.visible = enabled;
        if (!enabled) {
            console.log('[desktop-rss-wall] rss hidden (rss-enabled=false)');
            return;
        }

        this._rssActor.x = this._settings.get_int('rss-x');
        this._rssActor.y = this._settings.get_int('rss-y');

        const width = this._settings.get_int('rss-width');
        const height = this._settings.get_int('rss-height');
        this._rssBox.width = width;
        this._rssBox.height = height;

        this._rssActor.opacity = Math.round(
            this._settings.get_double('rss-opacity') * 255,
        );

        this._applyRssFontStyle();

        const bgEnabled = this._settings.get_boolean('rss-background-enabled');
        const bgColor = this._settings.get_string('rss-background-color');
        const bgOpacity = this._settings.get_double('rss-background-opacity');

        if (bgEnabled) {
            const {r, g, b} = this._hexToRgb(bgColor);
            this._rssBin.style = [
                `background-color: rgba(${r}, ${g}, ${b}, ${bgOpacity});`,
                'border-radius: 8px;',
                'padding: 12px 16px;',
            ].join(' ');
        } else {
            this._rssBin.style = '';
        }

        console.log(
            `[desktop-rss-wall] rss → x=${this._rssActor.x} y=${this._rssActor.y} ` +
            `w=${width} h=${height} bg=${bgEnabled} enabled=${enabled}`,
        );
    }

    _applyRssFontStyle() {
        if (!this._settings) return;

        const fontFamily = this._settings.get_string('rss-font-family');
        const fontSize = this._settings.get_int('rss-font-size');
        const fontColor = this._settings.get_string('rss-font-color');

        const headlineStyle = [
            `font-family: "${fontFamily}", sans-serif;`,
            `font-size: ${fontSize}px;`,
            `color: ${fontColor};`,
        ].join(' ');

        const summaryFontSize = Math.max(12, fontSize - 4);
        const summaryStyle = [
            `font-family: "${fontFamily}", sans-serif;`,
            `font-size: ${summaryFontSize}px;`,
            `color: ${fontColor};`,
            'opacity: 0.75;',
        ].join(' ');

        if (this._rssTitleLabel) {
            this._rssTitleLabel.style = headlineStyle;
        }

        for (const label of this._rssItemLabels) {
            label.style = headlineStyle;
        }

        for (const label of this._rssSummaryLabels) {
            label.style = summaryStyle;
        }
    }

    // ======================================================================
    //  Clock — live update timer
    // ======================================================================

    _updateClockDisplay() {
        if (!this._clockLabel) return;

        const format = this._settings
            ? this._settings.get_string('clock-format')
            : '%A, %B %-d, %Y  %I:%M %p';

        this._clockLabel.text = this._formatClockDate(new Date(), format);
    }

    _formatClockDate(date, format) {
        try {
            const dt = GLib.DateTime.new_local(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
            );
            return dt.format(format);
        } catch (e) {
            console.log(`[desktop-rss-wall] date format error: ${e}`);
            return date.toLocaleString();
        }
    }

    // ======================================================================
    //  Clock — GSettings applier
    // ======================================================================

    _applyClockSettings() {
        if (!this._settings || !this._clockActor) return;

        const enabled = this._settings.get_boolean('clock-enabled');
        this._clockActor.visible = enabled;
        if (!enabled) {
            console.log('[desktop-rss-wall] clock hidden (clock-enabled=false)');
            return;
        }

        this._clockActor.x = this._settings.get_int('clock-x');
        this._clockActor.y = this._settings.get_int('clock-y');

        this._clockActor.opacity = Math.round(
            this._settings.get_double('clock-opacity') * 255,
        );

        const fontFamily = this._settings.get_string('clock-font-family');
        const fontSize = this._settings.get_int('clock-font-size');
        const fontColor = this._settings.get_string('clock-font-color');

        this._clockLabel.style = [
            `font-family: "${fontFamily}", monospace;`,
            `font-size: ${fontSize}px;`,
            `color: ${fontColor};`,
        ].join(' ');

        const bgEnabled = this._settings.get_boolean('clock-background-enabled');
        const bgColor = this._settings.get_string('clock-background-color');
        const bgOpacity = this._settings.get_double('clock-background-opacity');

        if (bgEnabled) {
            const {r, g, b} = this._hexToRgb(bgColor);
            this._clockBin.style = [
                `background-color: rgba(${r}, ${g}, ${b}, ${bgOpacity});`,
                'border-radius: 8px;',
                'padding: 12px 20px;',
            ].join(' ');
        } else {
            this._clockBin.style = '';
        }

        this._updateClockDisplay();

        console.log(
            `[desktop-rss-wall] clock → x=${this._clockActor.x} y=${this._clockActor.y} ` +
            `font-size=${fontSize} bg=${bgEnabled} enabled=${enabled}`,
        );
    }

    // ======================================================================
    //  Utility
    // ======================================================================

    _hexToRgb(hex) {
        let h = hex.replace('#', '');
        if (h.length === 3) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        if (h.length !== 6) return {r: 255, g: 255, b: 255};

        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16),
        };
    }
}
