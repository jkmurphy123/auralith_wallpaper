/**
 * Desktop RSS Wall — GNOME Shell Extension
 *
 * Milestone 3: Live-updating clock widget with full GSettings support.
 * Actor positions, sizes, fonts, colors, opacity, and background box
 * all read from GSettings with live updates.
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DesktopRssWallExtension extends Extension {
    enable() {
        console.log('[desktop-rss-wall] enabling');

        this._settings = this.getSettings(
            'org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local',
        );
        this._signalIds = [];

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
        //  RSS panel
        // ==================================================================
        this._rssActor = new St.Label({
            text: 'Desktop RSS Wall',
            style_class: 'desktop-rss-wall-title',
        });
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
        const rssKeys = ['rss-x', 'rss-y', 'rss-width', 'rss-height', 'rss-opacity'];
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

        console.log('[desktop-rss-wall] disabled — actors, signals, timer, and stylesheet removed');
    }

    // ======================================================================
    //  RSS Settings
    // ======================================================================

    _applyRssSettings() {
        if (!this._settings || !this._rssActor) return;

        this._rssActor.x = this._settings.get_int('rss-x');
        this._rssActor.y = this._settings.get_int('rss-y');
        this._rssActor.width = this._settings.get_int('rss-width');
        this._rssActor.clutter_text.ellipsize = 3; // PANGO_ELLIPSIZE_END
        this._rssActor.opacity = Math.round(
            this._settings.get_double('rss-opacity') * 255,
        );

        console.log(
            `[desktop-rss-wall] rss → x=${this._rssActor.x} y=${this._rssActor.y} ` +
            `w=${this._rssActor.width} opacity=${this._rssActor.opacity}`,
        );
    }

    // ======================================================================
    //  Clock — live update timer
    // ======================================================================

    /**
     * Called every second by the GLib timeout to refresh the displayed time.
     */
    _updateClockDisplay() {
        if (!this._clockLabel) return;

        const format = this._settings
            ? this._settings.get_string('clock-format')
            : '%A, %B %-d, %Y  %I:%M %p';

        this._clockLabel.text = this._formatClockDate(new Date(), format);
    }

    /**
     * Format a JavaScript Date using GLib.DateTime and strftime-style format.
     */
    _formatClockDate(date, format) {
        try {
            const dt = GLib.DateTime.new_local(
                date.getFullYear(),
                date.getMonth() + 1,   // GLib months are 1-based
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
            );
            return dt.format(format);
        } catch (e) {
            console.log(`[desktop-rss-wall] date format error: ${e}`);
            // Fallback to simple ISO-ish string on format error
            return date.toLocaleString();
        }
    }

    // ======================================================================
    //  Clock — GSettings applier (position, appearance, visibility)
    // ======================================================================

    _applyClockSettings() {
        if (!this._settings || !this._clockActor) return;

        // Visibility
        const enabled = this._settings.get_boolean('clock-enabled');
        this._clockActor.visible = enabled;
        if (!enabled) {
            console.log('[desktop-rss-wall] clock hidden (clock-enabled=false)');
            return;
        }

        // Position
        this._clockActor.x = this._settings.get_int('clock-x');
        this._clockActor.y = this._settings.get_int('clock-y');

        // Opacity
        this._clockActor.opacity = Math.round(
            this._settings.get_double('clock-opacity') * 255,
        );

        // Font & color (inline style on label, overrides stylesheet defaults)
        const fontFamily = this._settings.get_string('clock-font-family');
        const fontSize = this._settings.get_int('clock-font-size');
        const fontColor = this._settings.get_string('clock-font-color');

        this._clockLabel.style = [
            `font-family: "${fontFamily}", monospace;`,
            `font-size: ${fontSize}px;`,
            `color: ${fontColor};`,
        ].join(' ');

        // Background box
        const bgEnabled = this._settings.get_boolean('clock-background-enabled');
        const bgColor = this._settings.get_string('clock-background-color');
        const bgOpacity = this._settings.get_double('clock-background-opacity');

        if (bgEnabled) {
            // Parse hex color and apply opacity
            const {r, g, b} = this._hexToRgb(bgColor);
            this._clockBin.style = [
                `background-color: rgba(${r}, ${g}, ${b}, ${bgOpacity});`,
                'border-radius: 8px;',
                'padding: 12px 20px;',
            ].join(' ');
        } else {
            this._clockBin.style = '';
        }

        // Refresh the display text now (format may have changed)
        this._updateClockDisplay();

        console.log(
            `[desktop-rss-wall] clock → x=${this._clockActor.x} y=${this._clockActor.y} ` +
            `font-size=${fontSize} bg=${bgEnabled} enabled=${enabled}`,
        );
    }

    /**
     * Parse a hex color string like '#ff8800' or '#abc' to {r, g, b}.
     * Returns {r: 255, g: 255, b: 255} on parse failure.
     */
    _hexToRgb(hex) {
        let h = hex.replace('#', '');
        // Expand shorthand #abc → #aabbcc
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
