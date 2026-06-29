import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncNativeScreenshotGuard } = vi.hoisted(() => ({
    syncNativeScreenshotGuard: vi.fn(async () => undefined),
}));

vi.mock('@/app/runtime/screenshotDeterrentRuntime', () => ({
    syncNativeScreenshotGuard,
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { screenshotDeterrent: true },
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

    it('يُعطّل الحماية عند البداية ويُعيدها عند الإغلاق', async () => {
        await beginPrivacySensitiveSurface();
        expect(syncNativeScreenshotGuard).toHaveBeenCalledWith(false);

        await endPrivacySensitiveSurface();
        expect(syncNativeScreenshotGuard).toHaveBeenCalledWith(true);
    });

    it('يدعم ref-count للجلسات المتداخلة', async () => {
        await beginPrivacySensitiveSurface();
        await beginPrivacySensitiveSurface();
        expect(syncNativeScreenshotGuard).toHaveBeenCalledTimes(1);

        await endPrivacySensitiveSurface();
        expect(syncNativeScreenshotGuard).toHaveBeenCalledTimes(1);

        await endPrivacySensitiveSurface();
        expect(syncNativeScreenshotGuard).toHaveBeenCalledTimes(2);
    });

    it('runWithPrivacyScreenSuspended يُعيد التفعيل حتى عند الخطأ', async () => {
        await expect(
            runWithPrivacyScreenSuspended(async () => {
                throw new Error('fail');
            }),
        ).rejects.toThrow('fail');

        expect(syncNativeScreenshotGuard).toHaveBeenCalledWith(false);
        expect(syncNativeScreenshotGuard).toHaveBeenLastCalledWith(true);
    });
});
