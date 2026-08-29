import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('lawyerHomeFx-android.css', () => {
    const css = readFileSync(
        resolve(__dirname, '../lawyerHomeFx-android.css'),
        'utf8',
    );

    it('gates overrides to Capacitor Android only', () => {
        expect(css).toContain("data-hami-native='1'");
        expect(css).toContain("data-hami-platform='android'");
        expect(css).not.toMatch(/data-hami-platform='web'/);
    });

    it('kills home glass blur on native before platform=android settles', () => {
        expect(css).toContain(":not([data-hami-platform='ios']):not([data-hami-platform='android'])");
        expect(css).toContain('backdrop-filter: none');
        expect(css).toContain('.hami-gs-backdrop');
        expect(css).toContain('.hami-notif-overlay-btn');
        expect(css).toContain('.hami-notif-layer');
        expect(css).toContain('translateZ(0)');
    });

    it('strips transparent gradients and uses theme-driven solid card fills', () => {
        expect(css).toContain('--hami-android-card-bg');
        expect(css).toContain('--hami-android-card-elev');
        expect(css).toContain('hami-sovereign-glass');
        expect(css).toContain('--hami-surface-bg');
        expect(css).toContain('transparent');
        expect(css).toContain('--hami-glass-panel-bg');
        expect(css).not.toContain('#243044');
    });

    it('keeps glow off but allows home block pattern overlays on Android', () => {
        expect(css).toContain('.hami-home-block-pattern');
        expect(css).not.toContain('.hami-home-glass-decor');
        expect(css).toMatch(/\.hami-home-block-pattern\s*\{[^}]*display:\s*block/s);
        expect(css).toContain('hami-high-contrast');
        expect(css).toContain('--glass-opacity');
    });

    it('uses solid teal chrome for Tasks Agenda on Android', () => {
        expect(css).toContain("data-testid='tasks-manager'");
        expect(css).toContain("data-testid='tasks-manager-overlay'");
        expect(css).toContain('tasks-week-day-');
        expect(css).toContain('#0f1629');
        expect(css).toContain('#12182b');
        expect(css).toContain('background-image: none');
    });

    it('يرفع شريط الأدوات عن زر النظام على Android', () => {
        expect(css).toContain('--hami-lawyer-header-safe-top');
        expect(css).toContain('--hami-android-status-pad');
        expect(css).toContain('--hami-android-nav-pad');
        expect(css).toContain('.hami-lawyer-header');
        expect(css).toContain("data-testid='transactions-hub'");
        expect(css).not.toMatch(
            /--hami-lawyer-header-offset:\s*calc\(\s*var\(--hami-lawyer-header-content-h/s,
        );
    });

    it('disables radar blur/backdrop on Android WebView', () => {
        expect(css).toContain('.hami-radar-bg-orb');
        expect(css).toContain('.hami-radar-glass-panel');
        expect(css).toContain('.hami-radar-form-panel');
        expect(css).toContain('.hami-forum-publish-fab');
        expect(css).toContain('.hami-forum-surface-enter');
        expect(css).toContain('.hami-forum-feed-card');
        expect(css).toContain('backdrop-filter: none');
        expect(css).toContain('#0a0f1c');
    });

    it('ويب الحرج بلا Android FX؛ native عبر virtual + لا تكرار في deferred-app', () => {
        const stylesRoot = resolve(__dirname, '../../../../../styles');
        const critical = readFileSync(resolve(stylesRoot, 'critical-shell.css'), 'utf8');
        const nativeGate = readFileSync(resolve(stylesRoot, 'critical-native-android.css'), 'utf8');
        const deferred = readFileSync(resolve(stylesRoot, 'deferred-app.css'), 'utf8');
        const index = readFileSync(resolve(stylesRoot, '../index.tsx'), 'utf8');
        expect(critical).not.toMatch(/lawyerHomeFx-android\.css/);
        expect(nativeGate).toMatch(/@import\s+['"].*lawyerHomeFx-android\.css/);
        expect(index).toContain("import 'virtual:hami-critical-native-android'");
        expect(deferred).not.toMatch(/lawyerHomeFx-android\.css/);
    });
});
