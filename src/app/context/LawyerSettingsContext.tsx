import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import {
    applySettingsToDom,
    migrateLawyerSettings,
    shouldAllowPush,
    invalidateLawyerSettingsCache,
    persistWallpaper,
    loadPersistedWallpaper,
    normalizeBackgroundPreset,
    normalizeBackgroundPatternBlur,
    normalizeBackgroundPatternOpacity,
    type AppSettingsState,
} from '@/app/services/settings';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings/lawyerThemeTokens';
import { clearStoredBiometricCredential } from '@/app/services/security/webAuthnLock';

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

function loadInitialSettings(): AppSettingsState {
    const migrated = migrateLawyerSettings(
        persistenceRepository.load('lawyer_settings'),
        persistenceRepository.load<ThemeKey>('lawyer_theme'),
        persistenceRepository.load<ShapeKey>('lawyer_shape'),
    );
    const wallpaper = migrated.appearance.wallpaper ?? loadPersistedWallpaper();
    return {
        ...migrated,
        appearance: {
            ...migrated.appearance,
            wallpaper,
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

export function LawyerSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettingsState>(loadInitialSettings);
    const [currentTheme, setCurrentThemeState] = useState<ThemeKey>(() => settings.appearance.theme);
    const [currentShape, setCurrentShapeState] = useState<ShapeKey>(() => settings.appearance.shape);

    const autoSaveOn = settings.data.autoSave;
    const settingsForPersistence = useMemo(() => stripWallpaperForStorage(settings), [settings]);
    const settingsForPersistenceRef = useRef(settingsForPersistence);
    settingsForPersistenceRef.current = settingsForPersistence;

    useAutoSave('lawyer_settings', settingsForPersistence, 2_000, autoSaveOn);
    useAutoSave('lawyer_theme', currentTheme, 2_000, autoSaveOn);
    useAutoSave('lawyer_shape', currentShape, 2_000, autoSaveOn);

    // تفضيلات البيانات تُحفظ فوراً — حتى مع إيقاف الحفظ التلقائي
    useEffect(() => {
        persistenceRepository.save('lawyer_settings', settingsForPersistenceRef.current);
        invalidateLawyerSettingsCache();
    }, [settings.data]);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('hami:settings-updated', { detail: settings }));
    }, [settings]);

    useEffect(() => {
        invalidateLawyerSettingsCache();
        applySettingsToDom(settings);
    }, [settings]);

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
        const blockMenu = (e: Event) => e.preventDefault();
        if (settings.security.screenshotDeterrent) {
            document.addEventListener('contextmenu', blockMenu);
            return () => document.removeEventListener('contextmenu', blockMenu);
        }
        return undefined;
    }, [settings.security.screenshotDeterrent]);

    const patchSettings = useCallback(
        (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => {
            setSettings((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
        },
        [],
    );

    const resetToDefaults = useCallback(() => {
        const migrated = migrateLawyerSettings(null);
        clearStoredBiometricCredential();
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

    return <LawyerSettingsContext.Provider value={value}>{children}</LawyerSettingsContext.Provider>;
}

export function useLawyerSettings() {
    const ctx = useContext(LawyerSettingsContext);
    if (!ctx) throw new Error('useLawyerSettings must be used within LawyerSettingsProvider');
    return ctx;
}

export function useLawyerSettingsOptional() {
    return useContext(LawyerSettingsContext);
}
