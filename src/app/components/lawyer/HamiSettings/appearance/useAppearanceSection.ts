import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
    useLawyerSettingsPerformance,
} from '@/app/context/LawyerSettingsContext';
import { resolveLawyerSurfaceBaseColor } from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import { useAppearanceThemeControls } from './useAppearanceThemeControls';
import { useAppearanceWallpaperControls } from './useAppearanceWallpaperControls';
import { useAppearanceBlockCustomize } from './useAppearanceBlockCustomize';

export function useAppearanceSection() {
    const appearance = useLawyerSettingsAppearance();
    const performance = useLawyerSettingsPerformance();
    const homeLayout = useLawyerSettingsHomeLayout();
    const { patchAppearance, patchPerformance } = useSettingsPatches();
    const blockCustomize = useAppearanceBlockCustomize();

    const theme = useAppearanceThemeControls(appearance, patchAppearance);
    const wallpaper = useAppearanceWallpaperControls(appearance, patchAppearance);

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
        previewBaseColor: resolveLawyerSurfaceBaseColor(theme.activeThemeKey, 'dark', false),
    };
}

export type AppearanceSectionViewModel = ReturnType<typeof useAppearanceSection>;
