import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
    useLawyerSettingsPerformance,
} from '@/app/context/LawyerSettingsContext';
import type { ThemeKey } from '@/app/types/common';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import {
    APPEARANCE_THEME_KEYS,
    THEME_COLLAPSED_COUNT,
    PATTERN_COLLAPSED_COUNT,
} from './appearanceConstants';
import { useAppearanceThemeControls } from './useAppearanceThemeControls';
import { useAppearanceWallpaperControls } from './useAppearanceWallpaperControls';
import { useAppearancePatternControls } from './useAppearancePatternControls';
import { useAppearanceBlockCustomize } from './useAppearanceBlockCustomize';

export {
    APPEARANCE_THEME_KEYS,
    THEME_COLLAPSED_COUNT,
    PATTERN_COLLAPSED_COUNT,
} from './appearanceConstants';

export function useAppearanceSection() {
    const appearance = useLawyerSettingsAppearance();
    const performance = useLawyerSettingsPerformance();
    const homeLayout = useLawyerSettingsHomeLayout();
    const { patchAppearance, patchPerformance } = useSettingsPatches();
    const blockCustomize = useAppearanceBlockCustomize();

    const theme = useAppearanceThemeControls(appearance, patchAppearance);
    const wallpaper = useAppearanceWallpaperControls(appearance, patchAppearance);
    const pattern = useAppearancePatternControls(
        appearance,
        patchAppearance,
        wallpaper,
        theme.activeThemeKey,
        theme.themeToken,
    );

    const selectTheme = (key: ThemeKey) => {
        theme.selectTheme(key);
    };

    return {
        appearance,
        performance,
        homeLayout,
        blockCustomize,
        wallpaperRef: wallpaper.wallpaperRef,
        themesExpanded: theme.themesExpanded,
        setThemesExpanded: theme.setThemesExpanded,
        wallpaperSrc: wallpaper.wallpaperSrc,
        hasWallpaper: wallpaper.hasWallpaper,
        activeTheme: appearance.theme,
        activeThemeKey: theme.activeThemeKey,
        activeThemeToken: theme.activeThemeToken,
        themeToken: theme.themeToken,
        visibleThemeKeys: theme.visibleThemeKeys,
        hiddenThemeCount: theme.hiddenThemeCount,
        selectTheme,
        beginWallpaperEdit: wallpaper.beginWallpaperEdit,
        cancelWallpaperEdit: wallpaper.cancelWallpaperEdit,
        applyWallpaperEdit: wallpaper.applyWallpaperEdit,
        editorDraft: wallpaper.editorDraft,
        editorBusy: wallpaper.editorBusy,
        removeWallpaper: wallpaper.removeWallpaper,
        patchAppearance,
        patchPerformance,
        previewBaseColor: pattern.previewBaseColor,
    };
}

export type AppearanceSectionViewModel = ReturnType<typeof useAppearanceSection>;
