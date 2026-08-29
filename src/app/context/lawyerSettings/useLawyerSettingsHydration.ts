import { useEffect, useRef, useState } from 'react';
import SecureStoreService from '@/app/services/SecureStoreService';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { applySettingsToDom } from '@/app/services/settings/apply';
import {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
} from '@/app/services/settings/settingsSnapshot';
import type { AppSettingsState } from '@/app/services/settings/types';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import {
    loadInitialSettingsAsync,
    readProviderBootSettings,
    settingsHydrateEqual,
} from './lawyerSettingsPersistence';

export function useLawyerSettingsHydration() {
    const [settingsHydrated, setSettingsHydrated] = useState(false);
    const [settings, setSettings] = useState<AppSettingsState>(readProviderBootSettings);
    const [currentTheme, setCurrentThemeState] = useState<ThemeKey>(settings.appearance.theme);
    const [currentShape, setCurrentShapeState] = useState<ShapeKey>(settings.appearance.shape);
    const settingsRef = useRef(settings);
    settingsRef.current = settings;
    const settingsHydratedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const applyLoaded = (loaded: AppSettingsState, mode: 'initial' | 'reconcile') => {
            if (cancelled) return;
            if (mode === 'reconcile' && settingsHydratedRef.current) {
                return;
            }
            setSettings((prev) => (settingsHydrateEqual(prev, loaded) ? prev : loaded));
            setCurrentThemeState((prev) =>
                prev === loaded.appearance.theme ? prev : loaded.appearance.theme,
            );
            setCurrentShapeState((prev) =>
                prev === loaded.appearance.shape ? prev : loaded.appearance.shape,
            );
            applySettingsToDom(loaded);
            publishLawyerSettingsLive(loaded);
            settingsHydratedRef.current = true;
            setSettingsHydrated(true);
        };

        const startHydrate = () => {
            if (cancelled) return;

            const runInitialHydrate = async () => {
                let loaded: AppSettingsState | null = null;

                if (isCloudSyncEnabled()) {
                    try {
                        const snap = getLawyerSettingsSnapshot();
                        if (snap.data.cloudSync) {
                            const { loadFromCloud, applyAppData, migrateLegacyDevUserCloudData } =
                                await import('@/lib/syncService.js');
                            await migrateLegacyDevUserCloudData().catch(() => undefined);
                            const remote = await loadFromCloud();
                            if (remote && applyAppData(remote)) {
                                invalidateLawyerSettingsCache();
                                loaded = await loadInitialSettingsAsync();
                                applySettingsToDom(loaded);
                                publishLawyerSettingsLive(loaded);
                            }
                        }
                    } catch {
                        /* السحابة اختيارية عند الإقلاع */
                    }
                }

                if (cancelled) return;
                if (!loaded) {
                    loaded = await loadInitialSettingsAsync();
                }
                applyLoaded(loaded, 'initial');
            };

            void runInitialHydrate();

            void SecureStoreService.ensureBootShellReady().then(() => {
                if (cancelled) return;
                void loadInitialSettingsAsync().then((loaded) => applyLoaded(loaded, 'reconcile'));
            });
            void SecureStoreService.ensurePersistedReady();
        };

        const unbind = onBootContentReady(startHydrate);
        return () => {
            cancelled = true;
            unbind();
        };
    }, []);

    return {
        settings,
        setSettings,
        settingsHydrated,
        currentTheme,
        setCurrentThemeState,
        currentShape,
        setCurrentShapeState,
        settingsRef,
    };
}
