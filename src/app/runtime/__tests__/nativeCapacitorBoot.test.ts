import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    applyCapacitorShellBoot: vi.fn(),
    applyCapacitorNativePlugins: vi.fn().mockResolvedValue(undefined),
    whenNativeBridgeReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/runtime/capacitorShellBoot', () => ({
    applyCapacitorShellBoot: mocks.applyCapacitorShellBoot,
    applyCapacitorNativePlugins: mocks.applyCapacitorNativePlugins,
}));

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: mocks.whenNativeBridgeReady,
    NATIVE_CAPACITOR_BOOT_DONE_EVENT: 'hami:capacitor-native-ready',
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => true,
}));

import {
    NATIVE_CAPACITOR_BOOT_DONE_EVENT,
    bootNativeCapacitorShell,
    resetNativeCapacitorBootForTests,
    whenNativeCapacitorBootComplete,
} from '@/app/runtime/nativeCapacitorBoot';

describe('bootNativeCapacitorShell', () => {
    beforeEach(() => {
        resetNativeCapacitorBootForTests();
        document.documentElement.dataset.hamiNative = '1';
        document.documentElement.dataset.hamiPlatform = 'android';
        mocks.applyCapacitorShellBoot.mockClear();
        mocks.applyCapacitorNativePlugins.mockClear();
        mocks.whenNativeBridgeReady.mockClear();
        (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor = {
            isNativePlatform: () => true,
        };
    });

    afterEach(() => {
        resetNativeCapacitorBootForTests();
        delete document.documentElement.dataset.hamiNative;
        delete document.documentElement.dataset.hamiPlatform;
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    it('ينتظر الجسر ثم يُهيّئ plugins مرة واحدة', async () => {
        await bootNativeCapacitorShell();
        await bootNativeCapacitorShell();

        expect(mocks.whenNativeBridgeReady).toHaveBeenCalledTimes(1);
        expect(mocks.applyCapacitorShellBoot).toHaveBeenCalled();
        expect(mocks.applyCapacitorNativePlugins).toHaveBeenCalledTimes(1);
        expect(document.documentElement.dataset.hamiCapacitorBoot).toBe('1');
    });

    it('whenNativeCapacitorBootComplete يُحل بعد الإقلاع', async () => {
        await whenNativeCapacitorBootComplete();
        expect(document.documentElement.dataset.hamiCapacitorBoot).toBe('1');
    });
});
