/**
 * Desktop RSS Wall — GNOME Shell Extension
 *
 * Milestone 5: RSS display panel reads feed.json, renders title + items,
 * and watches for cache updates via GFileMonitor + periodic timer.
 */
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Paths
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), 'desktop-rss-wall']);
const FEED_CACHE_PATH = GLib.build_filenamev([CACHE_DIR, 'feed.json']);

export default class DesktopRssWallExtension extends Extension {
    enable() {
        console.log('[desktop-rss-wall] enabling');

        this._settings = this.getSettings(
            'org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local',
        );
        this._signalIds = [];
        this._feedMonitor = null;
        this._feedMonitorId = 0;
        this._rssRefreshTimerId = 0;
        this._rssItemLabels = [];

        // --- Load stylesheet ---
        const sheet = this.dir.get_child('stylesheet.css');
        if (sheet.query_exists(null)) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().load_stylesheet(sheet);
            this._stylesheet = sheet;
            console.log('[desktop-rss-wall] stylesheet loaded');
        }

        // --- Create root container ---
        this._rootActor = new Clutter.Actor({
            name: 'desktop-rss-wall-root',
            reactive: false,
            x: 0,
            y: 0,
        });

        // ==================================================================
        //  RSS panel — structured layout with background box
        // ==================================================================
        this._rssActor = new Clutter.Actor({
            name: 'desktop-rss-wall-rss-actor',
            reactive: false,
        });

        // Background bin
        this._rssBin = new St.Bin({
            name: 'desktop-rss-wall-rss-bin',
            style_class: 'desktop-rss-wall-rss-panel',
            x_expand: false,
            y_expand: false,
        });
        this._rssActor.add_child(this._rssBin);

        // Vertical box for title + items
        this._rssBox = new St.BoxLayout({
            name: 'desktop-rss-wall-rss-box',
            style_class: 'desktop-rss-wall-rss-box',
            vertical: true,
            x_expand: false,
            y_expand: false,
        });

        // Feed title label
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
        this._applyRssSettings();
        this._applyClockSettings();

        // --- Connect change signals for live updates ---
        const rssKeys = [
            'rss-x', 'rss-y', 'rss-width', 'rss-height', 'rss-opacity',
            'rss-enabled', 'rss-max-items',
            'rss-font-family', 'rss-font-size', 'rss-font-color',
            'rss-background-enabled', 'rss-background-color', 'rss-background-opacity',
        ];
        for (const key of rssKeys) {
            const id = this._settings.connect(
                `changed::${key}`,
                () => this._applyRssSettings(),
            );
            this._signalIds.push(id);
        }

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

        // --- Load initial RSS cache ---
        this._loadRssCache();

        // --- Watch feed.json for changes (helper writes to it) ---
        this._startFeedMonitor();

        // --- Periodic RSS reload (safety net if monitor misses an update) ---
        this._startRssRefreshTimer();

