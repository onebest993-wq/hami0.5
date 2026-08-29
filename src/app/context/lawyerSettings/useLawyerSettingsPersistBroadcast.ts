import { useEffect, type Dispatch, type SetStateAction } from 'react';
import {
    hydrateWallpaperFromSecureStore,
    loadPersistedWallpaper,
} from '@/app/services/settings/apply';
import type { AppSettingsState } from '@/app/services/settings/types';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

export function useLawyerSettingsPersistBroadcast(
    settings: AppSettingsState,
    setSettings: Dispatch<SetStateAction<AppSettingsState>>,
    settingsHydrated: boolean,
    autoSaveOn: boolean,
) {
    useEffect(() => {
        if (!settingsHydrated || !autoSaveOn) return;
        const timer = window.setTimeout(() => {
            persistenceRepository.save('lawyer_theme', settings.appearance.theme);
            persistenceRepository.save('lawyer_shape', settings.appearance.shape);
        }, PERSIST_DEBOUNCE_MS.LIGHT);
        return () => window.clearTimeout(timer);
    }, [settings.appearance.theme, settings.appearance.shape, settingsHydrated, autoSaveOn]);

    useEffect(() => {
        if (!settingsHydrated) return;
        void hydrateWallpaperFromSecureStore().then((src) => {
            if (!src) return;
            setSettings((prev) => {
                if (prev.appearance.wallpaperStamp && loadPersistedWallpaper()) return prev;
                return {
                    ...prev,
                    appearance: {
                        ...prev.appearance,
                        wallpaper: undefined,
                        wallpaperStamp: Date.now(),
                    },
                };
            });
        });
    }, [settingsHydrated]);

    useEffect(() => {
        if (!settingsHydrated) return;
        const onExternalCommit = (event: Event) => {
            const detail = (event as CustomEvent<AppSettingsState>).detail;
            if (!detail || typeof detail !== 'object') return;
            setSettings(detail);
        };
        window.addEventListener('hami:settings-external-commit', onExternalCommit);
        return () => window.removeEventListener('hami:settings-external-commit', onExternalCommit);
    }, [settingsHydrated]);

    useEffect(() => {
        if (!settingsHydrated) return;
        const timer = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('hami:settings-updated', { detail: settings }));
            void import('@/app/services/notifications/notificationAlertPolicy').then((m) => {
                m.cacheNotificationPrefsForBackground(settings);
            });
        }, 120);
        return () => window.clearTimeout(timer);
    }, [settings, settingsHydrated]);

    useEffect(() => {
        if (!settingsHydrated) return;
        if (!settings.performance.prefetchScreens) {
            void import('@/app/runtime/prefetchScheduler').then(({ PrefetchScheduler }) => {
                PrefetchScheduler.reset();
            });
        }
    }, [settings.performance.prefetchScreens, settingsHydrated]);
}
