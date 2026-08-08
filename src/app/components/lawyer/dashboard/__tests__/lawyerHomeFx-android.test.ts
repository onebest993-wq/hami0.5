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
        expect(css).toContain('.hami-home-glass-decor');
        expect(css).toContain('.hami-hub-glow-orb');
        expect(css).toContain('.hami-home-block-pattern');
        expect(css).toMatch(/\.hami-home-block-pattern\s*\{[^}]*display:\s*block/s);
        expect(css).toContain('hami-high-contrast');
        expect(css).toContain('--glass-opacity');
    });

    it('uses solid teal chrome for Tasks Agenda on Android', () => {
        expect(css).toContain("data-testid='tasks-manager'");
        expect(css).toContain("data-testid='tasks-manager-overlay'");
        expect(css).toContain('tasks-week-day-');
        expect(css).toContain('#1a4348');
        expect(css).toContain('#332c25');
        expect(css).toContain('background-image: none');
    });

    it('ينزّل الهيدر عن شريط الحالة على Android', () => {
        expect(css).toContain('--hami-lawyer-header-safe-top');
        expect(css).toContain('--hami-android-status-pad');
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

    it('يُستورد من critical-shell فقط — لا تكرار في deferred-app', () => {
        const stylesRoot = resolve(__dirname, '../../../../../styles');
        const critical = readFileSync(resolve(stylesRoot, 'critical-shell.css'), 'utf8');
        const deferred = readFileSync(resolve(stylesRoot, 'deferred-app.css'), 'utf8');
        expect(critical).toMatch(/@import\s+['"].*lawyerHomeFx-android\.css/);
        expect(deferred).not.toMatch(/@import\s+['"].*lawyerHomeFx-android\.css/);
    });
});
