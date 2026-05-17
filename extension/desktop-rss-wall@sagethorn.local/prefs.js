/**
 * Desktop RSS Wall — Full Preferences UI
 *
 * Milestone 8: Complete settings for RSS, Clock, and Slideshow.
 * All values bound to GSettings via settings.bind() / _bindComboMapping().
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

        const SOURCE_MODES = ['feed', 'file'];
        const rssSourceMode = this._comboRow(
            'Source Mode',
            'feed = traditional RSS/Atom URL, file = JSON story folder',
            SOURCE_MODES,
        );
        this._bindComboMapping(settings, 'rss-source-mode', rssSourceMode, SOURCE_MODES);
        rssGeneralGroup.add(rssSourceMode);

        const rssUrl = this._entryRow(
            'Feed URL',
            'Full URL to an RSS or Atom feed',
            settings, 'rss-feed-url',
        );
        rssGeneralGroup.add(rssUrl);

        const rssFileFolder = this._entryRow(
            'Story File Folder',
            'Path to a folder containing JSON story files (one .json per date)',
            settings, 'rss-file-folder',
        );
        rssGeneralGroup.add(rssFileFolder);

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
            settings, 'rss-font-family',
        );
        rssAppearanceGroup.add(rssFontFamily);

        const rssFontSize = this._spinRow('Font Size', 'Feed text size in points', 6, 200, 1);
        settings.bind('rss-font-size', rssFontSize, 'value', BIND);
        rssAppearanceGroup.add(rssFontSize);

        const rssFontColor = this._entryRow(
            'Font Color',
            'Hex color, e.g. #ffffff',
            settings, 'rss-font-color',
        );
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
            settings, 'rss-background-color',
        );
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
            settings, 'clock-format',
        );
        clockAppearanceGroup.add(clockFormat);

        const clockFontFamily = this._entryRow(
            'Font Family',
            'Font name, e.g. DejaVu Sans Mono',
            settings, 'clock-font-family',
        );
        clockAppearanceGroup.add(clockFontFamily);

        const clockFontSize = this._spinRow('Font Size', 'Clock font size in points', 8, 200, 1);
        settings.bind('clock-font-size', clockFontSize, 'value', BIND);
        clockAppearanceGroup.add(clockFontSize);

        const clockFontColor = this._entryRow(
            'Font Color',
            'Hex color, e.g. #ffffff',
            settings, 'clock-font-color',
        );
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
            settings, 'clock-background-color',
        );
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
            settings, 'slideshow-folder',
        );
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
        this._bindComboMapping(settings, 'slideshow-fit-mode', slideFitMode, FIT_MODES);
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
     *
     * If settings + key are provided, two-way bind the entry text
     * to the GSettings key via signals.  GSettings.bind() cannot bind
     * to synthetic JS properties — it requires real GObject properties.
     *
     * Usage:
     *   const row = this._entryRow('Title', 'Subtitle', settings, 'key');
     */
    _entryRow(title, subtitle, settings, key) {
        const row = new Adw.ActionRow({title, subtitle});
        const entry = new Gtk.Entry({valign: Gtk.Align.CENTER});
        row.add_suffix(entry);
        row.activatable_widget = entry;
        Object.defineProperty(row, 'text', {
            get() { return entry.text; },
            set(val) { entry.text = val; },
        });
        entry.connect('notify::text', () => { row.notify('text'); });

        if (settings && key) {
            // Read initial value from GSettings
            entry.text = settings.get_string(key);
            // Entry changed → write to GSettings
            entry.connect('notify::text', () => {
                if (settings.get_string(key) !== entry.text)
                    settings.set_string(key, entry.text);
            });
            // GSettings changed externally → update entry
            settings.connect(`changed::${key}`, () => {
                const val = settings.get_string(key);
                if (entry.text !== val)
                    entry.text = val;
            });
        }

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

    /**
     * Bind a GSettings string key ↔ Adw.ComboRow selected index
     * using a choices array as the mapping table.
     *
     * Gio.Settings.bind_with_mapping() does not exist in GJS 1.80.2
     * (GNOME 46), so we implement two-way binding manually via signals.
     */
    _bindComboMapping(settings, key, comboRow, choices) {
        // Read initial value from GSettings → set combo index
        const initial = settings.get_string(key);
        const idx = choices.indexOf(initial);
        comboRow.selected = idx >= 0 ? idx : 0;

        // ComboRow changed → write to GSettings
        comboRow.connect('notify::selected', () => {
            const val = choices[comboRow.selected] || choices[0];
            if (settings.get_string(key) !== val)
                settings.set_string(key, val);
        });

        // GSettings changed externally → update ComboRow
        settings.connect(`changed::${key}`, () => {
            const str = settings.get_string(key);
            const i = choices.indexOf(str);
            if (i >= 0 && comboRow.selected !== i)
                comboRow.selected = i;
        });
    }
}
