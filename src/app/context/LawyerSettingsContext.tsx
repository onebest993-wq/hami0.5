import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import {
    applySettingsToDom,
    migrateLawyerSettings,
    shouldAllowPush,
    shouldAllowPushFromSecurity,
    invalidateLawyerSettingsCache,
    getLawyerSettingsSnapshot,
    persistWallpaper,
    loadPersistedWallpaper,
    hydrateWallpaperFromSecureStore,
    normalizeBackgroundPreset,
    normalizeBackgroundPatternBlur,
    normalizeBackgroundPatternOpacity,
    type AppSettingsState,
    type AppearanceSettings,
    type DataSettings,
    type PerformanceSettings,
    type SecuritySettings,
    type HomeLayoutSettings,
} from '@/app/services/settings';
import { SETTINGS_SCHEMA_VERSION } from '@/app/services/settings/types';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings/lawyerThemeTokens';
import { clearStoredBiometricCredential } from '@/app/services/security/webAuthnLock';
import { clearNativeBiometricEnrollment } from '@/app/runtime/nativeBiometricBridge';
import { bindWebScreenshotDeterrent } from '@/app/runtime/screenshotDeterrentRuntime';
import {
    applyNativeSecurityFromSettings,
    wireNativeSecuritySettingsListener,
} from '@/app/runtime/nativeSecurityBoot';

