/**
 * Desktop RSS Wall — GNOME Shell Extension
 *
 * Milestone 2: GSettings-driven desktop text.
 * Actor positions, sizes, and opacity read from GSettings with live updates.
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DesktopRssWallExtension extends Extension {
    enable() {
        console.log('[desktop-rss-wall] enabling');

        this._settings = this.getSettings();
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

        // --- RSS panel placeholder (title label) ---
        this._rssActor = new St.Label({
            text: 'Desktop RSS Wall',
            style_class: 'desktop-rss-wall-title',
        });
        this._rootActor.add_child(this._rssActor);

        // --- Clock placeholder (date label) ---
        this._clockActor = new St.Label({
            text: this._formatDate(new Date()),
            style_class: 'desktop-rss-wall-date',
        });
        this._rootActor.add_child(this._clockActor);

        // --- Apply GSettings ---
        this._applyRssSettings();
        this._applyClockSettings();

        // --- Connect change signals for live updates ---
        const rssKeys = ['rss-x', 'rss-y', 'rss-width', 'rss-height', 'rss-opacity'];
        for (const key of rssKeys) {
            const id = this._settings.connect(`changed::${key}`, () => this._applyRssSettings());
            this._signalIds.push(id);
        }

        const clockKeys = ['clock-x', 'clock-y', 'clock-font-size'];
        for (const key of clockKeys) {
            const id = this._settings.connect(`changed::${key}`, () => this._applyClockSettings());
            this._signalIds.push(id);
        }

        // --- Add to desktop UI layer ---
        Main.layoutManager.uiGroup.add_child(this._rootActor);

        console.log('[desktop-rss-wall] actors placed on desktop');
    }

    disable() {
        console.log('[desktop-rss-wall] disabling');

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
        }

        // Unload stylesheet
        if (this._stylesheet) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        console.log('[desktop-rss-wall] disabled — actors, signals, and stylesheet removed');
    }

    // ------------------------------------------------------------------
    //  GSettings appliers
    // ------------------------------------------------------------------

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

    _applyClockSettings() {
        if (!this._settings || !this._clockActor) return;

        this._clockActor.x = this._settings.get_int('clock-x');
        this._clockActor.y = this._settings.get_int('clock-y');

        const fontSize = this._settings.get_int('clock-font-size');
        this._clockActor.style = `font-size: ${fontSize}px;`;

        console.log(
            `[desktop-rss-wall] clock → x=${this._clockActor.x} y=${this._clockActor.y} ` +
            `font-size=${fontSize}`,
        );
    }

    // ------------------------------------------------------------------
    //  Date formatting
    // ------------------------------------------------------------------

    _formatDate(date) {
        const days = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday',
        ];
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];

        const dayName = days[date.getDay()];
        const monthName = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        return `${dayName}, ${monthName} ${day}, ${year}`;
    }
}
