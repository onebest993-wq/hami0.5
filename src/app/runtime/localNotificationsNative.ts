import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { whenNativeCapacitorBootComplete } from '@/app/runtime/nativeCapacitorBoot';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

const RETRY_MS = 200;
const MAX_ATTEMPTS = 40;
export const LOCAL_NOTIFICATIONS_PLUGIN_NAME = 'LocalNotifications';

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications').LocalNotifications;

let modulePromise: Promise<typeof import('@capacitor/local-notifications') | null> | null = null;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isLocalNotificationsTimingError(err: unknown): boolean {
    const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
    return (
        /LocalNotifications(\.\w+)?\(\).*is not implemented/i.test(message) ||
        /LocalNotifications\.then\(\)/i.test(message) ||
        /plugin is not implemented on android/i.test(message) ||
        /UNIMPLEMENTED/i.test(message)
    );
}

async function loadLocalNotificationsModule(): Promise<typeof import('@capacitor/local-notifications') | null> {
    if (!modulePromise) {
        modulePromise = import('@capacitor/local-notifications').catch(() => null);
    }
    return modulePromise;
}

/**
 * يحمّل LocalNotifications بعد جاهزية الجسر — مع إعادة محاولة حتى يستجيب plugin الأصلي.
 * لا يرمي أبداً — يعيد null عند الفشل (يمنع شاشة Application boot failed).
 */
export async function acquireLocalNotificationsPlugin(): Promise<LocalNotificationsPlugin | null> {
    if (typeof window === 'undefined' || !isCapacitorNativePlatform()) return null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
            await whenNativeCapacitorBootComplete();
            await whenNativeBridgeReady();

            const { Capacitor } = await import('@capacitor/core');
            if (!Capacitor.isNativePlatform()) return null;

            const mod = await loadLocalNotificationsModule();
            const plugin = mod?.LocalNotifications;
            if (!plugin) {
                await delay(RETRY_MS);
                continue;
            }

            if (!Capacitor.isPluginAvailable(LOCAL_NOTIFICATIONS_PLUGIN_NAME)) {
                await delay(RETRY_MS);
                continue;
            }

            await plugin.checkPermissions();
            return plugin;
        } catch (err) {
            if (!isLocalNotificationsTimingError(err) || attempt >= MAX_ATTEMPTS - 1) {
                return null;
            }
            await delay(RETRY_MS);
        }
    }

    return null;
}

/** للاختبارات */
export function resetLocalNotificationsNativeForTests(): void {
    modulePromise = null;
}
