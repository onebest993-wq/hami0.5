import { useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    BACKGROUND_PRESETS,
    normalizeBackgroundPreset,
    persistWallpaper,
    resolveLawyerSurfaceBaseColor,
    patternIntensityToOpacity,
    opacityToPatternIntensity,
    PATTERN_INTENSITY_PRESETS,
    type AppSettingsState,
    type BackgroundPresetId,
} from '@/app/services/settings';
import { pickCollapsedItems } from '@/app/components/lawyer/HamiSettings/components/collapseList';
import type { ThemeKey } from '@/app/types/common';
import { PATTERN_COLLAPSED_COUNT } from './appearanceConstants';

type PatchAppearance = (partial: Partial<AppSettingsState['appearance']>) => void;

type ThemeToken = { primary: string };

export function useAppearancePatternControls(
    appearance: AppSettingsState['appearance'],
    patchAppearance: PatchAppearance,
    wallpaper: {
        wallpaperSrc?: string;
        hasWallpaper: boolean;
        clearWallpaperPreview: () => void;
    },
    cardThemeKey: ThemeKey,
    patternThemeToken: ThemeToken,
) {
    const [patternsExpanded, setPatternsExpanded] = useState(false);

    const activePreset = normalizeBackgroundPreset(appearance.backgroundPreset);
    const previewBaseColor = resolveLawyerSurfaceBaseColor(cardThemeKey, 'dark', false);
    const previewAccent = patternThemeToken.primary;
    const patternControlsDisabled = activePreset === 'none' || wallpaper.hasWallpaper;
    const patternIntensity = opacityToPatternIntensity(appearance.backgroundPatternOpacity);

    const selectPatternIntensity = (level: (typeof PATTERN_INTENSITY_PRESETS)[number]['id']) => {
        patchAppearance({ backgroundPatternOpacity: patternIntensityToOpacity(level) });
    };

    const selectBackgroundPreset = (id: BackgroundPresetId) => {
        const clearsWallpaper = wallpaper.wallpaperSrc && id !== 'none';
        if (clearsWallpaper) {
            wallpaper.clearWallpaperPreview();
            persistWallpaper(undefined);
        }
        patchAppearance({
            backgroundPreset: id,
            ...(clearsWallpaper ? { wallpaper: undefined, wallpaperStamp: Date.now() } : {}),
        });
        if (id !== 'none') SmartToast.success('تم تطبيق الخلفية');
    };

    const visiblePresets = useMemo(
        () =>
            pickCollapsedItems(
                BACKGROUND_PRESETS,
                PATTERN_COLLAPSED_COUNT,
                patternsExpanded,
                BACKGROUND_PRESETS.find((p) => p.id === activePreset),
            ),
        [patternsExpanded, activePreset],
    );
    const hiddenPatternCount = Math.max(0, BACKGROUND_PRESETS.length - PATTERN_COLLAPSED_COUNT);

    return {
        patternsExpanded,
        setPatternsExpanded,
        activePreset,
        previewBaseColor,
        previewAccent,
        patternControlsDisabled,
        patternIntensity,
        visiblePresets,
        hiddenPatternCount,
        selectPatternIntensity,
        selectBackgroundPreset,
    };
}
