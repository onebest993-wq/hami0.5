import { useCallback } from 'react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import type { AppSettingsState } from '@/app/services/settings';

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

    return { patchAppearance, patchPerformance, patchData, patchSecurity };
}
