import { useCallback } from 'react';
import { useLawyerSettingsActions } from '@/app/context/LawyerSettingsContext';
import {
    applyHomeLayoutOverridesToDom,
    invalidateLawyerSettingsCache,
    markSettingsDomFastPath,
    type AppSettingsState,
} from '@/app/services/settings';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';

export function useSettingsHomeLayoutPatches() {
    const { setSettings } = useLawyerSettingsActions();

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

    return { patchHomeLayout, patchBlockOverride };
}
