import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncNativeScreenshotGuard, getLawyerSettingsSnapshot } = vi.hoisted(() => ({
    syncNativeScreenshotGuard: vi.fn(async () => undefined),
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { screenshotDeterrent: true },
    })),
}));

vi.mock('@/app/runtime/screenshotDeterrentRuntime', () => ({
    syncNativeScreenshotGuard,
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
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
        expect(syncNativeScreenshotGuard).toHaveBeenCalledWith(true);
    });

    it('wireNativeSecuritySettingsListener يستجيب لـ hami:settings-updated', async () => {
        getLawyerSettingsSnapshot.mockReturnValue({
            security: { screenshotDeterrent: false },
        });

        const dispose = wireNativeSecuritySettingsListener();
        window.dispatchEvent(new CustomEvent('hami:settings-updated'));
        await Promise.resolve();

        expect(syncNativeScreenshotGuard).toHaveBeenCalledWith(false);
        dispose();
    });
});
