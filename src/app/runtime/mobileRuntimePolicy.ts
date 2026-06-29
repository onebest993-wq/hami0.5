import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import type { LitePerformanceMode } from '@/app/services/settings/types';

/** تأخير موجات prefetch — أطول على الأجهزة المقيدة */
export function getMobilePrefetchDelayMs(baseMs: number, liteMode?: LitePerformanceMode): number {
    if (!isLitePerformanceActive(liteMode)) return baseMs;
    return Math.round(baseMs * 2.75);
}

/** تأجيل خدمات الخلفية حتى يستقر التفاعل الأول */
export function getBackgroundServicesDeferMs(liteMode?: LitePerformanceMode): number {
    const base = import.meta.env.DEV ? 4_000 : 18_000;
    return getMobilePrefetchDelayMs(base, liteMode);
}

type IdleWorkOptions = {
    timeoutMs?: number;
    minDelayMs?: number;
};

/** تشغيل عمل غير حرج بعد الخمول — يحترم الوضع الخفيف بتأخير أطول */
export function scheduleIdleWork(fn: () => void, options?: IdleWorkOptions): () => void {
    const lite = isLitePerformanceActive();
    const minDelayMs = options?.minDelayMs ?? (lite ? 2_500 : 0);
    const timeoutMs = options?.timeoutMs ?? (lite ? 12_000 : 4_000);

    let cancelled = false;
    let idleId: number | undefined;
    let timerId: number | undefined;

    const run = () => {
        if (cancelled) return;
        if (typeof requestIdleCallback !== 'undefined') {
            idleId = requestIdleCallback(
                () => {
                    if (!cancelled) fn();
                },
                { timeout: timeoutMs },
            );
        } else {
            timerId = window.setTimeout(() => {
                if (!cancelled) fn();
            }, Math.min(timeoutMs, 1_200));
        }
    };

    if (minDelayMs > 0) {
        timerId = window.setTimeout(run, minDelayMs);
    } else {
        run();
    }

    return () => {
        cancelled = true;
        if (timerId !== undefined) window.clearTimeout(timerId);
        if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
            cancelIdleCallback(idleId);
        }
    };
}

/** زخرفة/خلفية ثقيلة — تُعطَّل في الوضع الخفيف */
export function shouldRenderDecorativeLayers(liteMode?: LitePerformanceMode): boolean {
    return !isLitePerformanceActive(liteMode);
}
