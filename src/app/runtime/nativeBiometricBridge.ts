import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { loadOptionalCapacitorPlugin } from '@/app/runtime/optionalCapacitorPluginLoad';

const NATIVE_BIOMETRIC_ENROLLED_KEY = 'hami:native-biometric-enrolled';

const BIOMETRIC_MODULE = '@aparajita/capacitor-biometric-auth';

type BiometricAuthApi = {
    checkBiometry(): Promise<{ isAvailable: boolean }>;
    authenticate(options?: {
        reason?: string;
        cancelTitle?: string;
        allowDeviceCredential?: boolean;
        iosFallbackTitle?: string;
        androidTitle?: string;
        androidSubtitle?: string;
    }): Promise<void>;
};

type BiometricAuthModule = {
    BiometricAuth: BiometricAuthApi;
};

async function loadBiometricPlugin(): Promise<BiometricAuthApi | null> {
    if (!isCapacitorNativePlatform()) return null;
    const mod = await loadOptionalCapacitorPlugin<BiometricAuthModule>(BIOMETRIC_MODULE);
    return mod?.BiometricAuth ?? null;
}

const AUTH_PROMPT = {
    reason: 'تحقق للمتابعة في حامي',
    cancelTitle: 'إلغاء',
    allowDeviceCredential: true,
    iosFallbackTitle: 'استخدم رمز المرور',
    androidTitle: 'قفل حامي',
    androidSubtitle: 'تحقق ببصمتك أو Face ID',
} as const;

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

/** null = لا plugin — استخدم WebAuthn */
export async function registerNativeBiometric(): Promise<boolean | null> {
    const plugin = await loadBiometricPlugin();
    if (!plugin) return null;

    try {
        const { isAvailable } = await plugin.checkBiometry();
        if (!isAvailable) return false;
        await plugin.authenticate({
            ...AUTH_PROMPT,
            reason: 'تفعيل القفل البيومتري في حامي',
        });
        markNativeBiometricEnrolled(true);
        return true;
    } catch {
        return false;
    }
}

/** null = لا plugin — استخدم WebAuthn */
export async function verifyNativeBiometricUnlock(): Promise<boolean | null> {
    const plugin = await loadBiometricPlugin();
    if (!plugin) return null;

    if (!hasNativeBiometricEnrollment()) return false;

    try {
        const { isAvailable } = await plugin.checkBiometry();
        if (!isAvailable) return false;
        await plugin.authenticate(AUTH_PROMPT);
        return true;
    } catch {
        return false;
    }
}

export async function clearNativeBiometricOnDisable(): Promise<void> {
    markNativeBiometricEnrolled(false);
}
