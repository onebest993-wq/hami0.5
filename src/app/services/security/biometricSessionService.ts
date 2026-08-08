import {
    clearNativeBiometricEnrollment,
    clearNativeBiometricOnDisable,
    hasNativeBiometricEnrollment,
    isBiometryUserCancelError,
    probeNativeBiometricAvailability,
    registerNativeBiometric,
    verifyNativeBiometricUnlock,
} from '@/app/runtime/nativeBiometricBridge';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    clearStoredBiometricCredential,
    hasStoredBiometricCredential,
    isWebAuthnLockSupported,
    registerBiometricCredential,
    verifyBiometricUnlock,
} from '@/app/services/security/webAuthnLock';

export type BiometricChannel = 'native' | 'web' | 'none';

export type BiometricSessionAvailability = {
    channel: BiometricChannel;
    pluginLoaded: boolean;
    hardwareAvailable: boolean;
    enrolled: boolean;
};

export type BiometricEnrollOutcome =
    | { status: 'enrolled' }
    | { status: 'cancelled' }
    | { status: 'unavailable' }
    | { status: 'failed' };

function resolveChannel(): BiometricChannel {
    if (isCapacitorNativePlatform()) return 'native';
    if (isWebAuthnLockSupported()) return 'web';
    return 'none';
}

export function hasBiometricSessionEnrollment(): boolean {
    return hasNativeBiometricEnrollment() || (isWebAuthnLockSupported() && hasStoredBiometricCredential());
}

export async function probeBiometricSession(): Promise<BiometricSessionAvailability> {
    const channel = resolveChannel();

    if (channel === 'native') {
        const probe = await probeNativeBiometricAvailability();
        return {
            channel: 'native',
            pluginLoaded: probe.pluginLoaded,
            hardwareAvailable: probe.hardwareAvailable,
            enrolled: hasNativeBiometricEnrollment(),
        };
    }

    if (channel === 'web') {
        return {
            channel: 'web',
            pluginLoaded: true,
            hardwareAvailable: isWebAuthnLockSupported(),
            enrolled: hasStoredBiometricCredential(),
        };
    }

    return {
        channel: 'none',
        pluginLoaded: false,
        hardwareAvailable: false,
        enrolled: false,
    };
}

export function resolveBiometricSessionHint(
    availability: BiometricSessionAvailability,
    lockEnabled: boolean,
): string {
    if (availability.channel === 'native') {
        if (!availability.pluginLoaded) {
            return 'التطبيق المثبّت قديم — نفّذ: npm run cap:build:android ثم cap:install:android';
        }
        if (!availability.hardwareAvailable) {
            return 'سجّل بصمة أو Face ID في إعدادات الهاتف أولاً، ثم أعد المحاولة';
        }
        return lockEnabled
            ? 'مفعّل — يُقفل عند العودة من الخلفية وبعد الخمول'
            : 'جاهز — اضغط المفتاح وتحقق ببصمتك';
    }

    if (availability.channel === 'web') {
        return lockEnabled ? 'مفعّل عبر WebAuthn على المتصفح' : '';
    }

    if (!lockEnabled) return '';
    return 'يتطلب HTTPS وجهازاً يدعم البصمة — أو تطبيق Android/iOS';
}

export async function enrollBiometricSessionLock(): Promise<BiometricEnrollOutcome> {
    const channel = resolveChannel();

    if (channel === 'native') {
        const nativeRegistered = await registerNativeBiometric();
        if (nativeRegistered === true) return { status: 'enrolled' };
        if (nativeRegistered === false) return { status: 'cancelled' };
        return { status: 'unavailable' };
    }

    if (channel === 'web') {
        try {
            const registered = await registerBiometricCredential();
            return registered ? { status: 'enrolled' } : { status: 'failed' };
        } catch (err) {
            if (isBiometryUserCancelError(err)) return { status: 'cancelled' };
            return { status: 'failed' };
        }
    }

    return { status: 'unavailable' };
}

/** null = لا قناة بيومترية — يُستخدم مسار التأكيد البديل */
export async function verifyBiometricSessionUnlock(): Promise<boolean | null> {
    if (hasNativeBiometricEnrollment()) {
        const nativeOk = await verifyNativeBiometricUnlock();
        if (nativeOk === true) return true;
        if (nativeOk === false) return false;
        return null;
    }

    if (isWebAuthnLockSupported() && hasStoredBiometricCredential()) {
        try {
            return await verifyBiometricUnlock();
        } catch {
            return false;
        }
    }

    return null;
}

export function clearBiometricSessionEnrollment(): void {
    clearStoredBiometricCredential();
    clearNativeBiometricEnrollment();
    void clearNativeBiometricOnDisable();
}

export function reconcileBiometricSessionLockEnabled(lockEnabled: boolean): 'ok' | 'reset' {
    if (!lockEnabled) return 'ok';
    if (hasBiometricSessionEnrollment()) return 'ok';
    clearBiometricSessionEnrollment();
    return 'reset';
}
