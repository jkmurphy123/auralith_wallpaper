/**
 * Desktop RSS Wall — Preferences
 *
 * Milestone 3: Full clock controls.
 * Values are bound to GSettings via `settings.bind()`.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DesktopRssWallPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(550, 700);

        const settings = this.getSettings(
            'org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local',
        );
        const flags = Gio.SettingsBindFlags.DEFAULT;

        // ====================================================================
        //  RSS Panel Page
        // ====================================================================
        const rssPage = new Adw.PreferencesPage({
            title: 'RSS Panel',
            icon_name: 'network-rss-symbolic',
        });
        window.add(rssPage);

        // -- Position --
        const rssPosGroup = new Adw.PreferencesGroup({title: 'Position'});
        rssPage.add(rssPosGroup);

        const rssX = this._spinRow('Horizontal Position', 'Pixels from left edge', 0, 4000, 10);
        settings.bind('rss-x', rssX, 'value', flags);
        rssPosGroup.add(rssX);

        const rssY = this._spinRow('Vertical Position', 'Pixels from top edge', 0, 4000, 10);
        settings.bind('rss-y', rssY, 'value', flags);
        rssPosGroup.add(rssY);

        // -- Size --
        const rssSizeGroup = new Adw.PreferencesGroup({title: 'Size'});
        rssPage.add(rssSizeGroup);

        const rssWidth = this._spinRow('Width', 'Panel width in pixels', 100, 4000, 10);
        settings.bind('rss-width', rssWidth, 'value', flags);
        rssSizeGroup.add(rssWidth);

        const rssHeight = this._spinRow('Height', 'Panel height in pixels', 50, 4000, 10);
        settings.bind('rss-height', rssHeight, 'value', flags);
        rssSizeGroup.add(rssHeight);

        // -- Appearance --
        const rssAppearanceGroup = new Adw.PreferencesGroup({title: 'Appearance'});
        rssPage.add(rssAppearanceGroup);

        const rssOpacity = this._spinRowFloat(
            'Opacity',
            '0.0 = transparent, 1.0 = opaque',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('rss-opacity', rssOpacity, 'value', flags);
        rssAppearanceGroup.add(rssOpacity);

        // ====================================================================
        //  Clock Page
        // ====================================================================
        const clockPage = new Adw.PreferencesPage({
            title: 'Clock',
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(clockPage);

        // -- Enable --
        const clockEnableGroup = new Adw.PreferencesGroup({title: 'General'});
        clockPage.add(clockEnableGroup);

        const clockEnabled = new Adw.SwitchRow({
            title: 'Show Clock',
            subtitle: 'Display the clock on the desktop',
        });
        settings.bind('clock-enabled', clockEnabled, 'active', flags);
        clockEnableGroup.add(clockEnabled);

        // -- Position --
        const clockPosGroup = new Adw.PreferencesGroup({title: 'Position'});
        clockPage.add(clockPosGroup);

        const clockX = this._spinRow('Horizontal Position', 'Pixels from left edge', 0, 4000, 10);
        settings.bind('clock-x', clockX, 'value', flags);
        clockPosGroup.add(clockX);

        const clockY = this._spinRow('Vertical Position', 'Pixels from top edge', 0, 4000, 10);
        settings.bind('clock-y', clockY, 'value', flags);
        clockPosGroup.add(clockY);

        // -- Appearance --
        const clockAppearanceGroup = new Adw.PreferencesGroup({title: 'Appearance'});
        clockPage.add(clockAppearanceGroup);

        const clockFormat = new Adw.EntryRow({
            title: 'Date/Time Format',
            subtitle: 'strftime format, e.g. %A, %B %-d, %Y  %I:%M %p',
        });
        settings.bind('clock-format', clockFormat, 'text', flags);
        clockAppearanceGroup.add(clockFormat);

        const clockFontFamily = new Adw.EntryRow({
            title: 'Font Family',
            subtitle: 'Font name, e.g. DejaVu Sans Mono',
        });
        settings.bind('clock-font-family', clockFontFamily, 'text', flags);
        clockAppearanceGroup.add(clockFontFamily);

        const clockFontSize = this._spinRow('Font Size', 'Clock font size in points', 8, 200, 1);
        settings.bind('clock-font-size', clockFontSize, 'value', flags);
        clockAppearanceGroup.add(clockFontSize);

        const clockFontColor = new Adw.EntryRow({
            title: 'Font Color',
            subtitle: 'Hex color, e.g. #ffffff',
        });
        settings.bind('clock-font-color', clockFontColor, 'text', flags);
        clockAppearanceGroup.add(clockFontColor);

        const clockOpacity = this._spinRowFloat(
            'Opacity',
            '0.0 = transparent, 1.0 = opaque',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('clock-opacity', clockOpacity, 'value', flags);
        clockAppearanceGroup.add(clockOpacity);

        // -- Background Box --
        const clockBgGroup = new Adw.PreferencesGroup({title: 'Background Box'});
        clockPage.add(clockBgGroup);

        const clockBgEnabled = new Adw.SwitchRow({
            title: 'Show Background',
            subtitle: 'Draw a rounded box behind the clock text',
        });
        settings.bind('clock-background-enabled', clockBgEnabled, 'active', flags);
        clockBgGroup.add(clockBgEnabled);

        const clockBgColor = new Adw.EntryRow({
            title: 'Background Color',
            subtitle: 'Hex color, e.g. #000000',
        });
        settings.bind('clock-background-color', clockBgColor, 'text', flags);
        clockBgGroup.add(clockBgColor);

        const clockBgOpacity = this._spinRowFloat(
            'Background Opacity',
            '0.0 = fully transparent, 1.0 = solid',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('clock-background-opacity', clockBgOpacity, 'value', flags);
        clockBgGroup.add(clockBgOpacity);
    }

    /**
     * Create an Adw.SpinRow for integer values.
     */
    _spinRow(title, subtitle, lower, upper, step) {
        return new Adw.SpinRow({
            title,
            subtitle,
            adjustment: new Gtk.Adjustment({lower, upper, step_increment: step}),
        });
    }

    /**
     * Create an Adw.SpinRow for float values with configurable decimal digits.
     */
    _spinRowFloat(title, subtitle, lower, upper, step, digits) {
        return new Adw.SpinRow({
            title,
            subtitle,
            adjustment: new Gtk.Adjustment({lower, upper, step_increment: step}),
            digits,
        });
    }
}
