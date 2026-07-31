import { useContext, useMemo, type Context, type Dispatch, type SetStateAction } from 'react';
import {
    applySettingsToDom,
    shouldAllowPush,
    shouldAllowPushFromSecurity,
} from '@/app/services/settings/apply';
import {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
} from '@/app/services/settings/settingsSnapshot';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
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
import type { LawyerSettingsActionsValue, LawyerSettingsContextValue } from './lawyerSettingsTypes';

const noop = () => undefined;

function isDevSettingsFallbackAllowed(): boolean {
    return import.meta.env.DEV && typeof window !== 'undefined';
}

function useSettingsSliceContext<T>(
    context: Context<T | null>,
    hookName: string,
    readSnapshot: () => T,
): T {
    const ctx = useContext(context);
    if (ctx) return ctx;
    if (isDevSettingsFallbackAllowed()) {
        return readSnapshot();
    }
    throw new Error(`${hookName} must be used within LawyerSettingsProvider`);
}

let missingProviderWarned = false;

function buildLawyerSettingsDevFallbackValue(): LawyerSettingsContextValue {
    const snapshot = getLawyerSettingsSnapshot();
    return {
        settings: snapshot,
        setSettings: noop as Dispatch<SetStateAction<AppSettingsState>>,
        patchSettings: noop,
        currentTheme: snapshot.appearance.theme,
        currentShape: snapshot.appearance.shape,
        setCurrentTheme: noop,
        setCurrentShape: noop,
        pushAllowed: shouldAllowPush(snapshot),
        resetToDefaults: () => {
            invalidateLawyerSettingsCache();
            applySettingsToDom(LAWYER_SETTINGS_V2_DEFAULTS);
        },
    };
}

export function useLawyerSettings() {
    const ctx = useContext(LawyerSettingsContext);
    if (ctx) return ctx;
    if (isDevSettingsFallbackAllowed()) {
        if (!missingProviderWarned) {
            missingProviderWarned = true;
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
    return useMemo(
        (): AppSettingsState => ({
            version: SETTINGS_SCHEMA_VERSION,
            appearance,
            security,
            data,
            performance,
            homeLayout,
        }),
        [appearance, security, data, performance, homeLayout],
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
        return {
            setSettings: noop as Dispatch<SetStateAction<AppSettingsState>>,
            patchSettings: noop,
            setCurrentTheme: noop,
            setCurrentShape: noop,
            resetToDefaults: () => {
                invalidateLawyerSettingsCache();
                applySettingsToDom(LAWYER_SETTINGS_V2_DEFAULTS);
            },
        };
    }
    throw new Error('useLawyerSettingsActions must be used within LawyerSettingsProvider');
}

export function useLawyerSettingsReset(): () => void {
    return useLawyerSettingsActions().resetToDefaults;
}