type LawyerSettingsContextValue = {
    settings: AppSettingsState;
    setSettings: React.Dispatch<React.SetStateAction<AppSettingsState>>;
    patchSettings: (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => void;
    currentTheme: ThemeKey;
    currentShape: ShapeKey;
    setCurrentTheme: (t: ThemeKey) => void;
    setCurrentShape: (s: ShapeKey) => void;
    pushAllowed: boolean;
    resetToDefaults: () => void;
};

const LawyerSettingsContext = createContext<LawyerSettingsContextValue | null>(null);
const LawyerSettingsAppearanceContext = createContext<AppearanceSettings | null>(null);
const LawyerSettingsSecurityContext = createContext<SecuritySettings | null>(null);
const LawyerSettingsDataContext = createContext<DataSettings | null>(null);
const LawyerSettingsPerformanceContext = createContext<PerformanceSettings | null>(null);
const LawyerSettingsHomeLayoutContext = createContext<HomeLayoutSettings | null>(null);

type LawyerSettingsActionsValue = {
    setSettings: React.Dispatch<React.SetStateAction<AppSettingsState>>;
    patchSettings: (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => void;
    setCurrentTheme: (t: ThemeKey) => void;
    setCurrentShape: (s: ShapeKey) => void;
    resetToDefaults: () => void;
};

const LawyerSettingsActionsContext = createContext<LawyerSettingsActionsValue | null>(null);

function loadInitialSettings(): AppSettingsState {
    const migrated = migrateLawyerSettings(
        persistenceRepository.load('lawyer_settings'),
        persistenceRepository.load<ThemeKey>('lawyer_theme'),
        persistenceRepository.load<ShapeKey>('lawyer_shape'),
    );
    if (migrated.appearance.wallpaper) {
        persistWallpaper(migrated.appearance.wallpaper);
    }
    const hasWallpaper = Boolean(loadPersistedWallpaper());
    return {
        ...migrated,
        appearance: {
            ...migrated.appearance,
            wallpaper: undefined,
            wallpaperStamp: hasWallpaper ? 1 : undefined,
            backgroundPreset: normalizeBackgroundPreset(migrated.appearance.backgroundPreset),
            backgroundPatternOpacity: normalizeBackgroundPatternOpacity(migrated.appearance.backgroundPatternOpacity),
            backgroundPatternBlur: normalizeBackgroundPatternBlur(migrated.appearance.backgroundPatternBlur),
        },
    };
}

/** الصورة تُحفظ في lawyer_wallpaper — لا نكرّرها داخل lawyer_settings */
function stripWallpaperForStorage(state: AppSettingsState): AppSettingsState {
    if (!state.appearance.wallpaper) return state;
    return { ...state, appearance: { ...state.appearance, wallpaper: undefined } };
}

/** تجنّب إعادة رسم الواجهة إذا لم يتغيّر ترتيب/إظهار الحاويات */
function homeLayoutStableKey(layout: AppSettingsState['homeLayout']): string {
    return JSON.stringify({
        placements: layout.placements,
        dockVisible: layout.dockVisible,
        quickNoteVisible: layout.quickNoteVisible,
        dockHiddenWidgetIds: layout.dockHiddenWidgetIds,
        overrides: layout.overrides,
    });
}

function settingsLayoutEqual(a: AppSettingsState, b: AppSettingsState): boolean {
    return (
        homeLayoutStableKey(a.homeLayout) === homeLayoutStableKey(b.homeLayout) &&
        a.appearance.theme === b.appearance.theme &&
        a.appearance.shape === b.appearance.shape &&
        a.appearance.backgroundPreset === b.appearance.backgroundPreset &&
        a.appearance.glassOpacity === b.appearance.glassOpacity &&
        a.appearance.homeContainerBorder === b.appearance.homeContainerBorder
    );
}

const BOOT_DEFAULT_SETTINGS = migrateLawyerSettings(null);

export function LawyerSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settingsHydrated, setSettingsHydrated] = useState(false);
    const [settings, setSettings] = useState<AppSettingsState>(BOOT_DEFAULT_SETTINGS);
    const [currentTheme, setCurrentThemeState] = useState<ThemeKey>(BOOT_DEFAULT_SETTINGS.appearance.theme);
    const [currentShape, setCurrentShapeState] = useState<ShapeKey>(BOOT_DEFAULT_SETTINGS.appearance.shape);
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    useLayoutEffect(() => {
        const loaded = loadInitialSettings();
        setSettings((prev) => (settingsLayoutEqual(prev, loaded) ? prev : loaded));
        setCurrentThemeState((prev) =>
            prev === loaded.appearance.theme ? prev : loaded.appearance.theme,
        );
        setCurrentShapeState((prev) =>
            prev === loaded.appearance.shape ? prev : loaded.appearance.shape,
        );
        setSettingsHydrated(true);
        applySettingsToDom(loaded);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const reconcileFromStore = () => {
            const loaded = loadInitialSettings();
            setSettings((prev) => (settingsLayoutEqual(prev, loaded) ? prev : loaded));
            setCurrentThemeState((prev) =>
                prev === loaded.appearance.theme ? prev : loaded.appearance.theme,
            );
            setCurrentShapeState((prev) =>
                prev === loaded.appearance.shape ? prev : loaded.appearance.shape,
            );
        };
        void SecureStoreService.ensureBootShellReady().then(() => {
            if (!cancelled) reconcileFromStore();
        });
        void SecureStoreService.ensurePersistedReady();
        return () => {
            cancelled = true;
        };
    }, []);

    const autoSaveOn = settings.data.autoSave;
    const settingsForPersistence = useMemo(() => stripWallpaperForStorage(settings), [settings]);
    const settingsForPersistenceRef = useRef(settingsForPersistence);
    settingsForPersistenceRef.current = settingsForPersistence;

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
        return bindWebScreenshotDeterrent();
    }, [settings.security.screenshotDeterrent]);

    useEffect(() => {
        void applyNativeSecurityFromSettings();
        return wireNativeSecuritySettingsListener();
    }, []);

    const patchSettings = useCallback(
        (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => {
            setSettings((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
        },
        [],
    );

    const resetToDefaults = useCallback(() => {
        const migrated = migrateLawyerSettings(null);
        clearStoredBiometricCredential();
        clearNativeBiometricEnrollment();
        persistWallpaper(undefined);
        const stripped = stripWallpaperForStorage(migrated);
        setSettings(migrated);
        setCurrentThemeState(migrated.appearance.theme);
        setCurrentShapeState(migrated.appearance.shape);
        persistenceRepository.save('lawyer_settings', stripped);
        persistenceRepository.save('lawyer_theme', migrated.appearance.theme);
        persistenceRepository.save('lawyer_shape', migrated.appearance.shape);
        invalidateLawyerSettingsCache();
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
            settings.data.weeklyBackupReminder,
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

/** يوفّر السياق إن لم يكن موجوداً — يمنع تكرار الحالة عند التداخل */
export function EnsureLawyerSettingsProvider({ children }: { children: React.ReactNode }) {
    const ctx = useContext(LawyerSettingsContext);
    if (ctx) return <>{children}</>;
    return <LawyerSettingsProvider>{children}</LawyerSettingsProvider>;
}

const noop = () => undefined;

function isDevSettingsFallbackAllowed(): boolean {
    return import.meta.env.DEV && typeof window !== 'undefined';
}

function useSettingsSliceContext<T>(
    context: React.Context<T | null>,
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
        setSettings: noop as React.Dispatch<React.SetStateAction<AppSettingsState>>,
        patchSettings: noop,
        currentTheme: snapshot.appearance.theme,
        currentShape: snapshot.appearance.shape,
        setCurrentTheme: noop,
        setCurrentShape: noop,
        pushAllowed: shouldAllowPush(snapshot),
        resetToDefaults: () => {
            invalidateLawyerSettingsCache();
            applySettingsToDom(migrateLawyerSettings(null));
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

/** مظهر فقط — لا يُعاد الرسم عند تغيير البيانات/الأمان */
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

/** إشعارات push — يُعاد الرسم فقط عند تغيير localOnlyMode */
export function useLawyerSettingsPushAllowed(): boolean {
    const security = useLawyerSettingsSecurity();
    return useMemo(() => shouldAllowPushFromSecurity(security), [security.localOnlyMode]);
}

/** إعدادات كاملة مُجمّعة من slices — بدون الاشتراك في LawyerSettingsContext الجذري */
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

/** إجراءات مستقرة — لا تُعاد رسم المستهلك عند تغيير قيم الإعدادات */
export function useLawyerSettingsActions(): LawyerSettingsActionsValue {
    const ctx = useContext(LawyerSettingsActionsContext);
    if (ctx) return ctx;
    if (isDevSettingsFallbackAllowed()) {
        return {
            setSettings: noop as React.Dispatch<React.SetStateAction<AppSettingsState>>,
            patchSettings: noop,
            setCurrentTheme: noop,
            setCurrentShape: noop,
            resetToDefaults: () => {
                invalidateLawyerSettingsCache();
                applySettingsToDom(migrateLawyerSettings(null));
            },
        };
    }
    throw new Error('useLawyerSettingsActions must be used within LawyerSettingsProvider');
}

export function useLawyerSettingsReset(): () => void {
    return useLawyerSettingsActions().resetToDefaults;
}
