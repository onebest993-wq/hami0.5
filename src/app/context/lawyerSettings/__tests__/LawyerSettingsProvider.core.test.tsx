import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';

const save = vi.fn();
const persistWallpaper = vi.fn();
const applySettingsToDom = vi.fn();
const publishLawyerSettingsLive = vi.fn();
const invalidateLawyerSettingsCache = vi.fn();
const clearStoredBiometricCredential = vi.fn();
const clearBiometricSessionEnrollment = vi.fn();
const syncNativeScreenshotGuard = vi.fn();

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        load: vi.fn(),
        save: (...args: unknown[]) => save(...args),
        flushPending: vi.fn(),
    },
}));

vi.mock('@/app/hooks/useAutoSave', () => ({
    useAutoSave: () => undefined,
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    onBootContentReady: () => () => undefined,
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        ensureBootShellReady: () => Promise.resolve(),
        ensurePersistedReady: () => Promise.resolve(),
    },
}));

vi.mock('@/app/services/settings/apply', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/apply')>();
    return {
        ...actual,
        applySettingsToDom: (...args: unknown[]) => applySettingsToDom(...args),
        persistWallpaper: (...args: unknown[]) => persistWallpaper(...args),
        loadPersistedWallpaper: () => undefined,
        hydrateWallpaperFromSecureStore: () => Promise.resolve(undefined),
        shouldAllowPush: () => true,
    };
});

vi.mock('@/app/services/settings/settingsSnapshot', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/settingsSnapshot')>();
    return {
        ...actual,
        getLawyerSettingsSnapshot: () => LAWYER_SETTINGS_V2_DEFAULTS,
        publishLawyerSettingsLive: (...args: unknown[]) => publishLawyerSettingsLive(...args),
        invalidateLawyerSettingsCache: () => invalidateLawyerSettingsCache(),
    };
});

vi.mock('@/app/context/lawyerSettings/lawyerSettingsPersistence', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/context/lawyerSettings/lawyerSettingsPersistence')>();
    return {
        ...actual,
        loadInitialSettingsAsync: () => Promise.resolve(LAWYER_SETTINGS_V2_DEFAULTS),
    };
});

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => false,
    getCapacitorPlatformId: () => 'web',
    isAndroidNativeShell: () => false,
}));

vi.mock('@/app/services/security/webAuthnLock', () => ({
    clearStoredBiometricCredential: () => clearStoredBiometricCredential(),
}));

vi.mock('@/app/services/security/biometricSessionService', () => ({
    clearBiometricSessionEnrollment: () => clearBiometricSessionEnrollment(),
    reconcileBiometricSessionLockEnabled: () => 'ok',
}));

vi.mock('@/app/runtime/screenshotDeterrentRuntime', () => ({
    syncNativeScreenshotGuard: (...args: unknown[]) => syncNativeScreenshotGuard(...args),
    bindWebScreenshotDeterrent: () => () => undefined,
}));

vi.mock('@/app/services/settings/localOnlyNetworkIsolation', () => ({
    armLocalOnlyNetworkIsolation: vi.fn(),
    installLocalOnlyNetworkIsolation: vi.fn(),
}));

import { LawyerSettingsProvider } from '@/app/context/lawyerSettings/LawyerSettingsProvider';
import { useLawyerSettings, useLawyerSettingsActions } from '@/app/context/lawyerSettings/lawyerSettingsHooks';

function wrapper({ children }: { children: React.ReactNode }) {
    return <LawyerSettingsProvider>{children}</LawyerSettingsProvider>;
}

describe('LawyerSettingsProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('setCurrentTheme يحدّث الثيم و brandColor', async () => {
        const { result } = renderHook(
            () => ({
                settings: useLawyerSettings(),
                actions: useLawyerSettingsActions(),
            }),
            { wrapper },
        );

        await act(async () => {
            result.current.actions.setCurrentTheme('navy');
        });

        expect(result.current.settings.currentTheme).toBe('navy');
        expect(result.current.settings.settings.appearance.theme).toBe('navy');
        expect(result.current.settings.settings.appearance.brandColor).toBeTruthy();
    });

    it('resetToDefaults يعيد القيم الافتراضية ويحفظ على القرص', async () => {
        const { result } = renderHook(
            () => ({
                settings: useLawyerSettings(),
                actions: useLawyerSettingsActions(),
            }),
            { wrapper },
        );

        await act(async () => {
            result.current.actions.setCurrentTheme('crimson');
        });

        await act(async () => {
            result.current.settings.resetToDefaults();
        });

        expect(result.current.settings.settings.appearance.theme).toBe(
            LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme,
        );
        expect(save).toHaveBeenCalledWith('lawyer_settings', expect.any(Object));
        expect(save).toHaveBeenCalledWith('lawyer_theme', LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme);
        expect(clearBiometricSessionEnrollment).toHaveBeenCalled();
        expect(persistWallpaper).toHaveBeenCalledWith(undefined);
        expect(invalidateLawyerSettingsCache).toHaveBeenCalled();
        expect(applySettingsToDom).toHaveBeenCalled();
        expect(save).toHaveBeenCalledWith('lawyer_theme', LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme);
    });

    it('patchSettings يدمج التعديلات الجزئية', async () => {
        const { result } = renderHook(
            () => ({
                settings: useLawyerSettings(),
                actions: useLawyerSettingsActions(),
            }),
            { wrapper },
        );

        await act(async () => {
            result.current.actions.patchSettings({
                security: {
                    ...result.current.settings.settings.security,
                    localOnlyMode: true,
                },
            });
        });

        expect(result.current.settings.settings.security.localOnlyMode).toBe(true);
    });
});
