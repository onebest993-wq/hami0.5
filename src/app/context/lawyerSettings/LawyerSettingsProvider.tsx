import React, { useContext, useMemo } from 'react';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import {
    LawyerSettingsActionsContext,
    LawyerSettingsAppearanceContext,
    LawyerSettingsContext,
    LawyerSettingsDataContext,
    LawyerSettingsHomeLayoutContext,
    LawyerSettingsPerformanceContext,
    LawyerSettingsSecurityContext,
} from './lawyerSettingsContexts';
import { stripWallpaperForStorage } from './lawyerSettingsPersistence';
import { useLawyerSettingsCloudSync } from './useLawyerSettingsCloudSync';
import { useLawyerSettingsHydration } from './useLawyerSettingsHydration';
import { useLawyerSettingsRuntimeEffects } from './useLawyerSettingsRuntimeEffects';
import { useLawyerSettingsSliceMemos } from './useLawyerSettingsSliceMemos';
import { useLawyerSettingsActionApi } from './useLawyerSettingsActionApi';

export function LawyerSettingsProvider({ children }: { children: React.ReactNode }) {
    const {
        settings,
        setSettings,
        settingsHydrated,
        currentTheme,
        setCurrentThemeState,
        currentShape,
        setCurrentShapeState,
        settingsRef,
    } = useLawyerSettingsHydration();

    const autoSaveOn = settings.data.autoSave;
    const settingsForPersistence = useMemo(() => stripWallpaperForStorage(settings), [settings]);

    useAutoSave(
        'lawyer_settings',
        settingsForPersistence,
        PERSIST_DEBOUNCE_MS.LIGHT,
        autoSaveOn,
        settingsHydrated,
    );

    useLawyerSettingsCloudSync({
        settings: settingsForPersistence,
        settingsHydrated,
        cloudSyncEnabled: settings.data.cloudSync && !settings.security.localOnlyMode,
    });

    useLawyerSettingsRuntimeEffects({
        settings,
        setSettings,
        settingsHydrated,
        settingsRef,
        autoSaveOn,
    });

    const { actionsValue, value } = useLawyerSettingsActionApi({
        settings,
        setSettings,
        currentTheme,
        setCurrentThemeState,
        currentShape,
        setCurrentShapeState,
    });

    const {
        appearanceStable,
        securityStable,
        dataStable,
        performanceStable,
        homeLayoutStable,
    } = useLawyerSettingsSliceMemos(settings);

    return (
        <LawyerSettingsActionsContext.Provider value={actionsValue}>
            <LawyerSettingsPerformanceContext.Provider value={performanceStable}>
                <LawyerSettingsHomeLayoutContext.Provider value={homeLayoutStable}>
                    <LawyerSettingsDataContext.Provider value={dataStable}>
                        <LawyerSettingsSecurityContext.Provider value={securityStable}>
                            <LawyerSettingsAppearanceContext.Provider value={appearanceStable}>
                                <LawyerSettingsContext.Provider value={value}>{children}</LawyerSettingsContext.Provider>
                            </LawyerSettingsAppearanceContext.Provider>
                        </LawyerSettingsSecurityContext.Provider>
                    </LawyerSettingsDataContext.Provider>
                </LawyerSettingsHomeLayoutContext.Provider>
            </LawyerSettingsPerformanceContext.Provider>
        </LawyerSettingsActionsContext.Provider>
    );
}

export function EnsureLawyerSettingsProvider({ children }: { children: React.ReactNode }) {
    const ctx = useContext(LawyerSettingsContext);
    if (ctx && !ctx.isBootOnly) return <>{children}</>;
    return <LawyerSettingsProvider>{children}</LawyerSettingsProvider>;
}
