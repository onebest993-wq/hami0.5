import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifySensitiveSettingsAction } from '@/app/services/settings/verifySensitiveSettingsAction';

vi.mock('@/app/services/security/biometricSessionService', () => ({
    verifyBiometricSessionUnlock: vi.fn(),
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { biometricLock: false },
    })),
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

    it('يستخدم BiometricSessionService عند تفعيل القفل', async () => {
        const snapshot = await import('@/app/services/settings/settingsSnapshot');
        const biometric = await import('@/app/services/security/biometricSessionService');
        vi.mocked(snapshot.getLawyerSettingsSnapshot).mockReturnValue({
            security: { biometricLock: true },
        } as ReturnType<typeof snapshot.getLawyerSettingsSnapshot>);
        vi.mocked(biometric.verifyBiometricSessionUnlock).mockResolvedValue(true);

        const ok = await verifySensitiveSettingsAction({ confirmPhrase: 'ignored' });
        expect(ok).toBe(true);
        expect(biometric.verifyBiometricSessionUnlock).toHaveBeenCalled();
    });
});
