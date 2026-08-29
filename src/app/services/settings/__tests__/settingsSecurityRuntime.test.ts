import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applySettingsSecurityRuntime } from '@/app/services/settings/settingsSecurityRuntime';

const unsubscribeAll = vi.fn().mockResolvedValue(undefined);
const reconcileBiometricSessionLockEnabled = vi.fn();

const removeAllChannels = vi.fn().mockResolvedValue('ok');
const disconnectRealtime = vi.fn();

vi.mock('@/app/services/RealtimeService', () => ({
    RealtimeService: {
        unsubscribeAll: (...args: unknown[]) => unsubscribeAll(...args),
    },
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        removeAllChannels: (...args: unknown[]) => removeAllChannels(...args),
        realtime: { disconnect: () => disconnectRealtime() },
    },
}));

vi.mock('@/app/services/security/biometricSessionService', () => ({
    reconcileBiometricSessionLockEnabled: (...args: unknown[]) =>
        reconcileBiometricSessionLockEnabled(...args),
}));

describe('applySettingsSecurityRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        reconcileBiometricSessionLockEnabled.mockReturnValue('ok');
    });

    it('يفصل Realtime عند تفعيل الوضع المحلي', async () => {
        await applySettingsSecurityRuntime({
            localOnlyMode: true,
            privacyBlur: true,
            biometricLock: false,
            autoLockMinutes: 0,
            screenshotDeterrent: false,
        });

        expect(unsubscribeAll).toHaveBeenCalledTimes(1);
        expect(removeAllChannels).toHaveBeenCalledTimes(1);
        expect(disconnectRealtime).toHaveBeenCalledTimes(1);
    });

    it('يعيد ضبط القفل البيومتري عند علم بلا enrollment', async () => {
        reconcileBiometricSessionLockEnabled.mockReturnValue('reset');
        const patchSecurity = vi.fn();

        const result = await applySettingsSecurityRuntime(
            {
                localOnlyMode: false,
                privacyBlur: true,
                biometricLock: true,
                autoLockMinutes: 5,
                screenshotDeterrent: false,
            },
            { patchSecurity },
        );

        expect(result).toBe('biometric-reset');
        expect(patchSecurity).toHaveBeenCalledWith({ biometricLock: false });
    });
});
