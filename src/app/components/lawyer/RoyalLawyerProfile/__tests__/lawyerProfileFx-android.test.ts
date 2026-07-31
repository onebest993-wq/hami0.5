import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('lawyerProfileFx-android.css', () => {
    const css = readFileSync(
        resolve(__dirname, '../lawyerProfileFx-android.css'),
        'utf8',
    );

    it('gates overrides to Capacitor Android only', () => {
        expect(css).toContain("data-hami-native='1'");
        expect(css).toContain("data-hami-platform='android'");
        expect(css).not.toMatch(/data-hami-platform='web'/);
    });

    it('strips blur/glow and uses short elevation', () => {
        expect(css).toContain('hami-profile-ambient-glow');
        expect(css).toContain('hami-profile-hero-aurora');
        expect(css).toContain('backdrop-filter: none');
        expect(css).toContain('--hami-profile-android-elev');
        expect(css).toContain('hami-profile-portrait-ring');
        expect(css).toContain('hami-profile-accent-btn-solid');
        expect(css).toContain('display: none');
    });

    it('flattens studio interaction demos and locks profile overscroll', () => {
        expect(css).toContain('lawyer-profile-tab-shell');
        expect(css).toContain('overscroll-behavior: none');
        expect(css).toContain('profile-studio-text-interaction-card__demo');
        expect(css).toContain('animation: none');
        expect(css).toContain('profile-settings-scroll-panel');
    });

    it('strips canvas silk-veil blur on Android', () => {
        expect(css).toContain('profile-text-canvas__silk-veil');
        expect(css).toContain('profile-text-canvas__content--interactive');
        expect(css).toContain('backdrop-filter: none');
    });

    it('flattens all canvas glow variants and image drop-shadows', () => {
        expect(css).toContain('profile-text-canvas--glow-soft');
        expect(css).toContain('profile-text-canvas--glow-gold');
        expect(css).toContain('profile-text-canvas--masked');
        expect(css).toContain('profile-image-frame-wrap--glow-soft');
        expect(css).toContain('profile-image-frame-wrap--glow-gold');
        expect(css).toContain('[data-profile-settings-sheet]');
        expect(css).toMatch(/0 -2px 8px/);
    });

    it('flattens studio appearance chips and luxury cards on Android', () => {
        expect(css).toContain('profile-settings-luxury-card');
        expect(css).toContain('profile-settings-material-chip');
        expect(css).toContain('profile-settings-color-swatch');
        expect(css).toContain('background-image: none');
    });

    it('kills studio demo backdrop-filter on Android', () => {
        expect(css).toContain('profile-studio-text-interaction-card__demo');
        const demoBlock = css.slice(
            css.indexOf('profile-studio-text-interaction-card__demo'),
            css.indexOf('profile-studio-glow-chip__orb'),
        );
        expect(demoBlock).toContain('backdrop-filter: none');
    });
});
