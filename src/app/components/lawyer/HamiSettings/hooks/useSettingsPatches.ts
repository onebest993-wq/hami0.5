import { useCallback } from 'react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import type { AppSettingsState } from '@/app/services/settings';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';

export function useSettingsPatches() {
    const { setSettings } = useLawyerSettings();

    const patchAppearance = useCallback((partial: Partial<AppSettingsState['appearance']>) => {
        setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, ...partial } }));
    }, [setSettings]);

    const patchPerformance = useCallback((partial: Partial<AppSettingsState['performance']>) => {
        setSettings((prev) => ({ ...prev, performance: { ...prev.performance, ...partial } }));
    }, [setSettings]);

    const patchData = useCallback((partial: Partial<AppSettingsState['data']>) => {
        setSettings((prev) => ({ ...prev, data: { ...prev.data, ...partial } }));
    }, [setSettings]);

    const patchSecurity = useCallback((partial: Partial<AppSettingsState['security']>) => {
        setSettings((prev) => ({ ...prev, security: { ...prev.security, ...partial } }));
    }, [setSettings]);

    const patchHomeLayout = useCallback(
        (patch: Partial<AppSettingsState['homeLayout']> | ((prev: AppSettingsState['homeLayout']) => AppSettingsState['homeLayout'])) => {
            setSettings((prev) => ({
                ...prev,
                homeLayout: typeof patch === 'function' ? patch(prev.homeLayout) : { ...prev.homeLayout, ...patch },
            }));
        },
        [setSettings],
    );

    const patchBlockOverride = useCallback(
        (blockId: HomeWidgetId | 'dockShell', partial: Partial<NonNullable<AppSettingsState['homeLayout']['overrides'][HomeWidgetId]>>) => {
            setSettings((prev) => {
                const current = { ...(prev.homeLayout.overrides[blockId] ?? {}) };
                for (const [key, value] of Object.entries(partial)) {
                    if (value === undefined) delete current[key as keyof typeof current];
                    else current[key as keyof typeof current] = value as never;
                }
                const nextOverrides = { ...prev.homeLayout.overrides };
                if (Object.keys(current).length > 0) nextOverrides[blockId] = current;
                else delete nextOverrides[blockId];
                return {
                    ...prev,
                    homeLayout: {
                        ...prev.homeLayout,
                        overrides: nextOverrides,
                    },
                };
            });
        },
        [setSettings],
    );

    return { patchAppearance, patchPerformance, patchData, patchSecurity, patchHomeLayout, patchBlockOverride };
}
