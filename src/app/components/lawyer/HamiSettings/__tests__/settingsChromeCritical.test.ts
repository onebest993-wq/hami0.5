import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSettingsChromeBundle } from './readSettingsChromeBundle';

describe('settingsChrome critical layout', () => {
    const css = readSettingsChromeBundle();
    const hub = readFileSync(resolve(__dirname, '../settingsChrome.css'), 'utf8');

    it('يتضمن عرض البطاقات والإطار قبل deferred-app', () => {
        expect(hub).toContain("@import './settingsInstantChrome.css'");
        expect(hub).toContain("@import './settingsChromeOverlay.css'");
        expect(hub).toContain("@import './settingsChromeCards.css'");
        expect(css).toContain("@import './settingsInstantChrome.css'");
        expect(css).toContain('.hami-settings-section-frame');
        expect(css).toContain('max-width: 36rem');
        expect(css).toContain('.hami-setting-glass');
        expect(css).toContain('transition: none');
        expect(css).toContain("html[data-hami-settings-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-settings-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html:not([data-hami-settings-open='1']):not([data-hami-settings-closing='1']) .hami-settings-overlay-host");
        expect(css).not.toMatch(
            /html\[data-hami-settings-open='1'\] \[data-hami-lawyer-dashboard\]\s*\{[^}]*content-visibility:\s*hidden/s,
        );
        expect(css).toContain("html[data-hami-overlay-unfreeze='1'][data-hami-settings-open='1']");
        expect(css).toContain('content-visibility: visible !important');
        expect(css).toContain('translateZ(0)');
        expect(css).toContain("[data-testid='appearance-block-customize-sheet'] [role='radiogroup']");
        expect(css).toContain('.hami-appearance-chapter-panel');
        expect(css).toContain('.hami-appearance-theme-grid');
        expect(css).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
        expect(css).toContain('.hami-appearance-pattern-grid');
        expect(css).toContain("[data-testid='appearance-block-customize-sheet'] .hami-appearance-theme-grid");
        expect(css).toContain("[data-testid='appearance-block-customize-sheet'] .hami-appearance-pattern-grid");
        expect(css).toContain('min-height: 2.75rem');
        expect(css).toContain('min-height: 44px');
        expect(css).toContain('height: 100dvh');
        expect(css).toContain('.hami-settings-sheet-header');
        expect(css).toContain('.hami-settings-sheet-body');
        expect(css).toContain('.hami-settings-sheet-panel');
        expect(css).toContain('.hami-settings-sheet-scrim');
        expect(css).toContain('@media (min-width: 768px)');
        expect(css).toContain('safe-area-inset-left');
        expect(css).toContain('safe-area-inset-right');
        expect(css).toContain('@media (min-width: 1024px)');
        expect(css).toContain('max-width: 42rem');
        expect(css).toContain('.hami-settings-section-frame > [hidden]');
        expect(css).toContain('content-visibility: hidden');
    });
});

describe('settingsInstantChrome phone/tablet insets', () => {
    const css = readFileSync(
        resolve(__dirname, '../settingsInstantChrome.css'),
        'utf8',
    );

    it('يحجز safe-area أفقياً للهيدر ولوحة التمرير', () => {
        expect(css).toContain('safe-area-inset-left');
        expect(css).toContain('safe-area-inset-right');
        expect(css).toContain(':not([data-hami-platform=\'ios\'])');
        expect(css).toContain('backdrop-filter: none');
        expect(css).toContain('min-height: 44px');
        expect(css).toContain('width: min(100%, 22.5rem)');
        expect(css).not.toContain('blur(22px)');
        expect(css).not.toContain('text-shadow');
        expect(css).toContain('.hami-settings-scroll-panel');
        expect(css).toContain('padding-inline-start');
        expect(css).toContain('padding-inline-end');
    });
});
