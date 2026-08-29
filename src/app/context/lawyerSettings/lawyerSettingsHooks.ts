import { useContext, useMemo } from 'react';
import { shouldAllowPushFromSecurity } from '@/app/services/settings/pushPolicy';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { SETTINGS_SCHEMA_VERSION } from '@/app/services/settings/types';
import type {
    AppSettingsState,
    AppearanceSettings,
    DataSettings,
    HomeLayoutSettings,
    PerformanceSettings,
    SecuritySettings,
} from '@/app/services/settings/types';
import {
    LawyerSettingsActionsContext,
    LawyerSettingsAppearanceContext,
    LawyerSettingsContext,
    LawyerSettingsDataContext,
    LawyerSettingsHomeLayoutContext,
    LawyerSettingsPerformanceContext,
    LawyerSettingsSecurityContext,
} from './lawyerSettingsContexts';
import type { LawyerSettingsActionsValue } from './lawyerSettingsTypes';
import {
    buildLawyerSettingsDevActionsFallback,
    buildLawyerSettingsDevFallbackValue,
    consumeMissingProviderWarning,
    isDevSettingsFallbackAllowed,
    useSettingsSliceContext,
} from './lawyerSettingsDevFallback';

export function useLawyerSettings() {
    const ctx = useContext(LawyerSettingsContext);
    if (ctx) return ctx;
    if (isDevSettingsFallbackAllowed()) {
        if (consumeMissingProviderWarning()) {
            console.warn(
                '[hami] useLawyerSettings outside LawyerSettingsProvider — dev snapshot fallback (HMR only)',
            );
        }
        return buildLawyerSettingsDevFallbackValue();
    }
    throw new Error('useLawyerSettings must be used within LawyerSettingsProvider');
}

export function useLawyerSettingsOptional() {
    return useContext(LawyerSettingsContext);
}

export function useLawyerSettingsAppearance(): AppearanceSettings {
    return useSettingsSliceContext(
        LawyerSettingsAppearanceContext,
        'useLawyerSettingsAppearance',
        () => getLawyerSettingsSnapshot().appearance,
    );
}

export function useLawyerSettingsSecurity(): SecuritySettings {
    return useSettingsSliceContext(
        LawyerSettingsSecurityContext,
        'useLawyerSettingsSecurity',
        () => getLawyerSettingsSnapshot().security,
    );
}

export function useLawyerSettingsPushAllowed(): boolean {
    const security = useLawyerSettingsSecurity();
    return useMemo(() => shouldAllowPushFromSecurity(security), [security.localOnlyMode]);
}

export function useLawyerSettingsFromSlices(): AppSettingsState {
    const appearance = useLawyerSettingsAppearance();
    const security = useLawyerSettingsSecurity();
    const data = useLawyerSettingsData();
    const performance = useLawyerSettingsPerformance();
    const homeLayout = useLawyerSettingsHomeLayout();
    const { settings } = useLawyerSettings();
    return useMemo(
        (): AppSettingsState => ({
            version: SETTINGS_SCHEMA_VERSION,
            appearance,
            security,
            data,
            performance,
            homeLayout,
            notifications: settings.notifications,
        }),
        [appearance, security, data, performance, homeLayout, settings.notifications],
    );
}

export function useLawyerSettingsData(): DataSettings {
    return useSettingsSliceContext(
        LawyerSettingsDataContext,
        'useLawyerSettingsData',
        () => getLawyerSettingsSnapshot().data,
    );
}

export function useLawyerSettingsPerformance(): PerformanceSettings {
    return useSettingsSliceContext(
        LawyerSettingsPerformanceContext,
        'useLawyerSettingsPerformance',
        () => getLawyerSettingsSnapshot().performance,
    );
}

export function useLawyerSettingsHomeLayout(): HomeLayoutSettings {
    return useSettingsSliceContext(
        LawyerSettingsHomeLayoutContext,
        'useLawyerSettingsHomeLayout',
        () => getLawyerSettingsSnapshot().homeLayout,
    );
}

export function useLawyerSettingsActions(): LawyerSettingsActionsValue {
    const ctx = useContext(LawyerSettingsActionsContext);
    if (ctx) return ctx;
    if (isDevSettingsFallbackAllowed()) {
        return buildLawyerSettingsDevActionsFallback();
    }
    throw new Error('useLawyerSettingsActions must be used within LawyerSettingsProvider');
}

export function useLawyerSettingsReset(): () => void {
    return useLawyerSettingsActions().resetToDefaults;
}
