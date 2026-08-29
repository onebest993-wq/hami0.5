import React, { useMemo, useSyncExternalStore } from 'react';
import { shouldAllowPush } from '@/app/services/settings/pushPolicy';
import {
    getLawyerSettingsStoreSnapshot,
    subscribeLawyerSettingsLive,
} from '@/app/services/settings/settingsSnapshot';
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
import type { AppSettingsState } from '@/app/services/settings/types';

const noop = () => undefined;

function buildBootSettingsContextValue(settings: AppSettingsState): LawyerSettingsContextValue {
    return {
        settings,
        setSettings: noop as LawyerSettingsContextValue['setSettings'],
        patchSettings: noop,
        currentTheme: settings.appearance.theme,
        currentShape: settings.appearance.shape,
        setCurrentTheme: noop,
        setCurrentShape: noop,
        pushAllowed: shouldAllowPush(settings),
        resetToDefaults: noop,
        isBootOnly: true,
    };
}

function buildBootSettingsActionsValue(): LawyerSettingsActionsValue {
    return {
        setSettings: noop as LawyerSettingsActionsValue['setSettings'],
        patchSettings: noop,
        setCurrentTheme: noop,
        setCurrentShape: noop,
        resetToDefaults: noop,
    };
}

/**
 * إعدادات قرص خفيفة لمسار الإقلاع — بلا SecureStore ولا cloud sync ولا useAutoSave.
 * يوفّر الشرائح للهيدر+البلاطات؛ الـ Provider الكامل يُركَّب عند فتح الإعدادات (Ensure).
 */
export function LawyerSettingsBootProvider({ children }: { children: React.ReactNode }) {
    const settings = useSyncExternalStore(
        subscribeLawyerSettingsLive,
        getLawyerSettingsStoreSnapshot,
        getLawyerSettingsStoreSnapshot,
    );
    const contextValue = useMemo(() => buildBootSettingsContextValue(settings), [settings]);
    const actionsValue = useMemo(() => buildBootSettingsActionsValue(), []);

    return (
        <LawyerSettingsActionsContext.Provider value={actionsValue}>
            <LawyerSettingsAppearanceContext.Provider value={settings.appearance}>
                <LawyerSettingsHomeLayoutContext.Provider value={settings.homeLayout}>
                    <LawyerSettingsSecurityContext.Provider value={settings.security}>
                        <LawyerSettingsDataContext.Provider value={settings.data}>
                            <LawyerSettingsPerformanceContext.Provider value={settings.performance}>
                                <LawyerSettingsContext.Provider value={contextValue}>
                                    {children}
                                </LawyerSettingsContext.Provider>
                            </LawyerSettingsPerformanceContext.Provider>
                        </LawyerSettingsDataContext.Provider>
                    </LawyerSettingsSecurityContext.Provider>
                </LawyerSettingsHomeLayoutContext.Provider>
            </LawyerSettingsAppearanceContext.Provider>
        </LawyerSettingsActionsContext.Provider>
    );
}
