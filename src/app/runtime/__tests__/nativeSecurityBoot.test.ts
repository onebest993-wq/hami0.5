import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncNativePrivacyGuardFromSettings, getLawyerSettingsSnapshot } = vi.hoisted(() => ({
    syncNativePrivacyGuardFromSettings: vi.fn(async () => true),
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { screenshotDeterrent: true, privacyBlur: true },
    })),
}));

vi.mock('@/app/runtime/nativePrivacyGuard', () => ({
    syncNativePrivacyGuardFromSettings,
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot,
}));

import {
    applyNativeSecurityFromSettings,
    wireNativeSecuritySettingsListener,
} from '@/app/runtime/nativeSecurityBoot';

describe('nativeSecurityBoot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('applyNativeSecurityFromSettings يُزامِن حسب snapshot', async () => {
        await applyNativeSecurityFromSettings();
        expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalled();
    });

    it('wireNativeSecuritySettingsListener يستجيب لـ hami:settings-updated', async () => {
        getLawyerSettingsSnapshot.mockReturnValue({
            security: { screenshotDeterrent: false },
        });

        const dispose = wireNativeSecuritySettingsListener();
        window.dispatchEvent(new CustomEvent('hami:settings-updated'));
        await Promise.resolve();

        expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalled();
        dispose();
    });
});
