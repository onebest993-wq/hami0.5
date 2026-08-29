/**
 * بوّابة كسولة لـ Motion بعد كشف الإقلاع.
 * HamiMotionConfig كان يستورد motion/react فور تركيب الـ Shell فيسحب vendor-motion
 * أثناء أول طلاء. الجسر ينتظر الكشف + خمول ثم يحمّل مرة واحدة لكل الستائر.
 */
import {
    BOOT_REVEAL_DONE_EVENT,
    getBootRevealMaxMs,
    isBootRevealDone,
} from '@/app/bootstrap/bootReveal';

type OverlayMotionRuntime = typeof import('@/app/motion/overlayMotionRuntime');

let loaded: OverlayMotionRuntime | null = null;
let inflight: Promise<OverlayMotionRuntime | null> | null = null;

function whenBootQuiet(): Promise<void> {
    if (import.meta.env.MODE === 'test') return Promise.resolve();

    return new Promise((resolve) => {
        let started = false;
        const begin = () => {
            if (started) return;
            started = true;
            const delayMs = import.meta.env.DEV ? 0 : 480;
            const timeoutMs = import.meta.env.DEV ? 800 : 8_000;
            window.setTimeout(() => {
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(() => resolve(), { timeout: timeoutMs });
                    return;
                }
                resolve();
            }, delayMs);
        };

        if (typeof window === 'undefined' || isBootRevealDone()) {
            begin();
            return;
        }

        window.addEventListener(BOOT_REVEAL_DONE_EVENT, begin, { once: true });
        window.setTimeout(begin, getBootRevealMaxMs() + 400);
    });
}

/** يحمّل Motion مرة واحدة بعد هدوء الإقلاع. الفشل يُبقي الواجهة بلا MotionConfig. */
export function loadOverlayMotion(): Promise<OverlayMotionRuntime | null> {
    if (loaded) return Promise.resolve(loaded);
    if (!inflight) {
        inflight = whenBootQuiet()
            .then(() => import('@/app/motion/overlayMotionRuntime'))
            .then((mod) => {
                loaded = mod;
                return mod;
            })
            .catch(() => {
                inflight = null;
                return null;
            });
    }
    return inflight;
}

/** تسخين بعد content-ready — أول ورقة لا تنتظر تنزيل vendor-motion */
export function prefetchOverlayMotion(): void {
    if (typeof window === 'undefined') return;
    void loadOverlayMotion();
}
