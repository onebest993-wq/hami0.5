import type { PluginListenerHandle } from '@capacitor/core';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { loadOptionalCapacitorPlugin } from '@/app/runtime/optionalCapacitorPluginLoad';

const BIOMETRIC_MODULE = '@aparajita/capacitor-biometric-auth';

type BiometricAuthApi = {
    checkBiometry(): Promise<{ isAvailable: boolean }>;
    addResumeListener(
        listener: (info: { isAvailable: boolean }) => void,
    ): Promise<PluginListenerHandle>;
};

type BiometricAuthModule = {
    BiometricAuth: BiometricAuthApi;
};

async function loadBiometricPlugin(): Promise<BiometricAuthApi | null> {
    if (!isCapacitorNativePlatform()) return null;
    const mod = await loadOptionalCapacitorPlugin<BiometricAuthModule>(BIOMETRIC_MODULE);
    return mod?.BiometricAuth ?? null;
}

export type NativeBiometryAvailabilityListener = (available: boolean) => void;

/** يُحدّث توفر البيومتري عند العودة من الخلفية — يُعيد دالة تنظيف */
export async function wireNativeBiometricAvailabilityListener(
    onChange: NativeBiometryAvailabilityListener,
): Promise<() => void> {
    const plugin = await loadBiometricPlugin();
    if (!plugin) return () => undefined;

    try {
        const initial = await plugin.checkBiometry();
        onChange(initial.isAvailable);

        const handle = await plugin.addResumeListener((info) => {
            onChange(info.isAvailable);
        });

        return () => {
            void handle.remove();
        };
    } catch {
        return () => undefined;
    }
}
