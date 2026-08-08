import { describe, expect, it, beforeEach } from 'vitest';
import {
    applyBootSurfacePaint,
    applyBootSurfacePaintFromStorage,
    BOOT_SURFACE_PAINT_KEY,
    BOOT_SURFACE_PAINT_SESSION_KEY,
    persistBootSurfacePaintFromDom,
    readBootSurfacePaintCache,
    type BootSurfacePaintV1,
} from '@/app/services/settings/bootSurfacePaintCache';
import { applySettingsToDom } from '@/app/services/settings/apply';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';

const SAMPLE: BootSurfacePaintV1 = {
    v: 1,
    boardBg: '#120D18',
    surfaceBg: '#120D18',
    primary: '#B08AD4',
    secondary: '#8B6BB8',
    cardBg: '#120D18',
    glassBase: '#120D18',
    glassOpacity: '0.38',
    theme: 'purple',
    wallpaper: '0',
};

describe('bootSurfacePaintCache', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.documentElement.style.cssText = '';
        document.documentElement.removeAttribute('data-hami-theme');
        document.documentElement.removeAttribute('data-hami-wallpaper');
        document.body.style.backgroundColor = '';
    });

    it('يطبّق اللقطة على document قبل React', () => {
        applyBootSurfacePaint(SAMPLE);
        expect(document.documentElement.style.getPropertyValue('--hami-board-surface-bg')).toBe('#120D18');
        expect(document.documentElement.style.getPropertyValue('--hami-primary')).toBe('#B08AD4');
        expect(document.documentElement.dataset.hamiTheme).toBe('purple');
        expect(document.body.style.backgroundColor).toBe('rgb(18, 13, 24)');
    });

    it('يحفظ ويستعيد من localStorage', () => {
        localStorage.setItem(BOOT_SURFACE_PAINT_KEY, JSON.stringify(SAMPLE));
        expect(applyBootSurfacePaintFromStorage()).toBe(true);
        expect(readBootSurfacePaintCache()?.theme).toBe('purple');
    });

    it('يفضّل sessionStorage على localStorage', () => {
        const goldSample = { ...SAMPLE, theme: 'gold', boardBg: '#0B1021', surfaceBg: '#0B1021' };
        localStorage.setItem(BOOT_SURFACE_PAINT_KEY, JSON.stringify(goldSample));
        sessionStorage.setItem(BOOT_SURFACE_PAINT_SESSION_KEY, JSON.stringify(SAMPLE));
        expect(readBootSurfacePaintCache()?.theme).toBe('purple');
    });

    it('يُحدَّث بعد applySettingsToDom', () => {
        applySettingsToDom({
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                theme: 'purple',
            },
        });
        persistBootSurfacePaintFromDom();
        const cached = readBootSurfacePaintCache();
        expect(cached?.theme).toBe('purple');
        expect(cached?.primary).toBe('#B08AD4');
    });
});
