import { callBiometricNative, withReadyBiometricPlugin } from '@/app/runtime/biometricNative';
import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { dismissNativePrivacyShieldImmediately } from '@/app/runtime/privacyBlurRuntime';
import { withNativeSensitivePrompt } from '@/app/runtime/nativeSensitivePrompt';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    clearNativeBiometricEnrollment,
    hasNativeBiometricEnrollment,
    markNativeBiometricEnrolled,
} from '@/app/runtime/nativeBiometricEnrollmentStore';

export {
    clearNativeBiometricEnrollment,
    hasNativeBiometricEnrollment,
    markNativeBiometricEnrolled,
    NATIVE_BIOMETRIC_ENROLLED_KEY,
} from '@/app/runtime/nativeBiometricEnrollmentStore';

const ANDROID_BIOMETRY_WEAK = 0;
const ANDROID_BIOMETRY_STRONG = 1;

type CheckBiometryResult = {
    isAvailable: boolean;
    strongBiometryIsAvailable?: boolean;
    biometryType?: number;
    deviceIsSecure?: boolean;
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

const AUTH_PROMPT_BASE = {
    reason: 'تحقق للمتابعة في حامي',
    cancelTitle: 'إلغاء',
    allowDeviceCredential: true,
    iosFallbackTitle: 'استخدم رمز المرور',
    androidTitle: 'قفل حامي',
    androidSubtitle: 'تحقق ببصمتك أو Face ID',
    androidConfirmationRequired: false,
} as const;

function resolveAuthPrompt(strongAvailable: boolean) {
    return {
        ...AUTH_PROMPT_BASE,
        androidBiometryStrength: strongAvailable ? ANDROID_BIOMETRY_STRONG : ANDROID_BIOMETRY_WEAK,
    };
}

function flushUiBeforeBiometricPrompt(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

const BIOMETRIC_AUTH_TIMEOUT_MS = 45_000;
const BIOMETRIC_BRIDGE_READY_MS = 12_000;

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

function isBiometryHardwareUnavailableError(err: unknown): boolean {
    const code = String((err as { code?: unknown } | null)?.code ?? '');
    return (
        code === 'biometryNotAvailable' ||
        code === 'biometryNotEnrolled' ||
        code === 'noDeviceCredential' ||
        code === 'passcodeNotSet'
    );
}

function canAttemptNativeAuth(check: CheckBiometryResult): boolean {
    return Boolean(check.isAvailable || check.deviceIsSecure);
}

async function waitUntilAppInteractive(): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 2_500) {
        if (typeof document === 'undefined' || !document.hidden) return;
        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 50);
        });
    }
}

/** يزيل درع التمويه وينتظر الجسر قبل نافذة BiometricPrompt — يمنع notInteractive على بعض أجهزة Android */
export async function prepareNativeBiometricPrompt(): Promise<void> {
    dismissNativePrivacyShieldImmediately();
    await whenNativeBridgeReady(BIOMETRIC_BRIDGE_READY_MS);
    await waitUntilAppInteractive();
    await flushUiBeforeBiometricPrompt();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
}

export type NativeBiometricProbe = {
    /** داخل غلاف Capacitor أصلي */
    nativeShell: boolean;
    /** نجح تحميل plugin */
    pluginLoaded: boolean;
    /** الجهاز يوفّر بصمة/Face ID */
    hardwareAvailable: boolean;
    /** Class 3 متاح — يُفضَّل على الضعيف */
    strongBiometryAvailable: boolean;
};

export function isNativeBiometricPluginAvailable(): boolean {
    return isCapacitorNativePlatform();
}

/** فحص جاهزية البيومتري الأصلي دون نافذة مصادقة */
export async function probeNativeBiometricAvailability(): Promise<NativeBiometricProbe> {
    const nativeShell = isCapacitorNativePlatform();
    if (!nativeShell) {
        return {
            nativeShell: false,
            pluginLoaded: false,
            hardwareAvailable: false,
            strongBiometryAvailable: false,
        };
    }
    try {
        const result = await callBiometricNative((plugin) => plugin.checkBiometry());
        if (!result) {
            return {
                nativeShell: true,
                pluginLoaded: false,
                hardwareAvailable: false,
                strongBiometryAvailable: false,
            };
        }
        return {
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: Boolean(result.isAvailable),
            strongBiometryAvailable: Boolean(result.strongBiometryIsAvailable),
        };
    } catch {
        return {
            nativeShell: true,
            pluginLoaded: true,
            hardwareAvailable: false,
            strongBiometryAvailable: false,
        };
    }
}

/** null = لا plugin — استخدم WebAuthn على الوеб فقط */
export async function registerNativeBiometric(): Promise<boolean | null> {
    if (!isCapacitorNativePlatform()) return null;

    try {
        return await withNativeSensitivePrompt(async () => {
            await prepareNativeBiometricPrompt();
            const registered = await withReadyBiometricPlugin(async (plugin) => {
                const check = await plugin.checkBiometry();
                if (!canAttemptNativeAuth(check)) return null;
                await withBiometricAuthTimeout(
                    plugin.authenticate({
                        ...resolveAuthPrompt(Boolean(check.strongBiometryIsAvailable)),
                        reason: 'تفعيل القفل البيومتري في حامي',
                    }),
                );
                return true;
            });
            if (registered === null) return null;
            if (registered) markNativeBiometricEnrolled(true);
            return registered;
        });
    } catch (err) {
        if (isBiometryUserCancelError(err)) return false;
        if (isBiometryHardwareUnavailableError(err)) return null;
        return false;
    }
}

/** null = لا plugin — استخدم WebAuthn */
export async function verifyNativeBiometricUnlock(): Promise<boolean | null> {
    if (!isCapacitorNativePlatform()) return null;
    if (!hasNativeBiometricEnrollment()) return false;

    try {
        return await withNativeSensitivePrompt(async () => {
            await prepareNativeBiometricPrompt();
            const verified = await withReadyBiometricPlugin(async (plugin) => {
                const check = await plugin.checkBiometry();
                if (!canAttemptNativeAuth(check)) return null;
                await withBiometricAuthTimeout(
                    plugin.authenticate(resolveAuthPrompt(Boolean(check.strongBiometryIsAvailable))),
                );
                return true;
            });
            if (verified === null) return null;
            return verified;
        });
    } catch (err) {
        if (isBiometryUserCancelError(err)) return false;
        if (isBiometryHardwareUnavailableError(err)) return null;
        return false;
    }
}

export async function clearNativeBiometricOnDisable(): Promise<void> {
    clearNativeBiometricEnrollment();
}
