/**
 * Desktop RSS Wall — GNOME Shell Extension
 *
 * Milestone 0: Skeleton extension that logs enable/disable.
 * Future milestones will add desktop widgets, clock, and slideshow.
 */

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DesktopRssWallExtension extends Extension {
    enable() {
        console.log('[desktop-rss-wall] enabled');
    }

    disable() {
        console.log('[desktop-rss-wall] disabled');
    }
}
