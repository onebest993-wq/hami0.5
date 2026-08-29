import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('lawyerHomeFx-critical', () => {
    const css = readFileSync(
        resolve(__dirname, '../lawyerHomeFx-critical.css'),
        'utf8',
    );

    it('يتضمن قواعد rim/accent اللازمة لأول رسم بلا FOUC', () => {
        expect(css).toContain('.hami-sovereign-rim');
        expect(css).toContain('.hami-sovereign-glass::before');
        expect(css).toContain('[data-hami-block].hami-sovereign-glass');
        expect(css).toContain('.hami-home-block-solid');
        expect(css).toContain('border: 1px solid');
        expect(css).toContain('--hami-android-status-pad');
        expect(css).toContain('--hami-android-nav-pad');
        expect(css).toContain("[data-testid='home-main-grid'] [data-hami-block]");
        expect(css).toContain("[data-testid='header-toolbar-nav']");
        expect(css).toContain('data-hami-tools-open');
        expect(css).toContain('.hami-header-tools-reveal');
        expect(css).toContain('.hami-header-tools-reveal__burst');
        expect(css).toContain('hami-tool-bloom');
        expect(css).toContain("data-hami-tools-bloom='1'");
        expect(css).toContain('drop-shadow(0 0 3px rgba(230, 198, 115, 0.38))');
        expect(css).not.toContain('drop-shadow(0 0 7px rgba(230, 198, 115, 0.72))');
        expect(css).not.toContain('backdrop-filter: blur');
        expect(css).not.toContain('hami-sovereign-aurora');
        expect(css).not.toContain('0 12px 48px rgba(0, 0, 0, 0.4)');
        expect(css).toContain('--hami-lawyer-header-content-h: 3.75rem');
        expect(css).toContain('--hami-lawyer-header-toolbar-chrome');
        expect(css).toContain('--hami-lawyer-header-clearance');
        expect(css).toContain('.hami-header-tools-reveal__caret');
        expect(css).not.toContain('--hami-lawyer-header-tools-open-h');
        expect(css).toMatch(
            /\.hami-below-lawyer-header\s*\{[^}]*hami-lawyer-header-clearance/s,
        );
        expect(css).toContain('data-hami-home-container-border');
        expect(css).toContain("[data-hami-block-border='0'] .hami-home-themed-border");
        expect(css).toContain("[data-hami-block-border='0'].hami-home-themed-border");
        expect(css).toContain("[data-hami-block][data-hami-block-border='0'].hami-home-themed-border");
        expect(css).toContain('border-width: 0');
        expect(css).toContain('.hami-forum-overlay-layer');
        expect(css).toContain('.hami-forum-overlay-layer--visible');
        expect(css).toContain('hami-dashboard-tab-preserve');
        expect(css).toContain('.hami-below-lawyer-header');
        expect(css).toMatch(
            /\[data-testid='lawyer-dashboard-ready'\]\s*\{\s*padding-top:\s*0\s*!important;/s,
        );
        expect(css).toMatch(/\.hami-lawyer-header\s*\{[^}]*background-color:\s*transparent/s);
        expect(css).toContain('--hami-lawyer-header-offset');
        expect(css).toContain("html[data-hami-settings-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-settings-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-settings-open='1']):not([data-hami-settings-closing='1']) .hami-settings-overlay-host");
        expect(css).toContain("html[data-hami-notifications-open='1'] .hami-lawyer-header");
        expect(css).toContain("html[data-hami-native='1'][data-hami-notifications-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-global-search-open='1'] .hami-lawyer-header");
        expect(css).toContain("html[data-hami-native='1'][data-hami-global-search-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-global-search-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-global-search-open='1']):not([data-hami-global-search-closing='1']) .hami-gs-layer");
        expect(css).toContain("html[data-hami-transactions-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-transactions-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-transactions-open='1']):not([data-hami-transactions-closing='1']) .hami-tx-overlay-layer");
        expect(css).toContain("data-hami-transactions-closing='1'");
        expect(css).not.toContain("data-hami-tx-enter='1'");
        expect(css).not.toContain("data-hami-forum-enter='1'");
        expect(css).not.toContain("data-hami-repository-enter='1'");
        expect(css).not.toContain("data-hami-tasks-manager-enter='1'");
        expect(css).not.toContain("data-hami-schedule-enter='1'");
        expect(css).not.toContain('hami-home-slot-enter');
        expect(css).toContain("html:not([data-hami-field-tasks-open='1']):not([data-hami-field-tasks-closing='1']) [data-field-tasks-root]");
        expect(css).toContain("html[data-hami-field-tasks-open='1'] .hami-home-scroll-root");
        expect(css).toContain("html[data-hami-tasks-manager-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-tasks-manager-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-tasks-manager-open='1']):not([data-hami-tasks-manager-closing='1']) [data-testid='tasks-manager-overlay']");
        expect(css).toContain("html[data-hami-repository-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-repository-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-repository-open='1']):not([data-hami-repository-closing='1']) .hami-repository-overlay-layer");
        expect(css).toContain("html[data-hami-forum-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-forum-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-forum-open='1']):not([data-hami-forum-closing='1']) .hami-forum-overlay-layer");
        expect(css).toContain("html[data-hami-overlay-unfreeze='1'][data-hami-settings-open='1']");
        expect(css).toContain('content-visibility: visible !important');
        expect(css).not.toMatch(
            /html\[data-hami-global-search-open='1'\] \[data-hami-lawyer-dashboard\]\s*\{[^}]*content-visibility:\s*hidden/s,
        );
        expect(css).toContain('لا content-visibility:hidden على اللوحة');
        expect(css).toContain("html[data-hami-initial-boot='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain('--hami-lawyer-header-safe-top');
        expect(css).toContain('.hami-overlay-safe-insets');
        expect(css).toContain('.hami-overlay-header-safe-pad');
        expect(css).toContain('.hami-home-main-zone-pad');
        expect(css).toContain('--hami-home-main-zone-pad-top: 0.85rem');
        expect(css).toContain('--hami-home-hub-empty-slot-h: 6.75rem');
        expect(css).toContain('grid-column: span 3 / span 3');
        expect(css).toContain('repeat(3, minmax(0, 1fr))');
        expect(css).toContain('--hami-home-forum-row-h');
        expect(css).toContain('--hami-home-hub-row-h');
        expect(css).toContain('--hami-home-board-gap');
        expect(css).toContain(":has([data-testid='home-hub-card'])::after");
        expect(css).not.toContain('color-mix(in srgb, #e6c673 38%, transparent)');
        expect(css).toContain('-webkit-line-clamp: 2');
        expect(css).toContain('container-name: forum-profile-name');
        expect(css).toContain('grid-auto-rows: max-content');
        expect(css).toContain('grid-column: span 2 / span 2');
        expect(css).not.toContain('grid-auto-rows: minmax(5.35rem, 1fr)');
        expect(css).not.toContain('hami-home-destination-reveal');
        expect(css).not.toContain('.hami-home-dock-zone');
        expect(css).not.toContain('--hami-home-dock-scroll-pad');
        expect(css).not.toMatch(
            /\[data-hami-lawyer-dashboard\][^{]*\{[^}]*--hami-lawyer-header-offset/s,
        );
        expect(css).toContain('.hami-forum-overlay-layer');
        expect(css).toContain('[data-testid=\'forum-overlay-host\']');
        expect(css).not.toContain('[data-testid=\'forum-screen-loading\']');
        expect(css).not.toContain('[data-testid=\'forum-instant-shell\']');
        expect(css).toContain('#0a0f1c');
        expect(css).not.toMatch(/\.hami-sovereign-glass\s*\{[^}]*transition:/s);
        expect(css).toContain("section[data-testid='home-hub-card']");
        expect(css).toContain("[data-testid='home-hub-card-skeleton']");
        expect(css).not.toContain('.hami-home-hub-entry-layer');
        expect(css).not.toContain("[data-testid='home-hub-entry-tile']");
        expect(css).toContain('.hami-hub-tabs');
        expect(css).toContain('.hami-hub-tab__pill');
        expect(css).toContain('.hami-hub-readable-panels');
        expect(css).not.toContain('.hami-hub-skeleton-tabs');
        expect(css).not.toContain('.hami-hub-skeleton-body');
        expect(css).toMatch(
            /\[data-testid='home-hub-card-skeleton'\] \.hami-hub-readable-panels\s*\{[^}]*flex:\s*0 0 auto/s,
        );
        expect(css).toContain('--hami-home-hub-empty-slot-h');
        expect(css).toContain("[data-hub-has-items='1']");
        expect(css).toMatch(
            /\[data-hub-has-items='1'\]\[data-hub-boot-settling='0'\][^{]*\{[^}]*min-height:\s*240px/s,
        );
        expect(css).toMatch(
            /\[data-testid='home-hub-card-skeleton'\]\s*\{[^}]*min-height:\s*var\(--hami-home-hub-empty-slot-h\)/s,
        );
        expect(css).toMatch(
            /section\[data-testid='home-hub-card'\]\s*\{[^}]*min-height:\s*var\(--hami-home-hub-empty-slot-h\)/s,
        );
        expect(css).toMatch(
            /\[data-testid='home-hub-card'\] \.hami-hub-tabs,[\s\S]*?min-height:\s*44px/s,
        );
        expect(css).toMatch(/\.hami-hub-empty\s*\{[^}]*min-height:\s*44px/s);
        expect(css).not.toMatch(
            /section\[data-testid='home-hub-card'\],\s*\[data-testid='home-hub-card-skeleton'\]\s*\{[^}]*min-height:\s*240px/s,
        );
        expect(css).not.toMatch(
            /\[data-testid='home-hub-card-skeleton'\]\s*\{[^}]*min-height:\s*240px/s,
        );
        expect(css).not.toMatch(
            /\[data-testid='home-hub-card-skeleton'\]\[data-hub-has-items='1'\][^{]*\{[^}]*min-height:\s*240px/s,
        );
        expect(css).not.toMatch(
            /\[data-hub-boot-settling='1'\]\s*\{[^}]*min-height:\s*240px/s,
        );
        expect(css).toMatch(
            /\[data-hub-boot-settling='1'\]\[data-hub-has-items='1'\]\s*\{[^}]*min-height:\s*var\(--hami-home-hub-empty-slot-h\)/s,
        );
        expect(css).not.toMatch(
            /\[data-testid='home-hub-card'\]\s+\.hami-hub-readable-panels\s*\{[^}]*min-height:\s*15rem/s,
        );
        expect(css).toContain('min(520px, calc(100vw - 3rem))');
        expect(css).toContain('min(580px, calc(100vw - 3.5rem))');
        expect(css).toContain('min(640px, calc(100vw - 4rem))');
        expect(css).toContain('min(800px, calc(100vw - 4rem))');
        expect(css).toContain('.hami-shell-overlay-column');
        expect(css).toMatch(/\.hami-lawyer-header\s*\{[^}]*overflow:\s*visible/s);
        expect(css).toContain('.hami-lawyer-header > .hami-shell-container');
        expect(css).toMatch(
            /\[data-testid='header-toolbar-nav'\]\[data-hami-tools-open='1'\]\s*\{[^}]*max-width:\s*100%/s,
        );
        expect(css).toMatch(/\.hami-home-scroll-root\s*\{[^}]*height:\s*100%/s);
        expect(css).toMatch(/\.hami-home-scroll-root\s*\{[^}]*overflow-anchor:\s*none/s);
        expect(css).toMatch(/\.hami-home-scroll-root\s*\{[^}]*scrollbar-gutter:\s*stable/s);
        expect(css).not.toMatch(/\.hami-home-scroll-root\s*\{[^}]*height:\s*fit-content/s);
        expect(css).not.toContain('text-wrap: balance');
        expect(css).toMatch(
            /html\[data-hami-wallpaper='1'\][^{]*\.hami-sovereign-glass\s*\{[^}]*backdrop-filter:\s*none/s,
        );
    });

    it('deferred-app لا يعيد تشكيل جذر التمرير أو زجاج اللوحة بعد الكشف', () => {
        const deferred = readFileSync(resolve(__dirname, '../lawyerHomeFx.css'), 'utf8');
        const featureOpen = readFileSync(resolve(__dirname, '../homeFeatureOpenFx.css'), 'utf8');
        const dockShell = readFileSync(resolve(__dirname, '../homeDockShellFx.css'), 'utf8');
        const overlayMotion = readFileSync(
            resolve(__dirname, '../lawyerHomeFx-overlayMotion.css'),
            'utf8',
        );
        expect(deferred).toContain("@import './homeFeatureOpenFx.css'");
        expect(deferred).not.toContain("@import './homeLayoutEditFx.css'");
        expect(deferred).toContain("@import './homeDockShellFx.css'");
        expect(deferred).toContain("@import './lawyerHomeFx-overlayMotion.css'");
        expect(existsSync(resolve(__dirname, '../homeLayoutEditFx.css'))).toBe(false);
        expect(deferred).not.toContain('@keyframes hami-sovereign-aurora');
        expect(deferred).not.toContain('.hami-repository-overlay {');
        expect(deferred).not.toContain('.hami-settings-header');
        for (const extra of [featureOpen, dockShell, overlayMotion]) {
            expect(extra).not.toMatch(/^\.hami-home-scroll-root\s*\{/m);
            expect(extra).not.toMatch(/\.hami-home-scroll-root\s*\{[^}]*height:\s*fit-content/s);
            expect(extra).not.toContain('#6366f1');
            expect(extra).not.toContain('@keyframes hami-sovereign-aurora');
            expect(extra).not.toContain('.hami-repository-overlay {');
            expect(extra).not.toContain('.hami-settings-header');
        }
        expect(overlayMotion).toContain("data-hami-tx-enter='1'");
        expect(overlayMotion).toContain("data-hami-forum-enter='1'");
        expect(overlayMotion).toContain("data-hami-repository-enter='1'");
        expect(overlayMotion).toContain("data-hami-tasks-manager-enter='1'");
        expect(overlayMotion).toContain("data-hami-schedule-enter='1'");
        expect(overlayMotion).not.toContain('hami-home-slot-enter');
        expect(featureOpen).toContain("html[data-hami-feature-open='1'] .hami-home-scroll-root");
        expect(css).toContain('var(--hami-secondary, #b8943f)');
        expect(css).toMatch(
            /\[data-hami-block\]\.hami-sovereign-glass\s*\{[^}]*--hami-block-surface-bg/s,
        );
        expect(css).toMatch(/\.hami-home-scroll-root\s*\{[^}]*height:\s*100%/s);
    });
});
