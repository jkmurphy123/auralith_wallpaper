/**
 * Desktop RSS Wall — Full Preferences UI
 *
 * Milestone 8: Complete settings for RSS, Clock, and Slideshow.
 * All values bound to GSettings via settings.bind() / bind_with_mapping().
 */
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const BIND = Gio.SettingsBindFlags.DEFAULT;

const FIT_MODES = ['cover', 'contain', 'stretch', 'center'];

export default class DesktopRssWallPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(580, 720);

        const settings = this.getSettings(
            'org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local',
        );

        // ====================================================================
        //  RSS Panel Page
        // ====================================================================
        const rssPage = new Adw.PreferencesPage({
            title: 'RSS Panel',
            icon_name: 'network-rss-symbolic',
        });
        window.add(rssPage);

        // -- General --------------------------------------------------------
        const rssGeneralGroup = new Adw.PreferencesGroup({title: 'General'});
        rssPage.add(rssGeneralGroup);

        const rssEnabled = new Adw.SwitchRow({
            title: 'Show RSS Panel',
            subtitle: 'Display the RSS feed on the desktop',
        });
        settings.bind('rss-enabled', rssEnabled, 'active', BIND);
        rssGeneralGroup.add(rssEnabled);

        const rssUrl = this._entryRow(
            'Feed URL',
            'Full URL to an RSS or Atom feed',
        );
        settings.bind('rss-feed-url', rssUrl, 'text', BIND);
        rssGeneralGroup.add(rssUrl);

        const rssRefresh = this._spinRow(
            'Refresh Interval',
            'Minutes between feed fetches (helper must run on schedule)',
            1, 1440, 1,
        );
        settings.bind('rss-refresh-minutes', rssRefresh, 'value', BIND);
        rssGeneralGroup.add(rssRefresh);

        const rssMaxItems = this._spinRow(
            'Max Items',
            'Maximum number of feed items to show',
            1, 50, 1,
        );
        settings.bind('rss-max-items', rssMaxItems, 'value', BIND);
        rssGeneralGroup.add(rssMaxItems);

        // -- Position -------------------------------------------------------
        const rssPosGroup = new Adw.PreferencesGroup({title: 'Position'});
        rssPage.add(rssPosGroup);

        const rssX = this._spinRow('Horizontal Position', 'Pixels from left edge', 0, 4000, 10);
        settings.bind('rss-x', rssX, 'value', BIND);
        rssPosGroup.add(rssX);

        const rssY = this._spinRow('Vertical Position', 'Pixels from top edge', 0, 4000, 10);
        settings.bind('rss-y', rssY, 'value', BIND);
        rssPosGroup.add(rssY);

        // -- Size -----------------------------------------------------------
        const rssSizeGroup = new Adw.PreferencesGroup({title: 'Size'});
        rssPage.add(rssSizeGroup);

        const rssWidth = this._spinRow('Width', 'Panel width in pixels', 100, 4000, 10);
        settings.bind('rss-width', rssWidth, 'value', BIND);
        rssSizeGroup.add(rssWidth);

        const rssHeight = this._spinRow('Height', 'Panel height in pixels', 50, 4000, 10);
        settings.bind('rss-height', rssHeight, 'value', BIND);
        rssSizeGroup.add(rssHeight);

        // -- Appearance -----------------------------------------------------
        const rssAppearanceGroup = new Adw.PreferencesGroup({title: 'Appearance'});
        rssPage.add(rssAppearanceGroup);

        const rssFontFamily = this._entryRow(
            'Font Family',
            'Font name, e.g. DejaVu Sans',
        );
        settings.bind('rss-font-family', rssFontFamily, 'text', BIND);
        rssAppearanceGroup.add(rssFontFamily);

        const rssFontSize = this._spinRow('Font Size', 'Feed text size in points', 6, 200, 1);
        settings.bind('rss-font-size', rssFontSize, 'value', BIND);
        rssAppearanceGroup.add(rssFontSize);

        const rssFontColor = this._entryRow(
            'Font Color',
            'Hex color, e.g. #ffffff',
        );
        settings.bind('rss-font-color', rssFontColor, 'text', BIND);
        rssAppearanceGroup.add(rssFontColor);

        const rssOpacity = this._spinRowFloat(
            'Opacity',
            '0.0 = transparent, 1.0 = opaque',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('rss-opacity', rssOpacity, 'value', BIND);
        rssAppearanceGroup.add(rssOpacity);

        // -- Background Box -------------------------------------------------
        const rssBgGroup = new Adw.PreferencesGroup({title: 'Background Box'});
        rssPage.add(rssBgGroup);

        const rssBgEnabled = new Adw.SwitchRow({
            title: 'Show Background',
            subtitle: 'Draw a rounded box behind the feed text',
        });
        settings.bind('rss-background-enabled', rssBgEnabled, 'active', BIND);
        rssBgGroup.add(rssBgEnabled);

        const rssBgColor = this._entryRow(
            'Background Color',
            'Hex color, e.g. #000000',
        );
        settings.bind('rss-background-color', rssBgColor, 'text', BIND);
        rssBgGroup.add(rssBgColor);

        const rssBgOpacity = this._spinRowFloat(
            'Background Opacity',
            '0.0 = fully transparent, 1.0 = solid',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('rss-background-opacity', rssBgOpacity, 'value', BIND);
        rssBgGroup.add(rssBgOpacity);

        // ====================================================================
        //  Clock Page
        // ====================================================================
        const clockPage = new Adw.PreferencesPage({
            title: 'Clock',
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(clockPage);

        // -- General --------------------------------------------------------
        const clockEnableGroup = new Adw.PreferencesGroup({title: 'General'});
        clockPage.add(clockEnableGroup);

        const clockEnabled = new Adw.SwitchRow({
            title: 'Show Clock',
            subtitle: 'Display the clock on the desktop',
        });
        settings.bind('clock-enabled', clockEnabled, 'active', BIND);
        clockEnableGroup.add(clockEnabled);

        // -- Position -------------------------------------------------------
        const clockPosGroup = new Adw.PreferencesGroup({title: 'Position'});
        clockPage.add(clockPosGroup);

        const clockX = this._spinRow('Horizontal Position', 'Pixels from left edge', 0, 4000, 10);
        settings.bind('clock-x', clockX, 'value', BIND);
        clockPosGroup.add(clockX);

        const clockY = this._spinRow('Vertical Position', 'Pixels from top edge', 0, 4000, 10);
        settings.bind('clock-y', clockY, 'value', BIND);
        clockPosGroup.add(clockY);

        // -- Appearance -----------------------------------------------------
        const clockAppearanceGroup = new Adw.PreferencesGroup({title: 'Appearance'});
        clockPage.add(clockAppearanceGroup);

        const clockFormat = this._entryRow(
            'Date/Time Format',
            'strftime format, e.g. %A, %B %-d, %Y  %I:%M %p',
        );
        settings.bind('clock-format', clockFormat, 'text', BIND);
        clockAppearanceGroup.add(clockFormat);

        const clockFontFamily = this._entryRow(
            'Font Family',
            'Font name, e.g. DejaVu Sans Mono',
        );
        settings.bind('clock-font-family', clockFontFamily, 'text', BIND);
        clockAppearanceGroup.add(clockFontFamily);

        const clockFontSize = this._spinRow('Font Size', 'Clock font size in points', 8, 200, 1);
        settings.bind('clock-font-size', clockFontSize, 'value', BIND);
        clockAppearanceGroup.add(clockFontSize);

        const clockFontColor = this._entryRow(
            'Font Color',
            'Hex color, e.g. #ffffff',
        );
        settings.bind('clock-font-color', clockFontColor, 'text', BIND);
        clockAppearanceGroup.add(clockFontColor);

        const clockOpacity = this._spinRowFloat(
            'Opacity',
            '0.0 = transparent, 1.0 = opaque',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('clock-opacity', clockOpacity, 'value', BIND);
        clockAppearanceGroup.add(clockOpacity);

        // -- Background Box -------------------------------------------------
        const clockBgGroup = new Adw.PreferencesGroup({title: 'Background Box'});
        clockPage.add(clockBgGroup);

        const clockBgEnabled = new Adw.SwitchRow({
            title: 'Show Background',
            subtitle: 'Draw a rounded box behind the clock text',
        });
        settings.bind('clock-background-enabled', clockBgEnabled, 'active', BIND);
        clockBgGroup.add(clockBgEnabled);

        const clockBgColor = this._entryRow(
            'Background Color',
            'Hex color, e.g. #000000',
        );
        settings.bind('clock-background-color', clockBgColor, 'text', BIND);
        clockBgGroup.add(clockBgColor);

        const clockBgOpacity = this._spinRowFloat(
            'Background Opacity',
            '0.0 = fully transparent, 1.0 = solid',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('clock-background-opacity', clockBgOpacity, 'value', BIND);
        clockBgGroup.add(clockBgOpacity);

        // ====================================================================
        //  Slideshow Page
        // ====================================================================
        const slidePage = new Adw.PreferencesPage({
            title: 'Slideshow',
            icon_name: 'image-x-generic-symbolic',
        });
        window.add(slidePage);

        // -- General --------------------------------------------------------
        const slideGeneralGroup = new Adw.PreferencesGroup({title: 'General'});
        slidePage.add(slideGeneralGroup);

        const slideEnabled = new Adw.SwitchRow({
            title: 'Show Slideshow',
            subtitle: 'Display images as a desktop wallpaper layer',
        });
        settings.bind('slideshow-enabled', slideEnabled, 'active', BIND);
        slideGeneralGroup.add(slideEnabled);

        const slideFolder = this._entryRow(
            'Image Folder',
            'Path to a folder containing images',
        );
        settings.bind('slideshow-folder', slideFolder, 'text', BIND);
        slideGeneralGroup.add(slideFolder);

        const slideSubfolders = new Adw.SwitchRow({
            title: 'Include Subfolders',
            subtitle: 'Also index images in nested directories',
        });
        settings.bind('slideshow-include-subfolders', slideSubfolders, 'active', BIND);
        slideGeneralGroup.add(slideSubfolders);

        const slideShuffle = new Adw.SwitchRow({
            title: 'Shuffle',
            subtitle: 'Randomize image order on each cache load',
        });
        settings.bind('slideshow-shuffle', slideShuffle, 'active', BIND);
        slideGeneralGroup.add(slideShuffle);

        const slideInterval = this._spinRow(
            'Slide Interval',
            'Seconds between image transitions',
            5, 3600, 5,
        );
        settings.bind('slideshow-interval-seconds', slideInterval, 'value', BIND);
        slideGeneralGroup.add(slideInterval);

        // -- Appearance -----------------------------------------------------
        const slideAppearanceGroup = new Adw.PreferencesGroup({title: 'Appearance'});
        slidePage.add(slideAppearanceGroup);

        const slideOpacity = this._spinRowFloat(
            'Opacity',
            '0.0 = transparent, 1.0 = opaque',
            0.0, 1.0, 0.05, 2,
        );
        settings.bind('slideshow-opacity', slideOpacity, 'value', BIND);
        slideAppearanceGroup.add(slideOpacity);

        const slideFitMode = this._comboRow(
            'Fit Mode',
            'How images are sized to the screen',
            FIT_MODES,
        );
        settings.bind_with_mapping(
            'slideshow-fit-mode',
            slideFitMode,
            'selected',
            Gio.SettingsBindFlags.DEFAULT,
            // get: GSettings string → ComboRow index
            (value) => {
                const str = value.get_string();
                const idx = FIT_MODES.indexOf(str);
                return new GLib.Variant('i', idx >= 0 ? idx : 0);
            },
            // set: ComboRow index → GSettings string
            (value) => {
                const idx = value.get_int32();
                return new GLib.Variant('s', FIT_MODES[idx] || FIT_MODES[0]);
            },
        );
        slideAppearanceGroup.add(slideFitMode);

        const dimOverlayOpacity = this._spinRowFloat(
            'Dim Overlay Opacity',
            'Dark overlay between slideshow and text (0.0 = none)',
            0.0, 0.5, 0.01, 2,
        );
        settings.bind('dim-overlay-opacity', dimOverlayOpacity, 'value', BIND);
        slideAppearanceGroup.add(dimOverlayOpacity);
    }

    /**
     * Create an entry row with title + subtitle.
     *
     * Adw.EntryRow's subtitle property is not available in some libadwaita
     * builds (the Ubuntu 1.5.0-1ubuntu2 package was cut before upstream
     * added it).  Compose Adw.ActionRow + Gtk.Entry as a workaround.
     * A synthetic 'text' property proxies to the inner Gtk.Entry so
     * GSettings.bind('key', row, 'text') keeps working.
     */
    _entryRow(title, subtitle) {
        const row = new Adw.ActionRow({title, subtitle});
        const entry = new Gtk.Entry({valign: Gtk.Align.CENTER});
        row.add_suffix(entry);
        row.activatable_widget = entry;
        Object.defineProperty(row, 'text', {
            get() { return entry.text; },
            set(val) { entry.text = val; },
        });
        entry.connect('notify::text', () => { row.notify('text'); });
        return row;
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

    /**
     * Create an Adw.ComboRow with a string list model.
     */
    _comboRow(title, subtitle, choices) {
        const model = new Gtk.StringList({strings: choices});
        return new Adw.ComboRow({
            title,
            subtitle,
            model,
        });
    }
}
