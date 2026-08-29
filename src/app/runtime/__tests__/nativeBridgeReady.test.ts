import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetNativeBridgeReadyForTests, whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';

const mockGetState = vi.fn().mockResolvedValue({ isActive: true });

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        isPluginAvailable: (name: string) => name === 'App',
    },
}));

vi.mock('@capacitor/app', () => ({
    App: {
        getState: () => mockGetState(),
    },
}));

describe('whenNativeBridgeReady', () => {
    beforeEach(() => {
        resetNativeBridgeReadyForTests();
        mockGetState.mockClear();
        document.documentElement.dataset.hamiNative = '1';
        document.documentElement.dataset.hamiPlatform = 'android';
        (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor = {
            isNativePlatform: () => true,
        };
    });

    afterEach(() => {
        resetNativeBridgeReadyForTests();
        delete document.documentElement.dataset.hamiNative;
        delete document.documentElement.dataset.hamiPlatform;
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
        vi.clearAllMocks();
    });

    it('ينتظر حتى يثبت App.getState أن الجسر جاهز دون تعطيل PrivacyScreen', async () => {
        await expect(whenNativeBridgeReady(500)).resolves.toBeUndefined();
        await vi.waitFor(() => {
            expect(mockGetState).toHaveBeenCalled();
        });
    });
});
