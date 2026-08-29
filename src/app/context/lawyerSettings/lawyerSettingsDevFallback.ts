import { useContext, type Context, type Dispatch, type SetStateAction } from 'react';
import { shouldAllowPush } from '@/app/services/settings/pushPolicy';
import {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
} from '@/app/services/settings/settingsSnapshot';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { AppSettingsState } from '@/app/services/settings/types';
import type { LawyerSettingsContextValue } from './lawyerSettingsTypes';

const SETTINGS_HOOK_NOOP = () => undefined;

export function isDevSettingsFallbackAllowed(): boolean {
    return import.meta.env.DEV && typeof window !== 'undefined';
}

export function useSettingsSliceContext<T>(
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

export function consumeMissingProviderWarning(): boolean {
    if (missingProviderWarned) return false;
    missingProviderWarned = true;
    return true;
}

export function buildLawyerSettingsDevFallbackValue(): LawyerSettingsContextValue {
    const snapshot = getLawyerSettingsSnapshot();
    return {
        settings: snapshot,
        setSettings: SETTINGS_HOOK_NOOP as Dispatch<SetStateAction<AppSettingsState>>,
        patchSettings: SETTINGS_HOOK_NOOP,
        currentTheme: snapshot.appearance.theme,
        currentShape: snapshot.appearance.shape,
        setCurrentTheme: SETTINGS_HOOK_NOOP,
        setCurrentShape: SETTINGS_HOOK_NOOP,
        pushAllowed: shouldAllowPush(snapshot),
        resetToDefaults: () => {
            invalidateLawyerSettingsCache();
            void import('@/app/services/settings/apply').then((m) => {
                m.applySettingsToDom(LAWYER_SETTINGS_V2_DEFAULTS);
            });
        },
    };
}

export function buildLawyerSettingsDevActionsFallback() {
    return {
        setSettings: SETTINGS_HOOK_NOOP as Dispatch<SetStateAction<AppSettingsState>>,
        patchSettings: SETTINGS_HOOK_NOOP,
        setCurrentTheme: SETTINGS_HOOK_NOOP,
        setCurrentShape: SETTINGS_HOOK_NOOP,
        resetToDefaults: () => {
            invalidateLawyerSettingsCache();
            void import('@/app/services/settings/apply').then((m) => {
                m.applySettingsToDom(LAWYER_SETTINGS_V2_DEFAULTS);
            });
        },
    };
}
