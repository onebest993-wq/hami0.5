import { useCallback } from 'react';
import { useLawyerSettingsActions } from '@/app/context/LawyerSettingsContext';
import {
    applyAppearanceThemeToDom,
    applyFontSizeToDom,
    applyGlassSurfaceAppearanceToDom,
    applyHighContrastToDom,
    applyHomeLayoutOverridesToDom,
    applyReduceMotionToDom,
    applySettingsToDom,
    invalidateLawyerSettingsCache,
    markSettingsDomFastPath,
    type AppSettingsState,
} from '@/app/services/settings';
import { buildGlobalGlassTransparencySettingsPatch } from '@/app/services/settings/applyGlobalGlassTransparency';
import type { GlassTransparencyId } from '@/app/services/settings/glassTransparency';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

const THEME_APPEARANCE_KEYS = ['theme', 'cardTheme', 'patternTheme', 'brandColor'] as const;
const GLASS_APPEARANCE_KEYS = [
    'glassOpacity',
    'backgroundPreset',
    'backgroundPatternOpacity',
    'backgroundPatternBlur',
    'homeContainerBorder',
] as const;
const SHAPE_APPEARANCE_KEYS = ['shape'] as const;

function applySettingsPatch(
    prev: AppSettingsState,
    patch: Partial<AppSettingsState> | ((current: AppSettingsState) => AppSettingsState),
): AppSettingsState {
    const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
    applySettingsToDom(next);
    return next;
}

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

function applyAppearanceFastPath(
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

export function useSettingsPatches() {
    const { setSettings } = useLawyerSettingsActions();

    const patchAppearance = useCallback((partial: Partial<AppSettingsState['appearance']>) => {
        const snapshot = getLawyerSettingsSnapshot();
        const fast = applyAppearanceFastPath(partial, snapshot);

        setSettings((prev) => {
            const next = {
                ...prev,
                appearance: { ...prev.appearance, ...partial },
            };
            invalidateLawyerSettingsCache();
            if (fast) return next;
            return applySettingsPatch(prev, next);
        });
    }, [setSettings]);

    const patchGlobalGlassTransparency = useCallback((level: GlassTransparencyId) => {
        setSettings((prev) => {
            invalidateLawyerSettingsCache();
            const next = buildGlobalGlassTransparencySettingsPatch(prev, level);
            applyGlassSurfaceAppearanceToDom(next);
            applyHomeLayoutOverridesToDom(next);
            markSettingsDomFastPath();
            return next;
        });
    }, [setSettings]);

    const patchPerformance = useCallback((partial: Partial<AppSettingsState['performance']>) => {
        const snapshot = getLawyerSettingsSnapshot();
        const enableAnimations =
            typeof partial.enableAnimations === 'boolean'
                ? partial.enableAnimations
                : snapshot.performance.enableAnimations;

        if (Object.keys(partial).length === 1 && Object.prototype.hasOwnProperty.call(partial, 'enableAnimations')) {
            applyReduceMotionToDom(snapshot.appearance.reduceMotion, enableAnimations);
        }

        setSettings((prev) => {
            const next = {
                ...prev,
                performance: { ...prev.performance, ...partial },
            };

            if (Object.keys(partial).length === 1 && Object.prototype.hasOwnProperty.call(partial, 'enableAnimations')) {
                invalidateLawyerSettingsCache();
                markSettingsDomFastPath();
                return next;
            }

            invalidateLawyerSettingsCache();
            return applySettingsPatch(prev, next);
        });
    }, [setSettings]);

    const patchData = useCallback((partial: Partial<AppSettingsState['data']>) => {
        setSettings((prev) => {
            invalidateLawyerSettingsCache();
            return applySettingsPatch(prev, {
                ...prev,
                data: { ...prev.data, ...partial },
            });
        });
    }, [setSettings]);

    const patchSecurity = useCallback((partial: Partial<AppSettingsState['security']>) => {
        setSettings((prev) => {
            invalidateLawyerSettingsCache();
            return applySettingsPatch(prev, {
                ...prev,
                security: { ...prev.security, ...partial },
            });
        });
    }, [setSettings]);

    const patchHomeLayout = useCallback(
        (patch: Partial<AppSettingsState['homeLayout']> | ((prev: AppSettingsState['homeLayout']) => AppSettingsState['homeLayout'])) => {
            setSettings((prev) => {
                invalidateLawyerSettingsCache();
                const homeLayout = typeof patch === 'function' ? patch(prev.homeLayout) : { ...prev.homeLayout, ...patch };
                const next = { ...prev, homeLayout };
                applyHomeLayoutOverridesToDom(next);
                markSettingsDomFastPath();
                return next;
            });
        },
        [setSettings],
    );

    const patchBlockOverride = useCallback(
        (blockId: HomeWidgetId | 'dockShell', partial: Partial<NonNullable<AppSettingsState['homeLayout']['overrides'][HomeWidgetId]>>) => {
            setSettings((prev) => {
                invalidateLawyerSettingsCache();
                const current = { ...(prev.homeLayout.overrides[blockId] ?? {}) };
                for (const [key, value] of Object.entries(partial)) {
                    if (value === undefined) delete current[key as keyof typeof current];
                    else current[key as keyof typeof current] = value as never;
                }
                const nextOverrides = { ...prev.homeLayout.overrides };
                if (Object.keys(current).length > 0) nextOverrides[blockId] = current;
                else delete nextOverrides[blockId];
                const next = {
                    ...prev,
                    homeLayout: {
                        ...prev.homeLayout,
                        overrides: nextOverrides,
                    },
                };
                applyHomeLayoutOverridesToDom(next);
                markSettingsDomFastPath();
                return next;
            });
        },
        [setSettings],
    );

    return {
        patchAppearance,
        patchGlobalGlassTransparency,
        patchPerformance,
        patchData,
        patchSecurity,
        patchHomeLayout,
        patchBlockOverride,
    };
}
