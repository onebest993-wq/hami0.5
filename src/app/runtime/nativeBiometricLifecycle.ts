import type { PluginListenerHandle } from '@capacitor/core';
import { callBiometricNative } from '@/app/runtime/biometricNative';

export type NativeBiometryAvailabilityListener = (available: boolean) => void;

/** يُحدّث توفر البيومتري عند العودة من الخلفية — يُعيد دالة تنظيف */
export async function wireNativeBiometricAvailabilityListener(
    onChange: NativeBiometryAvailabilityListener,
): Promise<() => void> {
    try {
        const wired = await callBiometricNative(async (plugin) => {
            const initial = await plugin.checkBiometry();
            const handle = await plugin.addResumeListener((info) => {
                onChange(info.isAvailable);
            });
            return { initial, handle };
        });

        if (!wired) return () => undefined;

        onChange(wired.initial.isAvailable);

        return () => {
            void wired.handle.remove();
        };
    } catch {
        return () => undefined;
    }
}
