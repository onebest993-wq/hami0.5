import { describe, expect, it, vi } from 'vitest';
import { callPrivacyScreenGuard, isPrivacyScreenTimingError } from '@/app/runtime/privacyScreenNative';

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: vi.fn().mockResolvedValue(undefined),
}));

const mockEnable = vi.fn();
const mockDisable = vi.fn();

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => true,
        isPluginAvailable: () => true,
    },
}));

vi.mock('@capacitor-community/privacy-screen', () => ({
    PrivacyScreen: {
        enable: (...args: unknown[]) => mockEnable(...args),
        disable: (...args: unknown[]) => mockDisable(...args),
    },
}));

describe('privacyScreenNative', () => {
    it('يكتشف أخطاء التوقيت المبكر', () => {
        expect(isPrivacyScreenTimingError(new Error('"PrivacyScreen.then()" is not implemented on android'))).toBe(
            true,
        );
    });

    it('يستدعي enable بعد جاهزية الجسر', async () => {
        mockEnable.mockResolvedValue(undefined);
        await expect(callPrivacyScreenGuard(true)).resolves.toBe(true);
        expect(mockEnable).toHaveBeenCalled();
    });
});
