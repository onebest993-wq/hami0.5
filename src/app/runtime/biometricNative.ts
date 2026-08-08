import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { whenNativeCapacitorBootComplete } from '@/app/runtime/nativeCapacitorBoot';
import { loadBiometricAuthPlugin } from '@/app/runtime/nativeCapacitorPluginRegistry';

const RETRY_MS = 200;
const MAX_ATTEMPTS = 40;
/** اسم التسجيل الأصلي في @aparajita/capacitor-biometric-auth */
export const BIOMETRIC_PLUGIN_NAME = 'BiometricAuthNative';

type BiometricPlugin = NonNullable<Awaited<ReturnType<typeof loadBiometricAuthPlugin>>>;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isBiometricTimingError(err: unknown): boolean {
    const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
    return (
        /BiometricAuth(Native)?(\.\w+)?\(\).*is not implemented/i.test(message) ||
        /BiometricAuthNative\.then\(\)/i.test(message) ||
        /plugin is not implemented on android/i.test(message) ||
        /UNIMPLEMENTED/i.test(message)
    );
}

async function ensureBiometricRuntimeReady(): Promise<boolean> {
    await whenNativeCapacitorBootComplete();
    await whenNativeBridgeReady();
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    if (Capacitor.isPluginAvailable(BIOMETRIC_PLUGIN_NAME)) return true;
    /* بعد registerPlugin من الاستيراد — isPluginAvailable قد يتأخر إطاراً */
    const plugin = await loadBiometricAuthPlugin();
    return Boolean(plugin);
}

/**
 * يستدعي دوال البيومتري بعد جاهزية الجسر — مع إعادة محاولة حتى يستجيب plugin الأصلي.
 * لا يرمي أبداً — يعيد null عند الفشل (يمنع شاشة Application boot failed).
 */
async function acquireReadyBiometricPlugin(): Promise<BiometricPlugin | null> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
            const runtimeReady = await ensureBiometricRuntimeReady();
            if (!runtimeReady) {
                await delay(RETRY_MS);
                continue;
            }

            const plugin = await loadBiometricAuthPlugin();
            if (!plugin) {
                await delay(RETRY_MS);
                continue;
            }

            await plugin.checkBiometry();
            return plugin;
        } catch (err) {
            if (!isBiometricTimingError(err)) {
                return null;
            }
            if (attempt >= MAX_ATTEMPTS - 1) {
                return null;
            }
            await delay(RETRY_MS);
        }
    }

    return null;
}

/** للفحص فقط — يبتلع أخطاء المصادقة ولا يرمي */
export async function callBiometricNative<T>(
    fn: (plugin: BiometricPlugin) => Promise<T>,
): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    const plugin = await acquireReadyBiometricPlugin();
    if (!plugin) return null;

    try {
        return await fn(plugin);
    } catch {
        return null;
    }
}

/**
 * يجهّز الـ plugin ثم ينفّذ الإجراء — أخطاء المصادقة (BiometryError) تُمرَّر للمستدعي.
 * null يعني أن الـ plugin غير جاهز بعد إعادة المحاولات.
 */
export async function withReadyBiometricPlugin<T>(
    fn: (plugin: BiometricPlugin) => Promise<T>,
): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    const plugin = await acquireReadyBiometricPlugin();
    if (!plugin) return null;

    return fn(plugin);
}

/** للاختبارات — يثبت أن BiometricAuthNative يستجيب */
export async function probeBiometricPlugin(): Promise<boolean> {
    try {
        const result = await callBiometricNative((plugin) => plugin.checkBiometry());
        return result !== null;
    } catch {
        return false;
    }
}
