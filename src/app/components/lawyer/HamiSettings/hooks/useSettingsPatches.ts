import { useCallback } from 'react';
import { useLawyerSettingsActions } from '@/app/context/LawyerSettingsContext';
import {
    applyGlassSurfaceAppearanceToDom,
    applyHomeLayoutOverridesToDom,
    invalidateLawyerSettingsCache,
    markSettingsDomFastPath,
    publishLawyerSettingsLive,
    type AppSettingsState,
} from '@/app/services/settings';
import { buildGlobalGlassTransparencySettingsPatch } from '@/app/services/settings/applyGlobalGlassTransparency';
import type { GlassTransparencyId } from '@/app/services/settings/glassTransparency';
import { applyAppearanceFastPath } from './settingsAppearanceFastPath';
import { applyPerformanceFastPath } from './settingsPerformanceFastPath';
import { applySettingsPatch } from './settingsPatchApply';
import { isUnchangedSlicePatch } from './settingsPatchSkip';
import { useSettingsHomeLayoutPatches } from './useSettingsHomeLayoutPatches';

export function useSettingsPatches() {
    const { setSettings } = useLawyerSettingsActions();
    const { patchHomeLayout, patchBlockOverride } = useSettingsHomeLayoutPatches();

    const patchAppearance = useCallback((partial: Partial<AppSettingsState['appearance']>) => {
        setSettings((prev) => {
            if (isUnchangedSlicePatch(prev.appearance, partial)) return prev;
            const fast = applyAppearanceFastPath(partial, prev);
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
        setSettings((prev) => {
            if (isUnchangedSlicePatch(prev.performance, partial)) return prev;
            const next = {
                ...prev,
                performance: { ...prev.performance, ...partial },
            };
            invalidateLawyerSettingsCache();
            if (applyPerformanceFastPath(partial, prev)) return next;
            return applySettingsPatch(prev, next);
        });
    }, [setSettings]);

    const patchData = useCallback((partial: Partial<AppSettingsState['data']>) => {
        setSettings((prev) => {
            if (isUnchangedSlicePatch(prev.data, partial)) return prev;
            invalidateLawyerSettingsCache();
            const next = applySettingsPatch(prev, {
                ...prev,
                data: { ...prev.data, ...partial },
            });
            publishLawyerSettingsLive(next);
            return next;
        });
    }, [setSettings]);

    const patchSecurity = useCallback((partial: Partial<AppSettingsState['security']>) => {
        setSettings((prev) => {
            if (isUnchangedSlicePatch(prev.security, partial)) return prev;
            invalidateLawyerSettingsCache();
            return applySettingsPatch(prev, {
                ...prev,
                security: { ...prev.security, ...partial },
            });
        });
    }, [setSettings]);

    /** تحديث ذري — يمنع نافذة يُفعَّل فيها localOnly قبل تعطيل المزامنة */
    const patchLocalOnlyMode = useCallback((enabled: boolean) => {
        setSettings((prev) => {
            if (enabled === prev.security.localOnlyMode) {
                if (!enabled) return prev;
                if (
                    !prev.data.cloudSync &&
                    !prev.data.syncNotes &&
                    !prev.data.syncFiles &&
                    !prev.data.syncExecution
                ) {
                    return prev;
                }
            }
            invalidateLawyerSettingsCache();
            const next = applySettingsPatch(prev, {
                ...prev,
                security: { ...prev.security, localOnlyMode: enabled },
                data: enabled
                    ? {
                          ...prev.data,
                          cloudSync: false,
                          syncNotes: false,
                          syncFiles: false,
                          syncExecution: false,
                      }
                    : prev.data,
            });
            publishLawyerSettingsLive(next);
            return next;
        });
    }, [setSettings]);

    return {
        patchAppearance,
        patchGlobalGlassTransparency,
        patchPerformance,
        patchData,
        patchSecurity,
        patchLocalOnlyMode,
        patchHomeLayout,
        patchBlockOverride,
    };
}
