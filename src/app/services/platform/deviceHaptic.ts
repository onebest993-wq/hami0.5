/**
 * اهتزاز الجهاز — Capacitor Haptics على الهاتف، و navigator.vibrate على الويب/WebView.
 * iOS لا يدعم navigator.vibrate؛ بدون الملحق لا يُحسّ الاهتزاز داخل التطبيق.
 */
import { getCapacitorPlatformId, isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

/** نمط وصول إشعار داخل التطبيق — أقصر من منبّه التقويم وأوضح من نقرة واحدة */
export const HAMI_NOTIFICATION_VIBRATE_PATTERN = [80, 50, 140, 60, 220] as const;

/** نمط إشعار نظام التشغيل (ويب Notification / قناة أندرويد) */
export const HAMI_OS_NOTIFICATION_VIBRATE_PATTERN = [180, 90, 180, 90, 320] as const;

/** منبّه المواعيد — أطول ليُميَّز عن وصول إشعار */
export const HAMI_LEGAL_ALARM_VIBRATE_PATTERN = [180, 90, 180, 90, 320, 120, 420] as const;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function playWebVibrate(pattern: readonly number[]): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
        navigator.vibrate([...pattern]);
    } catch {
        /* ignore */
    }
}

async function playNativeHapticPattern(pattern: readonly number[]): Promise<boolean> {
    if (typeof window === 'undefined' || !isCapacitorNativePlatform()) return false;
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isPluginAvailable('Haptics')) return false;
        const spec = '@capacitor/haptics';
        const { Haptics, NotificationType } = (await import(/* @vite-ignore */ spec)) as {
            Haptics: {
                notification: (options: { type: string }) => Promise<void>;
                vibrate: (options: { duration: number }) => Promise<void>;
            };
            NotificationType: { Warning: string };
        };
        if (getCapacitorPlatformId() === 'ios') {
            await Haptics.notification({ type: NotificationType.Warning });
            return true;
        }
        void (async () => {
            for (let i = 0; i < pattern.length; i += 1) {
                const ms = pattern[i];
                if (i % 2 === 0) {
                    await Haptics.vibrate({ duration: Math.max(1, ms) });
                } else {
                    await sleep(ms);
                }
            }
        })();
        return true;
    } catch {
        return false;
    }
}

/**
 * لا يرمي. على الويب يُنفَّذ فوراً. على الأصل يفضّل الملحق ثم يسقط إلى Vibration API.
 */
export function playDeviceHaptic(
    pattern: readonly number[] = HAMI_NOTIFICATION_VIBRATE_PATTERN,
): void {
    if (isCapacitorNativePlatform()) {
        void playNativeHapticPattern(pattern).then((ok) => {
            if (!ok) playWebVibrate(pattern);
        });
        return;
    }
    playWebVibrate(pattern);
}
