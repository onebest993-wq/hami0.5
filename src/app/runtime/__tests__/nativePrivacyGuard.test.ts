import { beforeEach, describe, expect, it, vi } from 'vitest';

const isCapacitorNativePlatform = vi.fn(() => false);

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => isCapacitorNativePlatform(),
}));

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: vi.fn(async () => undefined),
}));

vi.mock('@/app/runtime/privacyScreenNative', () => ({
    callPrivacyScreenGuard: vi.fn(async () => true),
}));

vi.mock('@/plugins/hami-privacy-guard', () => ({
    HamiPrivacy: {
        setGuard: vi.fn(async () => undefined),
        beginSensitivePrompt: vi.fn(async () => undefined),
        endSensitivePrompt: vi.fn(async () => undefined),
    },
}));

import { applyNativePrivacyGuard } from '@/app/runtime/nativePrivacyGuard';

describe('applyNativePrivacyGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isCapacitorNativePlatform.mockReturnValue(false);
    });

    it('على الويب يعتبر التطبيق ناجحاً دون جسر', async () => {
        await expect(
            applyNativePrivacyGuard({ recentsCover: true, windowSecure: true }),
        ).resolves.toBe(true);
    });
});
