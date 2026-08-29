import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';

const save = vi.fn();
const flushPending = vi.fn();
const persistWallpaper = vi.fn();
const applySettingsToDom = vi.fn();
const applyHomeLayoutOverridesToDom = vi.fn();
const publishLawyerSettingsLive = vi.fn();
const invalidateLawyerSettingsCache = vi.fn();
const clearBiometricSessionEnrollment = vi.fn();
const applySettingsSecurityRuntime = vi.fn(async () => 'ok');
const armLocalOnlyNetworkIsolation = vi.fn();
const syncNativePrivacyGuardFromSettings = vi.fn(async () => true);

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        save: (...args: unknown[]) => save(...args),
        flushPending: (...args: unknown[]) => flushPending(...args),
    },
}));

vi.mock('@/app/services/settings/apply', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/apply')>();
    return {
        ...actual,
        persistWallpaper: (...args: unknown[]) => persistWallpaper(...args),
        applySettingsToDom: (...args: unknown[]) => applySettingsToDom(...args),
        applyHomeLayoutOverridesToDom: (...args: unknown[]) => applyHomeLayoutOverridesToDom(...args),
    };
});

vi.mock('@/app/services/settings/settingsSnapshot', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/settingsSnapshot')>();
    return {
        ...actual,
        publishLawyerSettingsLive: (...args: unknown[]) => publishLawyerSettingsLive(...args),
        invalidateLawyerSettingsCache: () => invalidateLawyerSettingsCache(),
    };
});

vi.mock('@/app/services/security/biometricSessionService', () => ({
    clearBiometricSessionEnrollment: () => clearBiometricSessionEnrollment(),
    reconcileBiometricSessionLockEnabled: () => 'ok',
}));

vi.mock('@/app/services/settings/settingsSecurityRuntime', () => ({
    applySettingsSecurityRuntime: (...args: unknown[]) => applySettingsSecurityRuntime(...args),
}));

vi.mock('@/app/services/settings/localOnlyNetworkIsolation', () => ({
    armLocalOnlyNetworkIsolation: (...args: unknown[]) => armLocalOnlyNetworkIsolation(...args),
    installLocalOnlyNetworkIsolation: vi.fn(),
}));

vi.mock('@/app/runtime/nativePrivacyGuard', () => ({
    syncNativePrivacyGuardFromSettings: (...args: unknown[]) => syncNativePrivacyGuardFromSettings(...args),
}));

describe('persistLawyerSettingsFactoryReset', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يحفظ الافتراضيات فوراً ويطبّق الأمان ولقطة الشاشة دون لمس ملفات القضايا', async () => {
        const { persistLawyerSettingsFactoryReset, createLawyerSettingsFactoryResetSnapshot } =
            await import('@/app/services/settings/applyLawyerSettingsFactoryReset');

        const next = createLawyerSettingsFactoryResetSnapshot();
        persistLawyerSettingsFactoryReset(next);

        expect(clearBiometricSessionEnrollment).toHaveBeenCalledTimes(1);
        expect(persistWallpaper).toHaveBeenCalledWith(undefined);
        expect(save).toHaveBeenCalledWith('lawyer_settings', expect.any(Object));
        expect(save).toHaveBeenCalledWith('lawyer_theme', LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme);
        expect(save).toHaveBeenCalledWith('lawyer_shape', LAWYER_SETTINGS_V2_DEFAULTS.appearance.shape);
        expect(flushPending).toHaveBeenCalledWith('lawyer_settings');
        expect(applySettingsToDom).toHaveBeenCalledWith(next);
        expect(applyHomeLayoutOverridesToDom).toHaveBeenCalledWith(next);
        expect(armLocalOnlyNetworkIsolation).toHaveBeenCalledWith(false);
        expect(applySettingsSecurityRuntime).toHaveBeenCalledWith(next.security);
        await vi.waitFor(() => {
            expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalled();
        });
        expect(save.mock.calls.some((call) => String(call[0]).includes('lawsuit'))).toBe(false);
        expect(save.mock.calls.some((call) => String(call[0]).includes('execution'))).toBe(false);
    });
});
