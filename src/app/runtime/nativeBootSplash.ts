/**
 * تحرير SplashScreen الأصلي عبر حدث HamiBoot.notifyReady.
 *
 * عقد صارم:
 * - لا يُعتبر النجاح إلا بعد resolve من الـ plugin.
 * - ينتظر جسر Capacitor قبل الاستدعاء.
 * - عند الفشل لا يُبتلع بصمت: يُعاد المحاولة ثم يُعلن حدث فشل للقياس.
 * - Failsafe الأصلي في MainActivity يبقى شبكة أمان أخيرة فقط.
 *
 * تحذير Capacitor: لا تُعِد كائن registerPlugin من دالة async —
 * Promise.resolve يعتبره thenable فيستدعي HamiBoot.then() → «not implemented on android».
 */
import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export const NATIVE_BOOT_READY_FAILED_EVENT = 'hami:native-boot-ready-failed';

type HamiBootPlugin = {
    notifyReady: () => Promise<void>;
};

const MAX_ATTEMPTS = 8;

let plugin: HamiBootPlugin | null = null;
let notified = false;
let inFlight: Promise<boolean> | null = null;

export function isHamiBootTimingError(err: unknown): boolean {
    const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
    return (
        /HamiBoot(\.\w+)?\(\).*is not implemented/i.test(message) ||
        /HamiBoot\.then\(\)/i.test(message) ||
        /plugin is not implemented on android/i.test(message) ||
        /UNIMPLEMENTED/i.test(message)
    );
}

/** يخزّن الـ proxy محلياً — لا يُرجع أبداً من async (تفادي thenable adoption) */
async function ensureHamiBootPluginRegistered(): Promise<boolean> {
    if (plugin) return true;
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    /* التسجيل يتم من MainActivity — قد يتأخر إطاراً بعد حقن الجسر */
    plugin = registerPlugin<HamiBootPlugin>('HamiBoot');
    return true;
}

function dispatchReadyFailed(reason: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent(NATIVE_BOOT_READY_FAILED_EVENT, { detail: { reason } }),
        );
    } catch {
        /* لا شيء — فشل الإعلان لا يُخفي فشل التحرير */
    }
    if (import.meta.env.DEV) {
        console.warn('[HamiBoot] notifyReady failed:', reason);
    }
}

async function attemptNotifyReady(): Promise<boolean> {
    await whenNativeBridgeReady(4_000);
    const registered = await ensureHamiBootPluginRegistered();
    const boot = plugin;
    if (!registered || !boot) {
        dispatchReadyFailed('plugin-unavailable');
        return false;
    }
    await boot.notifyReady();
    await hideCapacitorSplashAfterReady();
    return true;
}

async function hideCapacitorSplashAfterReady(): Promise<void> {
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 0 });
    } catch {
        /* الويب/الاختبارات — AndroidX Splash يبقى شبكة الأمان عبر HamiBoot */
    }
}

/**
 * يُستدعى من markBootRevealDone فقط — بعد paint الواجهة، لا قبلها.
 * @returns true إذا وصلت الإشارة للغلاف الأصلي (أو المنصة ليست أصلية).
 */
export function notifyNativeBootReady(): Promise<boolean> {
    if (notified) return Promise.resolve(true);
    if (!isCapacitorNativePlatform()) {
        notified = true;
        return Promise.resolve(true);
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
        let lastError = 'unknown';
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                const ok = await attemptNotifyReady();
                if (ok) {
                    notified = true;
                    return true;
                }
                lastError = 'plugin-unavailable';
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                /* بعد then()/timing — أعد التسجيل في المحاولة التالية */
                plugin = null;
            }
            await new Promise<void>((resolve) => {
                window.requestAnimationFrame(() => resolve());
            });
        }
        dispatchReadyFailed(lastError);
        return false;
    })()
        .catch((err) => {
            dispatchReadyFailed(err instanceof Error ? err.message : String(err));
            return false;
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/** للاختبارات فقط */
export function resetNativeBootReadyForTests(): void {
    notified = false;
    plugin = null;
    inFlight = null;
}
