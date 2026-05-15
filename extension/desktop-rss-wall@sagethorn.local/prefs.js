/**
 * Desktop RSS Wall — Preferences
 *
 * Milestone 0: Empty preferences window.
 * Future milestones will add settings controls.
 */

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DesktopRssWallPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Milestone 2 will populate this with settings controls
        window.set_default_size(500, 400);
    }
}
