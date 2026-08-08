import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applyNativeResumeFastPath,
    resetNativeResumeFastPathForTests,
} from '@/app/runtime/nativeResumeFastPath';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => true),
}));

vi.mock('@/app/runtime/privacyBlurRuntime', () => ({
    dismissNativePrivacyShieldImmediately: vi.fn(),
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    isBootRevealDone: vi.fn(() => true),
    markBootRevealDone: vi.fn(),
}));

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
}));

import { dismissNativePrivacyShieldImmediately } from '@/app/runtime/privacyBlurRuntime';

describe('nativeResumeFastPath', () => {
    beforeEach(() => {
        resetNativeResumeFastPathForTests();
        document.documentElement.dataset.hamiNative = '1';
        vi.clearAllMocks();
    });

    it('يزيل درع الخصوصية فور العودة دون مسح initial-boot', () => {
        document.documentElement.setAttribute('data-hami-initial-boot', '1');
        applyNativeResumeFastPath();
        expect(dismissNativePrivacyShieldImmediately).toHaveBeenCalled();
        expect(document.documentElement.dataset.hamiAppActive).toBe('1');
        expect(document.documentElement.hasAttribute('data-hami-initial-boot')).toBe(true);
    });
});
