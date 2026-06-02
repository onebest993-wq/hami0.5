import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import {
    applySettingsToDom,
    migrateLawyerSettings,
    shouldAllowPush,
    invalidateLawyerSettingsCache,
    persistWallpaper,
    type AppSettingsState,
} from '@/app/services/settings';
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

export function LawyerSettingsProvider({ children }: { children: React.ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<ThemeKey>(
        () => persistenceRepository.load<ThemeKey>('lawyer_theme') || 'gold',
    );
    const [currentShape, setCurrentShape] = useState<ShapeKey>(
        () => persistenceRepository.load<ShapeKey>('lawyer_shape') || 'pill',
    );

    const [settings, setSettings] = useState<AppSettingsState>(() =>
        migrateLawyerSettings(
            persistenceRepository.load('lawyer_settings'),
            persistenceRepository.load<ThemeKey>('lawyer_theme'),
            persistenceRepository.load<ShapeKey>('lawyer_shape'),
        ),
    );

    const autoSaveOn = settings.data.autoSave;
    useAutoSave('lawyer_settings', settings, 2_000, autoSaveOn);
    useAutoSave('lawyer_theme', currentTheme, 2_000, autoSaveOn);
    useAutoSave('lawyer_shape', currentShape, 2_000, autoSaveOn);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('hami:settings-updated', { detail: settings }));
    }, [settings]);

    const patchSettings = useCallback(
        (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => {
            setSettings((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
        },
        [],
    );

    useEffect(() => {
        invalidateLawyerSettingsCache();
        applySettingsToDom(settings);
    }, [settings]);

    useEffect(() => {
        if (settings.appearance.themeMode !== 'auto') return undefined;
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = () => applySettingsToDom(settings);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [settings, settings.appearance.themeMode]);

    useEffect(() => {
        setSettings((prev) => ({
            ...prev,
            appearance: { ...prev.appearance, theme: currentTheme, shape: currentShape },
        }));
    }, [currentTheme, currentShape]);

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

    const resetToDefaults = useCallback(() => {
        const migrated = migrateLawyerSettings(null);
        clearStoredBiometricCredential();
        persistWallpaper(undefined);
        setSettings(migrated);
        setCurrentTheme(migrated.appearance.theme);
        setCurrentShape(migrated.appearance.shape);
        persistenceRepository.save('lawyer_settings', migrated);
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
        [settings, patchSettings, currentTheme, currentShape, resetToDefaults],
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
