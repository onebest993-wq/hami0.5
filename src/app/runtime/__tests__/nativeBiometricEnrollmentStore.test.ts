import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => new Map<string, string>());

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: (key: string) => secureStore.get(key) ?? null,
        setItem: vi.fn(async (key: string, value: string) => {
            secureStore.set(key, value);
        }),
        setItemSync: vi.fn((key: string, value: string) => {
            secureStore.set(key, value);
        }),
        deleteItemSync: vi.fn((key: string) => {
            secureStore.delete(key);
        }),
    },
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => true),
}));

const settingsSnapshot = vi.hoisted(() => ({
    security: { biometricLock: false },
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: () => settingsSnapshot,
}));

import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    hasNativeBiometricEnrollment,
    markNativeBiometricEnrolled,
    NATIVE_BIOMETRIC_ENROLLED_KEY,
    clearNativeBiometricEnrollment,
} from '@/app/runtime/nativeBiometricEnrollmentStore';

describe('nativeBiometricEnrollmentStore', () => {
    beforeEach(() => {
        secureStore.clear();
        localStorage.clear();
        settingsSnapshot.security.biometricLock = false;
        vi.mocked(isCapacitorNativePlatform).mockReturnValue(true);
    });

    it('يكتب ويقرأ من SecureStore', () => {
        markNativeBiometricEnrolled(true);
        expect(secureStore.get(NATIVE_BIOMETRIC_ENROLLED_KEY)).toBe('1');
        expect(hasNativeBiometricEnrollment()).toBe(true);
    });

    it('يرحّل علم localStorage القديم إلى SecureStore', () => {
        localStorage.setItem(NATIVE_BIOMETRIC_ENROLLED_KEY, '1');
        expect(hasNativeBiometricEnrollment()).toBe(true);
        expect(secureStore.get(NATIVE_BIOMETRIC_ENROLLED_KEY)).toBe('1');
    });

    it('يُصلح الانفصال عند biometricLock=true بلا علم تسجيل', () => {
        settingsSnapshot.security.biometricLock = true;
        expect(hasNativeBiometricEnrollment()).toBe(true);
        expect(secureStore.get(NATIVE_BIOMETRIC_ENROLLED_KEY)).toBe('1');
    });

    it('يمسح العلم من SecureStore وlocalStorage', () => {
        markNativeBiometricEnrolled(true);
        clearNativeBiometricEnrollment();
        expect(hasNativeBiometricEnrollment()).toBe(false);
        expect(localStorage.getItem(NATIVE_BIOMETRIC_ENROLLED_KEY)).toBeNull();
    });
});
