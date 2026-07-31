import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import {
    applySettingsToDom,
    hydrateWallpaperFromSecureStore,
    loadPersistedWallpaper,
    persistWallpaper,
    shouldAllowPush,
} from '@/app/services/settings/apply';
import {
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
} from '@/app/services/settings/settingsSnapshot';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { AppSettingsState } from '@/app/services/settings/types';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings/lawyerThemeTokens';
import { clearStoredBiometricCredential } from '@/app/services/security/webAuthnLock';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
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
import {
    homeLayoutStableKey,
    loadInitialSettingsAsync,
    readProviderBootSettings,
    settingsHydrateEqual,
    stripWallpaperForStorage,
} from './lawyerSettingsPersistence';

export function LawyerSettingsProvider({ children }: { children: React.ReactNode }) {
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
            void loadInitialSettingsAsync().then((loaded) => applyLoaded(loaded, 'initial'));

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

    const autoSaveOn = settings.data.autoSave;
    const settingsForPersistence = useMemo(() => stripWallpaperForStorage(settings), [settings]);

    useAutoSave(
        'lawyer_settings',
        settingsForPersistence,
        PERSIST_DEBOUNCE_MS.LIGHT,
        autoSaveOn,
        settingsHydrated,
    );
    useAutoSave('lawyer_theme', currentTheme, PERSIST_DEBOUNCE_MS.LIGHT, autoSaveOn, settingsHydrated);
    useAutoSave('lawyer_shape', currentShape, PERSIST_DEBOUNCE_MS.LIGHT, autoSaveOn, settingsHydrated);

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
        const timer = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('hami:settings-updated', { detail: settings }));
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

    const domSettingsSignature = useMemo(
        () =>
            JSON.stringify({
                theme: settings.appearance.theme,
                shape: settings.appearance.shape,
                brandColor: settings.appearance.brandColor,
                glassOpacity: settings.appearance.glassOpacity,
                reduceMotion: settings.appearance.reduceMotion,
                wallpaper: loadPersistedWallpaper() ? '1' : '0',
                wallpaperStamp: settings.appearance.wallpaperStamp ?? 0,
                backgroundPreset: settings.appearance.backgroundPreset,
                backgroundPatternOpacity: settings.appearance.backgroundPatternOpacity,
                backgroundPatternBlur: settings.appearance.backgroundPatternBlur,
                homeContainerBorder: settings.appearance.homeContainerBorder,
                fontSize: settings.appearance.fontSize,
                language: settings.appearance.language,
                highContrast: settings.appearance.highContrast,
                themeMode: settings.appearance.themeMode,
                enableAnimations: settings.performance.enableAnimations,
                localOnlyMode: settings.security.localOnlyMode,
            }),
        [settings.appearance, settings.performance.enableAnimations, settings.security.localOnlyMode],
    );

    useEffect(() => {
        if (!settingsHydrated) return;
        invalidateLawyerSettingsCache();
        applySettingsToDom(settingsRef.current);
    }, [domSettingsSignature, settingsHydrated]);

    const setCurrentTheme = useCallback((theme: ThemeKey) => {
        setCurrentThemeState(theme);
        const token = LAWYER_THEME_TOKENS[theme] ?? LAWYER_THEME_TOKENS.gold;
        setSettings((prev) => ({
            ...prev,
            appearance: { ...prev.appearance, theme, brandColor: token.primary },
        }));
    }, []);

    const setCurrentShape = useCallback((shape: ShapeKey) => {
        setCurrentShapeState(shape);
        setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, shape } }));
    }, []);

    useEffect(() => {
        if (settings.appearance.theme !== currentTheme) {
            setCurrentThemeState(settings.appearance.theme);
        }
    }, [settings.appearance.theme, currentTheme]);

    useEffect(() => {
        if (settings.appearance.shape !== currentShape) {
            setCurrentShapeState(settings.appearance.shape);
        }
    }, [settings.appearance.shape, currentShape]);

    useEffect(() => {
        if (isCapacitorNativePlatform()) {
            document.body.style.filter = 'none';
            return undefined;
        }
        const onVis = () => {
            if (!document.hidden || !settings.security.privacyBlur) {
                document.body.style.filter = 'none';
                return;
            }
            document.body.style.filter = 'blur(14px)';
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            document.body.style.filter = 'none';
        };
    }, [settings.security.privacyBlur]);

    useEffect(() => {
        if (!settings.security.screenshotDeterrent) return undefined;
        let unbind: (() => void) | undefined;
        let cancelled = false;
        void import('@/app/runtime/screenshotDeterrentRuntime')
            .then((m) => {
                if (cancelled) return;
                unbind = m.bindWebScreenshotDeterrent();
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            unbind?.();
        };
    }, [settings.security.screenshotDeterrent]);

    useEffect(() => {
        let unwire: (() => void) | undefined;
        let cancelled = false;
        void import('@/app/runtime/nativeSecurityBoot')
            .then((m) => {
                if (cancelled) return;
                void m.applyNativeSecurityFromSettings();
                unwire = m.wireNativeSecuritySettingsListener();
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            unwire?.();
        };
    }, []);

    const patchSettings = useCallback(
        (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => {
            setSettings((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
        },
        [],
    );

    const resetToDefaults = useCallback(() => {
        const migrated = LAWYER_SETTINGS_V2_DEFAULTS;
        clearStoredBiometricCredential();
        void import('@/app/runtime/nativeBiometricBridge')
            .then((m) => m.clearNativeBiometricEnrollment())
            .catch(() => undefined);
        persistWallpaper(undefined);
        const stripped = stripWallpaperForStorage(migrated);
        setSettings(migrated);
        setCurrentThemeState(migrated.appearance.theme);
        setCurrentShapeState(migrated.appearance.shape);
        persistenceRepository.save('lawyer_settings', stripped);
        persistenceRepository.save('lawyer_theme', migrated.appearance.theme);
        persistenceRepository.save('lawyer_shape', migrated.appearance.shape);
        invalidateLawyerSettingsCache();
        publishLawyerSettingsLive(migrated);
        applySettingsToDom(migrated);
    }, []);

    const actionsValue = useMemo<LawyerSettingsActionsValue>(
        () => ({
            setSettings,
            patchSettings,
            setCurrentTheme,
            setCurrentShape,
            resetToDefaults,
        }),
        [patchSettings, setCurrentTheme, setCurrentShape, resetToDefaults],
    );

    const value = useMemo<LawyerSettingsContextValue>(
        () => ({
            settings,
            setSettings,
            patchSettings,
            currentTheme,
            currentShape,
            setCurrentTheme,
            setCurrentShape,
            pushAllowed: shouldAllowPush(settings),
            resetToDefaults,
        }),
        [settings, patchSettings, currentTheme, currentShape, setCurrentTheme, setCurrentShape, resetToDefaults],
    );

    const appearanceStable = useMemo(
        () => settings.appearance,
        [
            settings.appearance.themeMode,
            settings.appearance.theme,
            settings.appearance.shape,
            settings.appearance.language,
            settings.appearance.fontSize,
            settings.appearance.fontPreset,
            settings.appearance.glassOpacity,
            settings.appearance.homeContainerBorder,
            settings.appearance.wallpaperStamp,
            settings.appearance.backgroundPreset,
            settings.appearance.backgroundPatternOpacity,
            settings.appearance.backgroundPatternBlur,
            settings.appearance.brandColor,
            settings.appearance.reduceMotion,
            settings.appearance.highContrast,
        ],
    );

    const securityStable = useMemo(
        () => settings.security,
        [
            settings.security.privacyBlur,
            settings.security.screenshotDeterrent,
            settings.security.biometricLock,
            settings.security.autoLockMinutes,
            settings.security.localOnlyMode,
        ],
    );

    const dataStable = useMemo(
        () => settings.data,
        [
            settings.data.autoSave,
            settings.data.cloudSync,
            settings.data.syncNotes,
            settings.data.syncFiles,
            settings.data.syncExecution,
        ],
    );

    const performanceStable = useMemo(
        () => settings.performance,
        [
            settings.performance.enableAnimations,
            settings.performance.prefetchScreens,
            settings.performance.litePerformance,
        ],
    );

    const homeLayoutStable = useMemo(
        () => settings.homeLayout,
        [homeLayoutStableKey(settings.homeLayout)],
    );

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
    if (ctx) return <>{children}</>;
    return <LawyerSettingsProvider>{children}</LawyerSettingsProvider>;
}
