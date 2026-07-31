import { beforeEach, describe, expect, it, vi } from 'vitest';

const isCapacitorNativePlatform = vi.fn();
const loadOptionalCapacitorPlugin = vi.fn();

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => isCapacitorNativePlatform(),
}));

vi.mock('@/app/runtime/optionalCapacitorPluginLoad', () => ({
    loadOptionalCapacitorPlugin: (...args: unknown[]) => loadOptionalCapacitorPlugin(...args),
}));

import {
    clearNativeBiometricEnrollment,
    hasNativeBiometricEnrollment,
    probeNativeBiometricAvailability,
    registerNativeBiometric,
} from '@/app/runtime/nativeBiometricBridge';

describe('nativeBiometricBridge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clearNativeBiometricEnrollment();
        isCapacitorNativePlatform.mockReturnValue(false);
        loadOptionalCapacitorPlugin.mockResolvedValue(null);
    });

    it('يعيد probe فارغ خارج الغلاف الأصلي', async () => {
        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: false,
            pluginLoaded: false,
            hardwareAvailable: false,
        });
    });

    it('يكتشف غياب الـ plugin داخل الغلاف', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        loadOptionalCapacitorPlugin.mockResolvedValue(null);

        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: true,
            pluginLoaded: false,
            hardwareAvailable: false,
        });
    });

    it('يقرأ توفر العتاد من checkBiometry', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        loadOptionalCapacitorPlugin.mockResolvedValue({
            BiometricAuth: {
                checkBiometry: vi.fn().mockResolvedValue({ isAvailable: true }),
                authenticate: vi.fn(),
            },
        });

        await expect(probeNativeBiometricAvailability()).resolves.toEqual({
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: true,
        });
    });

    it('يسجّل enrollment بعد مصادقة ناجحة', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        const authenticate = vi.fn().mockResolvedValue(undefined);
        loadOptionalCapacitorPlugin.mockResolvedValue({
            BiometricAuth: {
                checkBiometry: vi.fn().mockResolvedValue({ isAvailable: true }),
                authenticate,
            },
        });

        await expect(registerNativeBiometric()).resolves.toBe(true);
        expect(authenticate).toHaveBeenCalled();
        expect(hasNativeBiometricEnrollment()).toBe(true);
    });
});