        // --- Start live clock timer (update every second) ---
        this._clockTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            1,
            () => {
                this._updateClockDisplay();
                return GLib.SOURCE_CONTINUE;
            },
        );

        // --- Add to desktop UI layer ---
        Main.layoutManager.uiGroup.add_child(this._rootActor);

        console.log('[desktop-rss-wall] actors placed on desktop');
    }

    disable() {
        console.log('[desktop-rss-wall] disabling');

        // Stop file monitor
        this._stopFeedMonitor();

        // Stop RSS refresh timer
        if (this._rssRefreshTimerId) {
            GLib.source_remove(this._rssRefreshTimerId);
            this._rssRefreshTimerId = 0;
        }

        // Stop clock timer
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
            Main.layoutManager.uiGroup.remove_child(this._rootActor);
            this._rootActor.destroy();
            this._rootActor = null;
            this._rssActor = null;
            this._rssBin = null;
            this._rssBox = null;
            this._rssTitleLabel = null;
            this._rssItemLabels = [];
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

        console.log('[desktop-rss-wall] disabled — actors, signals, timers, monitor, and stylesheet removed');
    }

    // ======================================================================
    //  Feed file monitor
    // ======================================================================

    _startFeedMonitor() {
        try {
            const feedFile = Gio.File.new_for_path(FEED_CACHE_PATH);
            this._feedMonitor = feedFile.monitor_file(
                Gio.FileMonitorFlags.NONE,
                null,  // cancellable
            );
            this._feedMonitorId = this._feedMonitor.connect(
                'changed',
                (_monitor, _file, _otherFile, eventType) => {
                    // CHANGED = 0, CHANGES_DONE_HINT = 1, DELETED = 2, CREATED = 3
                    if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
                        eventType === Gio.FileMonitorEvent.CREATED) {
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
        const [ok, contents] = GLib.file_get_contents(FEED_CACHE_PATH);

        if (!ok) {
            console.log('[desktop-rss-wall] feed.json not found — showing placeholder');
            this._renderRssFallback('No feed cache yet.\nRun desktop-rss-wall-helper fetch-rss');
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

        // If the helper wrote an error, show it gracefully
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
     * Render the RSS panel with a feed title and list of items.
     */
    _renderRssItems(title, items) {
        // Clear old item labels
        for (const label of this._rssItemLabels) {
            this._rssBox.remove_child(label);
            label.destroy();
        }
        this._rssItemLabels = [];

        // Feed title
        this._rssTitleLabel.text = title;
        this._rssTitleLabel.visible = true;

        if (items.length === 0) {
            const emptyLabel = new St.Label({
                text: '(no items)',
                style_class: 'desktop-rss-wall-rss-item',
            });
            this._rssBox.add_child(emptyLabel);
            this._rssItemLabels.push(emptyLabel);
        }

        for (const item of items) {
            const text = `\u2022 ${item.title}`;  // bullet
            const label = new St.Label({
                text,
                style_class: 'desktop-rss-wall-rss-item',
            });
            this._rssBox.add_child(label);
            this._rssItemLabels.push(label);
        }

        // Re-apply font styling to all labels
        this._applyRssFontStyle();
    }

    /**
     * Render fallback text when feed cache is missing or in error state.
     */
    _renderRssFallback(message) {
        // Clear old item labels
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

        // Visibility
        const enabled = this._settings.get_boolean('rss-enabled');
        this._rssActor.visible = enabled;
        if (!enabled) {
            console.log('[desktop-rss-wall] rss hidden (rss-enabled=false)');
            return;
        }

        // Position
        this._rssActor.x = this._settings.get_int('rss-x');
        this._rssActor.y = this._settings.get_int('rss-y');

        // Width / height on the container box
        const width = this._settings.get_int('rss-width');
        const height = this._settings.get_int('rss-height');
        this._rssBox.width = width;
        this._rssBox.height = height;

        // Opacity
        this._rssActor.opacity = Math.round(
            this._settings.get_double('rss-opacity') * 255,
        );

        // Font & color (inline style on labels)
        this._applyRssFontStyle();

        // Background box
        const bgEnabled = this._settings.get_boolean('rss-background-enabled');
        const bgColor = this._settings.get_string('rss-background-color');
        const bgOpacity = this._settings.get_double('rss-background-opacity');

        if (bgEnabled) {
            const {r, g, b} = this._hexToRgb(bgColor);
            const bgCornerRadius = 8;
            this._rssBin.style = [
                `background-color: rgba(${r}, ${g}, ${b}, ${bgOpacity});`,
                `border-radius: ${bgCornerRadius}px;`,
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

        const style = [
            `font-family: "${fontFamily}", sans-serif;`,
            `font-size: ${fontSize}px;`,
            `color: ${fontColor};`,
        ].join(' ');

        // Title label
        if (this._rssTitleLabel) {
            this._rssTitleLabel.style = style;
        }

        // Item/fallback labels
        for (const label of this._rssItemLabels) {
            label.style = style;
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
    //  Clock — GSettings applier (position, appearance, visibility)
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
