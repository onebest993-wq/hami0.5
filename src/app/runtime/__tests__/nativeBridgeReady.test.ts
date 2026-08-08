import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetNativeBridgeReadyForTests, whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';

const mockDisable = vi.fn().mockResolvedValue(undefined);
const mockGetState = vi.fn().mockResolvedValue({ isActive: true });

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        isPluginAvailable: (name: string) => name === 'App' || name === 'PrivacyScreen',
    },
}));

vi.mock('@capacitor/app', () => ({
    App: {
        getState: () => mockGetState(),
    },
}));

vi.mock('@capacitor-community/privacy-screen', () => ({
    PrivacyScreen: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: () => mockDisable(),
    },
}));

describe('whenNativeBridgeReady', () => {
    beforeEach(() => {
        resetNativeBridgeReadyForTests();
        mockDisable.mockClear();
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

    it('ينتظر حتى يثبت PrivacyScreen.disable أن الجسر جاهز', async () => {
        await expect(whenNativeBridgeReady(500)).resolves.toBeUndefined();
        expect(mockDisable).toHaveBeenCalled();
    });
});
