import { describe, expect, it } from 'vitest';
import { hexToRgba, resolveSettingsShellStyle } from '../settingsShellStyle';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings';
import type { AppSettingsState } from '@/app/services/settings';

const baseAppearance = {
    theme: 'emerald',
    themeMode: 'dark',
    language: 'ar',
    backgroundPreset: 'none',
    backgroundPatternOpacity: 0.5,
} as AppSettingsState['appearance'];

describe('resolveSettingsShellStyle', () => {
    it('يتبع لون خلفية الثيم المختار (زمردي) مع تظليل زجاجي للهيدر', () => {
        const style = resolveSettingsShellStyle(baseAppearance);
        expect(style.shellBg).toBe(LAWYER_THEME_TOKENS.emerald.bg);
        expect(style.headerTint).toBe(hexToRgba(LAWYER_THEME_TOKENS.emerald.bg, 0.16));
        expect(style.hasWallpaper).toBe(false);
    });

    it('مع خلفية: shell شفاف وheaderTint معتم ثابت', () => {
        const style = resolveSettingsShellStyle({
            ...baseAppearance,
            theme: 'matcha',
            wallpaperStamp: 1,
            wallpaper: 'data:image/png;base64,xx',
        } as AppSettingsState['appearance']);
        expect(style.shellBg).toBe('transparent');
        expect(style.hasWallpaper).toBe(true);
        expect(style.headerTint).toBe('rgba(11, 16, 33, 0.88)');
    });

    it('الذهبي الملكي يستخدم سطح الثيم الذهبي', () => {
        const style = resolveSettingsShellStyle({
            ...baseAppearance,
            theme: 'gold',
        } as AppSettingsState['appearance']);
        expect(style.shellBg).toBe(LAWYER_THEME_TOKENS.gold.bg);
        expect(style.headerTint).toBe(hexToRgba(LAWYER_THEME_TOKENS.gold.bg, 0.16));
    });
});
