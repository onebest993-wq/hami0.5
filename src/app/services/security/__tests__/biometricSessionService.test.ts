import { beforeEach, describe, expect, it, vi } from 'vitest';

const probeNativeBiometricAvailability = vi.fn();
const registerNativeBiometric = vi.fn();
const verifyNativeBiometricUnlock = vi.fn();
const clearNativeBiometricEnrollment = vi.fn();
const clearNativeBiometricOnDisable = vi.fn();
const hasNativeBiometricEnrollment = vi.fn();
const isCapacitorNativePlatform = vi.fn();
const isWebAuthnLockSupported = vi.fn();
const hasStoredBiometricCredential = vi.fn();
const registerBiometricCredential = vi.fn();
const verifyBiometricUnlock = vi.fn();
const clearStoredBiometricCredential = vi.fn();

vi.mock('@/app/runtime/nativeBiometricBridge', () => ({
    probeNativeBiometricAvailability: (...args: unknown[]) => probeNativeBiometricAvailability(...args),
    registerNativeBiometric: (...args: unknown[]) => registerNativeBiometric(...args),
    verifyNativeBiometricUnlock: (...args: unknown[]) => verifyNativeBiometricUnlock(...args),
    clearNativeBiometricEnrollment: (...args: unknown[]) => clearNativeBiometricEnrollment(...args),
    clearNativeBiometricOnDisable: (...args: unknown[]) => clearNativeBiometricOnDisable(...args),
    hasNativeBiometricEnrollment: () => hasNativeBiometricEnrollment(),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => isCapacitorNativePlatform(),
}));

vi.mock('@/app/services/security/webAuthnLock', () => ({
    isWebAuthnLockSupported: () => isWebAuthnLockSupported(),
    hasStoredBiometricCredential: () => hasStoredBiometricCredential(),
    registerBiometricCredential: (...args: unknown[]) => registerBiometricCredential(...args),
    verifyBiometricUnlock: (...args: unknown[]) => verifyBiometricUnlock(...args),
    clearStoredBiometricCredential: (...args: unknown[]) => clearStoredBiometricCredential(...args),
}));

import {
    clearBiometricSessionEnrollment,
    enrollBiometricSessionLock,
    hasBiometricSessionEnrollment,
    probeBiometricSession,
    reconcileBiometricSessionLockEnabled,
    verifyBiometricSessionUnlock,
} from '@/app/services/security/biometricSessionService';

describe('biometricSessionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isCapacitorNativePlatform.mockReturnValue(false);
        isWebAuthnLockSupported.mockReturnValue(false);
        hasNativeBiometricEnrollment.mockReturnValue(false);
        hasStoredBiometricCredential.mockReturnValue(false);
    });

    it('probe يُرجع none خارج الأصلي/WebAuthn', async () => {
        await expect(probeBiometricSession()).resolves.toEqual({
            channel: 'none',
            pluginLoaded: false,
            hardwareAvailable: false,
            enrolled: false,
        });
    });

    it('enroll على الأصلي يمر عبر registerNativeBiometric', async () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        registerNativeBiometric.mockResolvedValue(true);

        await expect(enrollBiometricSessionLock()).resolves.toEqual({ status: 'enrolled' });
    });

    it('reconcile يعيد reset عند علم بلا enrollment', () => {
        hasNativeBiometricEnrollment.mockReturnValue(false);
        hasStoredBiometricCredential.mockReturnValue(false);
        expect(reconcileBiometricSessionLockEnabled(true)).toBe('reset');
    });

    it('verify يستخدم المسار الأصلي عند enrollment محلي', async () => {
        hasNativeBiometricEnrollment.mockReturnValue(true);
        verifyNativeBiometricUnlock.mockResolvedValue(true);
        await expect(verifyBiometricSessionUnlock()).resolves.toBe(true);
    });

    it('clear يمسح القنوات', () => {
        clearBiometricSessionEnrollment();
        expect(clearStoredBiometricCredential).toHaveBeenCalled();
        expect(clearNativeBiometricEnrollment).toHaveBeenCalled();
    });
});
