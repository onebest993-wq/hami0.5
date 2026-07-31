import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';

const patchAppearance = vi.fn();
const patchPerformance = vi.fn();
const patchHomeLayout = vi.fn();
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
        patchHomeLayout,
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

    it('selectTheme يستدعي setCurrentTheme', () => {
        const { result } = renderHook(() => useAppearanceSection());
        act(() => result.current.selectTheme('navy'));
        expect(setCurrentTheme).toHaveBeenCalledWith('navy');
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

    it('toggleDockVisible يحدّث homeLayout عند الإخفاء', () => {
        homeLayoutState = {
            ...LAWYER_SETTINGS_V2_DEFAULTS.homeLayout,
            dockVisible: true,
            placements: LAWYER_SETTINGS_V2_DEFAULTS.homeLayout.placements,
            dockHiddenWidgetIds: [],
        };
        const { result } = renderHook(() => useAppearanceSection());
        act(() => result.current.toggleDockVisible(false));
        expect(patchHomeLayout).toHaveBeenCalled();
        expect(info).toHaveBeenCalled();
    });

    it('patternControlsDisabled عندما لا wallpaper و preset=none', () => {
        appearanceState = {
            ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
            backgroundPreset: 'none',
        };
        const { result } = renderHook(() => useAppearanceSection());
        expect(result.current.patternControlsDisabled).toBe(true);
    });
});
