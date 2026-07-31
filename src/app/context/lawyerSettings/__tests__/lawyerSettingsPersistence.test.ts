import { describe, expect, it } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { AppSettingsState } from '@/app/services/settings/types';
import {
    homeLayoutStableKey,
    settingsHydrateEqual,
    stripWallpaperForStorage,
} from '@/app/context/lawyerSettings/lawyerSettingsPersistence';

function cloneSettings(overrides?: Partial<AppSettingsState>): AppSettingsState {
    const base = structuredClone(LAWYER_SETTINGS_V2_DEFAULTS);
    if (!overrides) return base;
    return {
        ...base,
        ...overrides,
        appearance: { ...base.appearance, ...overrides.appearance },
        security: { ...base.security, ...overrides.security },
        data: { ...base.data, ...overrides.data },
        performance: { ...base.performance, ...overrides.performance },
        homeLayout: { ...base.homeLayout, ...overrides.homeLayout },
    };
}

describe('lawyerSettingsPersistence', () => {
    describe('stripWallpaperForStorage', () => {
        it('يزيل wallpaper من الحالة المُخزَّنة', () => {
            const state = cloneSettings({
                appearance: {
                    ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                    wallpaper: 'data:image/png;base64,abc',
                },
            });
            const stripped = stripWallpaperForStorage(state);
            expect(stripped.appearance.wallpaper).toBeUndefined();
            expect(stripped.appearance.theme).toBe(state.appearance.theme);
        });

        it('لا يغيّر الحالة إن لم يكن wallpaper مضمّناً', () => {
            const state = cloneSettings();
            expect(stripWallpaperForStorage(state)).toBe(state);
        });
    });

    describe('homeLayoutStableKey', () => {
        it('يتغيّر عند تغيير dockVisible', () => {
            const a = cloneSettings();
            const b = cloneSettings({
                homeLayout: { ...a.homeLayout, dockVisible: !a.homeLayout.dockVisible },
            });
            expect(homeLayoutStableKey(a.homeLayout)).not.toBe(homeLayoutStableKey(b.homeLayout));
        });
    });

    describe('settingsHydrateEqual', () => {
        it('يعتبر حالتين متطابقتين متساويتين', () => {
            const a = cloneSettings();
            const b = cloneSettings();
            expect(settingsHydrateEqual(a, b)).toBe(true);
        });

        it('يتجاهل wallpaper المضمّن في المقارنة', () => {
            const a = cloneSettings({
                appearance: {
                    ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                    wallpaper: 'data:image/png;base64,x',
                },
            });
            const b = cloneSettings();
            expect(settingsHydrateEqual(a, b)).toBe(true);
        });

        it('يكتشف تغيير security', () => {
            const a = cloneSettings();
            const b = cloneSettings({
                security: { ...a.security, privacyBlur: !a.security.privacyBlur },
            });
            expect(settingsHydrateEqual(a, b)).toBe(false);
        });

        it('يكتشف تغيير performance', () => {
            const a = cloneSettings();
            const b = cloneSettings({
                performance: { ...a.performance, litePerformance: !a.performance.litePerformance },
            });
            expect(settingsHydrateEqual(a, b)).toBe(false);
        });
    });
});
