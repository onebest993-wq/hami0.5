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
        expect(css).toContain('background-image: none');
        expect(css).toContain('--hami-android-card-bg');
        expect(css).toContain('--hami-android-card-elev');
        expect(css).toContain('hami-sovereign-glass');
        expect(css).toContain('--hami-surface-bg');
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

    it('uses solid navy chrome for Tasks Agenda on Android', () => {
        expect(css).toContain("data-testid='tasks-manager'");
        expect(css).toContain("data-testid='tasks-manager-overlay'");
        expect(css).toContain('tasks-week-day-');
        expect(css).toContain('#0a0f1c');
        expect(css).toContain('background-image: none');
    });

    it('disables radar blur/backdrop on Android WebView', () => {
        expect(css).toContain('.hami-radar-bg-orb');
        expect(css).toContain('.hami-radar-glass-panel');
        expect(css).toContain('.hami-forum-publish-fab');
        expect(css).toContain('.hami-forum-surface-enter');
        expect(css).toContain('.hami-forum-feed-card');
        expect(css).toContain('backdrop-filter: none');
        expect(css).toContain('rgba(20, 8, 14, 0.98)');
    });
});
