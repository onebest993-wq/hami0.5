import { beforeEach, describe, expect, it, vi } from 'vitest';

const isCapacitorNativePlatform = vi.fn();
const loadBiometricAuthPlugin = vi.fn();
const callBiometricNative = vi.fn();
const withReadyBiometricPlugin = vi.fn();

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => isCapacitorNativePlatform(),
}));

vi.mock('@/app/runtime/nativeCapacitorPluginRegistry', () => ({
    loadBiometricAuthPlugin: (...args: unknown[]) => loadBiometricAuthPlugin(...args),
}));

vi.mock('@/app/runtime/nativeBiometricEnrollmentStore', () => ({
    hasNativeBiometricEnrollment: vi.fn(() => false),
    markNativeBiometricEnrolled: vi.fn(),
    clearNativeBiometricEnrollment: vi.fn(),
}));

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/runtime/privacyBlurRuntime', () => ({
    dismissNativePrivacyShieldImmediately: vi.fn(),
}));

vi.mock('@/app/runtime/nativeSensitivePrompt', () => ({
    withNativeSensitivePrompt: async (fn: () => Promise<unknown>) => fn(),
    isNativeSensitivePromptActive: () => false,
}));

vi.mock('@/app/runtime/biometricNative', () => ({
    callBiometricNative: (...args: unknown[]) => callBiometricNative(...args),
    withReadyBiometricPlugin: (...args: unknown[]) => withReadyBiometricPlugin(...args),
}));

import {
    probeNativeBiometricAvailability,
    registerNativeBiometric,
} from '@/app/runtime/nativeBiometricBridge';
import { markNativeBiometricEnrolled } from '@/app/runtime/nativeBiometricEnrollmentStore';

describe('nativeBiometricBridge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isCapacitorNativePlatform.mockReturnValue(false);
        callBiometricNative.mockImplementation(async (fn: (plugin: unknown) => unknown) => {
            const plugin = await loadBiometricAuthPlugin();
            if (!plugin) return null;
            return fn(plugin);
        });
        withReadyBiometricPlugin.mockImplementation(async (fn: (plugin: unknown) => unknown) => {
            const plugin = await loadBiometricAuthPlugin();
            if (!plugin) return null;
            return fn(plugin);
        });
        loadBiometricAuthPlugin.mockResolvedValue(null);
    });

    it('يعيد probe فارغ خارج الغلاف الأصلي', async () => {
        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: false,
            pluginLoaded: false,
            hardwareAvailable: false,
            strongBiometryAvailable: false,
        });
    });

    it('يكتشف غياب الـ plugin داخل الغلاف', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        loadBiometricAuthPlugin.mockResolvedValue(null);

        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: true,
            pluginLoaded: false,
            hardwareAvailable: false,
            strongBiometryAvailable: false,
        });
    });

    it('يقرأ توفر العتاد من checkBiometry', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        loadBiometricAuthPlugin.mockResolvedValue({
            checkBiometry: vi.fn().mockResolvedValue({ isAvailable: true }),
            authenticate: vi.fn(),
        });

        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: true,
            strongBiometryAvailable: false,
        });
    });

    it('يفضّل Class 3 عندما يعلن الجهاز توفّره', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        loadBiometricAuthPlugin.mockResolvedValue({
            checkBiometry: vi.fn().mockResolvedValue({ isAvailable: true, strongBiometryIsAvailable: true }),
            authenticate: vi.fn(),
        });

        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: true,
            strongBiometryAvailable: true,
        });
    });

    it('يسجّل enrollment بعد مصادقة ناجحة', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        const authenticate = vi.fn().mockResolvedValue(undefined);
        loadBiometricAuthPlugin.mockResolvedValue({
            checkBiometry: vi.fn().mockResolvedValue({ isAvailable: true, strongBiometryIsAvailable: true }),
            authenticate,
        });

        await expect(registerNativeBiometric()).resolves.toBe(true);
        expect(authenticate).toHaveBeenCalledWith(
            expect.objectContaining({ androidBiometryStrength: 1 }),
        );
        expect(markNativeBiometricEnrolled).toHaveBeenCalledWith(true);
    });
});
