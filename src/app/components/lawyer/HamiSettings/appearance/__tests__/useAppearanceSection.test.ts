import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';

const patchAppearance = vi.fn();
const patchPerformance = vi.fn();
const patchGlobalGlassTransparency = vi.fn();
const setCurrentTheme = vi.fn();
const setCurrentShape = vi.fn();
const persistWallpaper = vi.fn();
const success = vi.fn();
const info = vi.fn();
const error = vi.fn();

let appearanceState = { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance };
let performanceState = { ...LAWYER_SETTINGS_V2_DEFAULTS.performance };
let homeLayoutState = { ...LAWYER_SETTINGS_V2_DEFAULTS.homeLayout };

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsAppearance: () => appearanceState,
    useLawyerSettingsPerformance: () => performanceState,
    useLawyerSettingsHomeLayout: () => homeLayoutState,
    useLawyerSettingsActions: () => ({
        setCurrentTheme,
        setCurrentShape,
    }),
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches', () => ({
    useSettingsPatches: () => ({
        patchAppearance,
        patchPerformance,
        patchGlobalGlassTransparency,
    }),
}));

vi.mock('@/app/services/settings', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings')>();
    return {
        ...actual,
        persistWallpaper: (...args: unknown[]) => persistWallpaper(...args),
        resolveWallpaperSrc: () => undefined,
    };
});

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: (...args: unknown[]) => success(...args),
        info: (...args: unknown[]) => info(...args),
        error: (...args: unknown[]) => error(...args),
    },
}));

import { useAppearanceSection } from '@/app/components/lawyer/HamiSettings/appearance/useAppearanceSection';

describe('useAppearanceSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        appearanceState = { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance };
        performanceState = { ...LAWYER_SETTINGS_V2_DEFAULTS.performance };
        homeLayoutState = { ...LAWYER_SETTINGS_V2_DEFAULTS.homeLayout };
        persistWallpaper.mockReturnValue(true);
    });

    it('selectTheme يوحّد اللون على اللوحة والبطاقات والنقوش', () => {
        const { result } = renderHook(() => useAppearanceSection());
        act(() => result.current.selectTheme('navy'));
        expect(patchAppearance).toHaveBeenCalledWith(
            expect.objectContaining({
                theme: 'navy',
                cardTheme: 'navy',
                patternTheme: 'navy',
                brandColor: expect.any(String),
            }),
        );
    });

    it('removeWallpaper يمسح التخزين ويحدّث المظهر', () => {
        const { result } = renderHook(() => useAppearanceSection());
        let ok = false;
        act(() => {
            ok = result.current.removeWallpaper();
        });
        expect(ok).toBe(true);
        expect(persistWallpaper).toHaveBeenCalledWith(undefined);
        expect(patchAppearance).toHaveBeenCalledWith(
            expect.objectContaining({ wallpaper: undefined, wallpaperStamp: expect.any(Number) }),
        );
        expect(info).toHaveBeenCalled();
    });
});
