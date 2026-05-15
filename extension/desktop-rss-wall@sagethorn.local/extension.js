/**
 * Desktop RSS Wall — GNOME Shell Extension
 *
 * Milestone 1: Desktop text proof of concept.
 * Displays "Desktop RSS Wall" and the current date on the desktop.
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DesktopRssWallExtension extends Extension {
    enable() {
        console.log('[desktop-rss-wall] enabling');

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

        // --- Title label ---
        this._titleLabel = new St.Label({
            text: 'Desktop RSS Wall',
            style_class: 'desktop-rss-wall-title',
            x: 80,
            y: 40,
        });

        // --- Date label ---
        this._dateLabel = new St.Label({
            text: this._formatDate(new Date()),
            style_class: 'desktop-rss-wall-date',
            x: 80,
            y: 90,
        });

        this._rootActor.add_child(this._titleLabel);
        this._rootActor.add_child(this._dateLabel);

        // --- Add to desktop UI layer ---
        Main.layoutManager.uiGroup.add_child(this._rootActor);

        console.log('[desktop-rss-wall] actors placed on desktop');
    }

    disable() {
        console.log('[desktop-rss-wall] disabling');

        // Remove actors
        if (this._rootActor) {
            Main.layoutManager.uiGroup.remove_child(this._rootActor);
            this._rootActor.destroy();
            this._rootActor = null;
            this._titleLabel = null;
            this._dateLabel = null;
        }

        // Unload stylesheet
        if (this._stylesheet) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        console.log('[desktop-rss-wall] disabled — actors and stylesheet removed');
    }

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
