import { callBiometricNative, withReadyBiometricPlugin } from '@/app/runtime/biometricNative';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

const ANDROID_BIOMETRY_WEAK = 0;

const NATIVE_BIOMETRIC_ENROLLED_KEY = 'hami:native-biometric-enrolled';

type CheckBiometryResult = {
    isAvailable: boolean;
    strongBiometryIsAvailable?: boolean;
    biometryType?: number;
};

type BiometricAuthApi = {
    checkBiometry(): Promise<CheckBiometryResult>;
    authenticate(options?: {
        reason?: string;
        cancelTitle?: string;
        allowDeviceCredential?: boolean;
        iosFallbackTitle?: string;
        androidTitle?: string;
        androidSubtitle?: string;
        androidBiometryStrength?: number;
    }): Promise<void>;
};

const AUTH_PROMPT = {
    reason: 'تحقق للمتابعة في حامي',
    cancelTitle: 'إلغاء',
    allowDeviceCredential: true,
    iosFallbackTitle: 'استخدم رمز المرور',
    androidTitle: 'قفل حامي',
    androidSubtitle: 'تحقق ببصمتك أو Face ID',
    androidConfirmationRequired: false,
    androidBiometryStrength: ANDROID_BIOMETRY_WEAK,
} as const;

function flushUiBeforeBiometricPrompt(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

const BIOMETRIC_AUTH_TIMEOUT_MS = 45_000;

function withBiometricAuthTimeout<T>(promise: Promise<T>, ms = BIOMETRIC_AUTH_TIMEOUT_MS): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(Object.assign(new Error('biometric_auth_timeout'), { code: 'timeout' }));
        }, ms);
        promise.then(
            (value) => {
                window.clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                window.clearTimeout(timer);
                reject(error);
            },
        );
    });
}

export function isBiometryUserCancelError(err: unknown): boolean {
    const code = String((err as { code?: unknown } | null)?.code ?? '');
    return code === 'userCancel' || code === 'systemCancel' || code === 'appCancel';
}

export type NativeBiometricProbe = {
    /** داخل غلاف Capacitor أصلي */
    nativeShell: boolean;
    /** نجح تحميل plugin */
    pluginLoaded: boolean;
    /** الجهاز يوفّر بصمة/Face ID */
    hardwareAvailable: boolean;
};

export function isNativeBiometricPluginAvailable(): boolean {
    return isCapacitorNativePlatform();
}

export function hasNativeBiometricEnrollment(): boolean {
    try {
        return localStorage.getItem(NATIVE_BIOMETRIC_ENROLLED_KEY) === '1';
    } catch {
        return false;
    }
}

export function clearNativeBiometricEnrollment(): void {
    try {
        localStorage.removeItem(NATIVE_BIOMETRIC_ENROLLED_KEY);
    } catch {
        /* private mode */
    }
}

function markNativeBiometricEnrolled(enrolled: boolean): void {
    try {
        if (enrolled) localStorage.setItem(NATIVE_BIOMETRIC_ENROLLED_KEY, '1');
        else localStorage.removeItem(NATIVE_BIOMETRIC_ENROLLED_KEY);
    } catch {
        /* private mode */
    }
}

/** فحص جاهزية البيومتري الأصلي دون نافذة مصادقة */
export async function probeNativeBiometricAvailability(): Promise<NativeBiometricProbe> {
    const nativeShell = isCapacitorNativePlatform();
    if (!nativeShell) {
        return { nativeShell: false, pluginLoaded: false, hardwareAvailable: false };
    }
    try {
        const result = await callBiometricNative((plugin) => plugin.checkBiometry());
        if (!result) {
            return { nativeShell: true, pluginLoaded: false, hardwareAvailable: false };
        }
        return {
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: Boolean(result.isAvailable),
        };
    } catch {
        return { nativeShell: true, pluginLoaded: true, hardwareAvailable: false };
    }
}

/** null = لا plugin — استخدم WebAuthn على الويب فقط */
export async function registerNativeBiometric(): Promise<boolean | null> {
    if (!isCapacitorNativePlatform()) return null;

    try {
        const registered = await withReadyBiometricPlugin(async (plugin) => {
            const { isAvailable } = await plugin.checkBiometry();
            if (!isAvailable) return false;
            await flushUiBeforeBiometricPrompt();
            await withBiometricAuthTimeout(
                plugin.authenticate({
                    ...AUTH_PROMPT,
                    reason: 'تفعيل القفل البيومتري في حامي',
                }),
            );
            return true;
        });
        if (registered === null) return null;
        if (registered) markNativeBiometricEnrolled(true);
        return registered;
    } catch (err) {
        if (isBiometryUserCancelError(err)) return false;
        return false;
    }
}

/** null = لا plugin — استخدم WebAuthn */
export async function verifyNativeBiometricUnlock(): Promise<boolean | null> {
    if (!isCapacitorNativePlatform()) return null;
    if (!hasNativeBiometricEnrollment()) return false;

    try {
        const verified = await withReadyBiometricPlugin(async (plugin) => {
            const { isAvailable } = await plugin.checkBiometry();
            if (!isAvailable) return false;
            await flushUiBeforeBiometricPrompt();
            await withBiometricAuthTimeout(plugin.authenticate(AUTH_PROMPT));
            return true;
        });
        if (verified === null) return null;
        return verified;
    } catch (err) {
        if (isBiometryUserCancelError(err)) return false;
        return false;
    }
}

export async function clearNativeBiometricOnDisable(): Promise<void> {
    markNativeBiometricEnrolled(false);
}
