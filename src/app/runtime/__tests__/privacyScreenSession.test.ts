import { beforeEach, describe, expect, it, vi } from 'vitest';

const { applyNativePrivacyGuard, syncNativePrivacyGuardFromSettings } = vi.hoisted(() => ({
    applyNativePrivacyGuard: vi.fn(async () => undefined),
    syncNativePrivacyGuardFromSettings: vi.fn(async () => undefined),
}));

vi.mock('@/app/runtime/nativePrivacyGuard', () => ({
    applyNativePrivacyGuard,
    syncNativePrivacyGuardFromSettings,
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { screenshotDeterrent: true, privacyBlur: true },
    })),
}));

import {
    beginPrivacySensitiveSurface,
    endPrivacySensitiveSurface,
    runWithPrivacyScreenSuspended,
} from '@/app/runtime/privacyScreenSession';

describe('privacyScreenSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يُعطّل FLAG_SECURE عند البداية ويُعيد الحماية عند الإغلاق', async () => {
        await beginPrivacySensitiveSurface();
        expect(applyNativePrivacyGuard).toHaveBeenCalledWith({
            recentsCover: true,
            windowSecure: false,
        });

        await endPrivacySensitiveSurface();
        expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalled();
    });

    it('يدعم ref-count للجلسات المتداخلة', async () => {
        await beginPrivacySensitiveSurface();
        await beginPrivacySensitiveSurface();
        expect(applyNativePrivacyGuard).toHaveBeenCalledTimes(1);

        await endPrivacySensitiveSurface();
        expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalledTimes(0);

        await endPrivacySensitiveSurface();
        expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalledTimes(1);
    });

    it('runWithPrivacyScreenSuspended يُعيد التفعيل حتى عند الخطأ', async () => {
        await expect(
            runWithPrivacyScreenSuspended(async () => {
                throw new Error('fail');
            }),
        ).rejects.toThrow('fail');

        expect(applyNativePrivacyGuard).toHaveBeenCalledWith({
            recentsCover: true,
            windowSecure: false,
        });
        expect(syncNativePrivacyGuardFromSettings).toHaveBeenCalled();
    });
});
