import { useMemo, useRef, useState, useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    useLawyerSettingsActions,
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
    useLawyerSettingsPerformance,
} from '@/app/context/LawyerSettingsContext';
import { compressWallpaperToDataUrl } from '@/app/services/profileMediaService';
import {
    evacuateDockShellIconsToMain,
    repopulateDockShellFromHidden,
} from '@/app/services/settings/homeLayoutDockControls';
import {
    BACKGROUND_PRESETS,
    LAWYER_THEME_TOKENS,
    normalizeBackgroundPreset,
    persistWallpaper,
    resolveWallpaperSrc,
    resolveLawyerSurfaceBaseColor,
    type AppSettingsState,
    type BackgroundPresetId,
} from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import { pickCollapsedItems } from '@/app/components/lawyer/HamiSettings/components/collapseList';
import { useSettingsPatches } from '../hooks/useSettingsPatches';

export const APPEARANCE_THEME_KEYS: ThemeKey[] = [
    'black',
    'gold',
    'navy',
    'crimson',
    'emerald',
    'silver',
    'sky',
    'brown',
    'purple',
    'bronze',
    'wine',
    'matcha',
    'teal',
    'greige',
    'obsidian',
    'coral',
    'plum',
    'brass',
    'chalk',
    'ice',
];

export const THEME_COLLAPSED_COUNT = 10;
export const PATTERN_COLLAPSED_COUNT = 9;

export function useAppearanceSection() {
    const appearance = useLawyerSettingsAppearance();
    const performance = useLawyerSettingsPerformance();
    const homeLayout = useLawyerSettingsHomeLayout();
    const { setCurrentShape, setCurrentTheme } = useLawyerSettingsActions();
    const { patchAppearance, patchPerformance, patchHomeLayout } = useSettingsPatches();
    const wallpaperRef = useRef<HTMLInputElement>(null);
    const [themesExpanded, setThemesExpanded] = useState(false);
    const [patternsExpanded, setPatternsExpanded] = useState(false);
    const [wallpaperPreview, setWallpaperPreview] = useState<string | undefined>();

    const persistedWallpaperSrc = resolveWallpaperSrc(appearance);
    const wallpaperSrc = wallpaperPreview ?? persistedWallpaperSrc;
    const hasWallpaper = !!wallpaperSrc;

    useEffect(() => {
        if (!wallpaperPreview || !persistedWallpaperSrc) return;
        if (wallpaperPreview === persistedWallpaperSrc) {
            setWallpaperPreview(undefined);
        }
    }, [wallpaperPreview, persistedWallpaperSrc, appearance.wallpaperStamp]);
    const activePreset = normalizeBackgroundPreset(appearance.backgroundPreset);
    const activeTheme = appearance.theme;
    const themeToken = LAWYER_THEME_TOKENS[activeTheme] ?? LAWYER_THEME_TOKENS.gold;
    const previewBaseColor = resolveLawyerSurfaceBaseColor(activeTheme, 'dark', false);
    const previewAccent = themeToken.primary;
    const patternControlsDisabled = activePreset === 'none' || hasWallpaper;

    const selectTheme = (key: ThemeKey) => setCurrentTheme(key);

    const selectBackgroundPreset = (id: BackgroundPresetId) => {
        const clearsWallpaper = wallpaperSrc && id !== 'none';
        if (clearsWallpaper) {
            setWallpaperPreview(undefined);
            persistWallpaper(undefined);
        }
        patchAppearance({
            backgroundPreset: id,
            ...(clearsWallpaper ? { wallpaper: undefined, wallpaperStamp: Date.now() } : {}),
        });
        if (id !== 'none') SmartToast.success('تم تطبيق الخلفية');
    };

    const selectShape = (shape: AppSettingsState['appearance']['shape']) => setCurrentShape(shape);

    const uploadWallpaper = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            SmartToast.error('يرجى اختيار ملف صورة');
            return;
        }
        if (file.size > 8_000_000) {
            SmartToast.error('الصورة كبيرة جداً — الحد 8 ميغابايت');
            return;
        }
        let previewUrl: string | undefined;
        try {
            previewUrl = URL.createObjectURL(file);
            setWallpaperPreview(previewUrl);
            const dataUrl = await compressWallpaperToDataUrl(file);
            if (!persistWallpaper(dataUrl)) {
                setWallpaperPreview(undefined);
                SmartToast.error('تعذر حفظ الصورة — مساحة التخزين ممتلئة');
                return;
            }
            setWallpaperPreview(dataUrl);
            patchAppearance({ wallpaper: undefined, wallpaperStamp: Date.now() });
            SmartToast.success('تم تطبيق خلفية اللوحة');
        } catch {
            setWallpaperPreview(undefined);
            SmartToast.error('تعذر رفع الصورة — جرّب صورة أصغر');
        } finally {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
    };

    const removeWallpaper = () => {
        setWallpaperPreview(undefined);
        persistWallpaper(undefined);
        patchAppearance({ wallpaper: undefined, wallpaperStamp: Date.now() });
        SmartToast.info('تمت إزالة الخلفية');
    };

    const toggleDockVisible = (next: boolean) => {
        patchHomeLayout((layout) => {
            if (next) {
                return {
                    ...layout,
                    dockVisible: true,
                    placements: repopulateDockShellFromHidden(
                        layout.placements,
                        layout.dockHiddenWidgetIds ?? [],
                    ),
                };
            }
            const evacuated = evacuateDockShellIconsToMain(layout.placements);
            return {
                ...layout,
                dockVisible: false,
                placements: evacuated.placements,
                dockHiddenWidgetIds: evacuated.dockHiddenWidgetIds,
            };
        });
        SmartToast.info(next ? 'تم إظهار الشريط السفلي' : 'نُقلت أيقونات الشريط إلى الواجهة الرئيسية');
    };

    const visibleThemeKeys = useMemo(
        () => pickCollapsedItems(APPEARANCE_THEME_KEYS, THEME_COLLAPSED_COUNT, themesExpanded, activeTheme),
        [themesExpanded, activeTheme],
    );
    const hiddenThemeCount = Math.max(0, APPEARANCE_THEME_KEYS.length - THEME_COLLAPSED_COUNT);

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
        appearance,
        performance,
        homeLayout,
        wallpaperRef,
        themesExpanded,
        setThemesExpanded,
        patternsExpanded,
        setPatternsExpanded,
        wallpaperSrc,
        hasWallpaper,
        activePreset,
        activeTheme,
        themeToken,
        previewBaseColor,
        previewAccent,
        patternControlsDisabled,
        visibleThemeKeys,
        hiddenThemeCount,
        visiblePresets,
        hiddenPatternCount,
        selectTheme,
        selectBackgroundPreset,
        selectShape,
        uploadWallpaper,
        removeWallpaper,
        toggleDockVisible,
        patchAppearance,
        patchPerformance,
    };
}

export type AppearanceSectionViewModel = ReturnType<typeof useAppearanceSection>;
