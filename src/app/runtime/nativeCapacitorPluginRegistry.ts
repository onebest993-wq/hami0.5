import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { whenNativeCapacitorBootComplete } from '@/app/runtime/nativeCapacitorBoot';

type BiometricAuthModule = typeof import('@aparajita/capacitor-biometric-auth');
type PrivacyScreenModule = typeof import('@capacitor-community/privacy-screen');

type BiometricAuthApi = BiometricAuthModule['BiometricAuth'];
type PrivacyScreenApi = PrivacyScreenModule['PrivacyScreen'];

let biometricModulePromise: Promise<BiometricAuthModule | null> | null = null;
let privacyScreenModulePromise: Promise<PrivacyScreenModule | null> | null = null;

/**
 * استيراد ثابت (literal) — Vite يضمّن الـ plugin في الحزمة.
 * loadOptionalCapacitorPlugin كان يتخطى التحليل فتفشل الإضافات على الجهاز.
 */
export async function loadBiometricAuthPlugin(): Promise<BiometricAuthApi | null> {
    if (!isCapacitorNativePlatform()) return null;
    await whenNativeCapacitorBootComplete();
    if (!biometricModulePromise) {
        biometricModulePromise = import('@aparajita/capacitor-biometric-auth').catch(() => null);
    }
    const mod = await biometricModulePromise;
    return mod?.BiometricAuth ?? null;
}

export async function loadPrivacyScreenPlugin(): Promise<PrivacyScreenApi | null> {
    if (!isCapacitorNativePlatform()) return null;
    if (!privacyScreenModulePromise) {
        privacyScreenModulePromise = import('@capacitor-community/privacy-screen').catch(() => null);
    }
    const mod = await privacyScreenModulePromise;
    return mod?.PrivacyScreen ?? null;
}

/** للاختبارات */
export function resetNativeCapacitorPluginRegistryForTests(): void {
    biometricModulePromise = null;
    privacyScreenModulePromise = null;
}
