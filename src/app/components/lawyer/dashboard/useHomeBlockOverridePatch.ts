import { useCallback } from 'react';
import { useLawyerSettingsActions } from '@/app/context/LawyerSettingsContext';
import { invalidateLawyerSettingsCache } from '@/app/services/settings';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import type { AppSettingsState } from '@/app/services/settings/types';

/** patchBlockOverride فقط — بلا barrel settings/useSettingsPatches على مسار HomeTab */
export function useHomeBlockOverridePatch() {
    const { setSettings } = useLawyerSettingsActions();

    return useCallback(
        (
            blockId: HomeWidgetId | 'dockShell',
            partial: Partial<
                NonNullable<AppSettingsState['homeLayout']['overrides'][HomeWidgetId]>
            >,
        ) => {
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
}
