import {
    applyAppearanceThemeToDom,
    applyFontSizeToDom,
    applyGlassSurfaceAppearanceToDom,
    applyHighContrastToDom,
    applyReduceMotionToDom,
    markSettingsDomFastPath,
    type AppSettingsState,
} from '@/app/services/settings';

const THEME_APPEARANCE_KEYS = ['theme', 'cardTheme', 'patternTheme', 'brandColor'] as const;
const GLASS_APPEARANCE_KEYS = [
    'glassOpacity',
    'backgroundPreset',
    'backgroundPatternOpacity',
    'backgroundPatternBlur',
    'homeContainerBorder',
] as const;
const SHAPE_APPEARANCE_KEYS = ['shape'] as const;

function isAppearanceOnlyPatch(
    partial: Partial<AppSettingsState['appearance']>,
    allowed: readonly (keyof AppSettingsState['appearance'])[],
): boolean {
    const keys = Object.keys(partial) as (keyof AppSettingsState['appearance'])[];
    return keys.length > 0 && keys.every((key) => allowed.includes(key));
}

function mergeAppearancePatch(
    snapshot: AppSettingsState,
    partial: Partial<AppSettingsState['appearance']>,
): AppSettingsState {
    return {
        ...snapshot,
        appearance: { ...snapshot.appearance, ...partial },
    };
}

export function applyAppearanceFastPath(
    partial: Partial<AppSettingsState['appearance']>,
    snapshot: AppSettingsState,
): boolean {
    if (isAppearanceOnlyPatch(partial, ['highContrast'])) {
        applyHighContrastToDom(Boolean(partial.highContrast));
        markSettingsDomFastPath();
        return true;
    }
    if (isAppearanceOnlyPatch(partial, ['fontSize', 'fontPreset'])) {
        if (typeof partial.fontSize === 'number') {
            applyFontSizeToDom(partial.fontSize);
        }
        markSettingsDomFastPath();
        return true;
    }
    if (isAppearanceOnlyPatch(partial, ['reduceMotion'])) {
        applyReduceMotionToDom(Boolean(partial.reduceMotion), snapshot.performance.enableAnimations);
        markSettingsDomFastPath();
        return true;
    }
    if (isAppearanceOnlyPatch(partial, THEME_APPEARANCE_KEYS)) {
        applyAppearanceThemeToDom(mergeAppearancePatch(snapshot, partial));
        markSettingsDomFastPath();
        return true;
    }
    if (isAppearanceOnlyPatch(partial, GLASS_APPEARANCE_KEYS)) {
        applyGlassSurfaceAppearanceToDom(mergeAppearancePatch(snapshot, partial));
        markSettingsDomFastPath();
        return true;
    }
    if (isAppearanceOnlyPatch(partial, SHAPE_APPEARANCE_KEYS)) {
        const next = mergeAppearancePatch(snapshot, partial);
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.hamiShape = next.appearance.shape;
        }
        markSettingsDomFastPath();
        return true;
    }
    return false;
}
