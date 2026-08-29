import SecureStoreService from '@/app/services/SecureStoreService';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

/** نفس مفتاح localStorage السابق — يُكتب الآن في SecureStore أيضاً */
export const NATIVE_BIOMETRIC_ENROLLED_KEY = 'hami:native-biometric-enrolled';

function readLegacyLocalEnrollment(): boolean {
    try {
        return localStorage.getItem(NATIVE_BIOMETRIC_ENROLLED_KEY) === '1';
    } catch {
        return false;
    }
}

function writeLegacyLocalEnrollment(enrolled: boolean): void {
    try {
        if (enrolled) localStorage.setItem(NATIVE_BIOMETRIC_ENROLLED_KEY, '1');
        else localStorage.removeItem(NATIVE_BIOMETRIC_ENROLLED_KEY);
    } catch {
        /* private mode */
    }
}

/**
 * على الهاتف كان `biometricLock` يُحفظ في SecureStore بينما علم التسجيل في localStorage فقط —
 * فينفصلان بعد إعادة التشغيل أو «مسح الذاكرة المؤقتة» فيُعاد ضبط القفل أو يفشل الفتح.
 */
export function hasNativeBiometricEnrollment(): boolean {
    try {
        const fromSecure = SecureStoreService.getItemSync(NATIVE_BIOMETRIC_ENROLLED_KEY);
        if (fromSecure === '1') return true;
    } catch {
        /* ignore */
    }

    if (readLegacyLocalEnrollment()) {
        SecureStoreService.setItemSync(NATIVE_BIOMETRIC_ENROLLED_KEY, '1');
        return true;
    }

    if (isCapacitorNativePlatform()) {
        try {
            if (getLawyerSettingsSnapshot().security.biometricLock) {
                markNativeBiometricEnrolled(true);
                return true;
            }
        } catch {
            /* boot قبل hydrate */
        }
    }

    return false;
}

export function markNativeBiometricEnrolled(enrolled: boolean): void {
    writeLegacyLocalEnrollment(enrolled);
    try {
        if (enrolled) {
            SecureStoreService.setItemSync(NATIVE_BIOMETRIC_ENROLLED_KEY, '1');
        } else {
            SecureStoreService.deleteItemSync(NATIVE_BIOMETRIC_ENROLLED_KEY);
        }
    } catch {
        /* best effort */
    }
}

export function clearNativeBiometricEnrollment(): void {
    markNativeBiometricEnrolled(false);
}
