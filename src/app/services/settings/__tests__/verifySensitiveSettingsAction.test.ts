import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifySensitiveSettingsAction } from '@/app/services/settings/verifySensitiveSettingsAction';

vi.mock('@/app/runtime/nativeBiometricBridge', () => ({
    hasNativeBiometricEnrollment: vi.fn(() => false),
    verifyNativeBiometricUnlock: vi.fn(),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { biometricLock: false },
    })),
}));

vi.mock('@/app/services/security/webAuthnLock', () => ({
    isWebAuthnLockSupported: vi.fn(() => false),
    hasStoredBiometricCredential: vi.fn(() => false),
    verifyBiometricUnlock: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        prompt: vi.fn(),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
    },
}));

describe('verifySensitiveSettingsAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يقبل العبارة المطابقة', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        vi.mocked(SmartDialog.prompt).mockResolvedValue('مسح نهائي');

        const ok = await verifySensitiveSettingsAction({ confirmPhrase: 'مسح نهائي' });
        expect(ok).toBe(true);
    });

    it('يرفض عبارة خاطئة', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        vi.mocked(SmartDialog.prompt).mockResolvedValue('خطأ');

        const ok = await verifySensitiveSettingsAction({ confirmPhrase: 'مسح نهائي' });
        expect(ok).toBe(false);
    });

    it('يستخدم البيومتري عند تفعيله', async () => {
        const runtime = await import('@/app/services/settings/settingsRuntime');
        const webAuthn = await import('@/app/services/security/webAuthnLock');
        vi.mocked(runtime.getLawyerSettingsSnapshot).mockReturnValue({
            security: { biometricLock: true },
        } as ReturnType<typeof runtime.getLawyerSettingsSnapshot>);
        vi.mocked(webAuthn.isWebAuthnLockSupported).mockReturnValue(true);
        vi.mocked(webAuthn.hasStoredBiometricCredential).mockReturnValue(true);
        vi.mocked(webAuthn.verifyBiometricUnlock).mockResolvedValue(true);

        const ok = await verifySensitiveSettingsAction({ confirmPhrase: 'ignored' });
        expect(ok).toBe(true);
        expect(webAuthn.verifyBiometricUnlock).toHaveBeenCalled();
    });
});
