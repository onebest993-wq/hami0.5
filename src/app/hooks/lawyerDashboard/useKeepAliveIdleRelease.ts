import { useEffect, useRef } from 'react';

import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

/** مدة إبقاء overlay keep-alive بعد الإغلاق — قبل unmount */
const OVERLAY_KEEP_ALIVE_MS = 8 * 60 * 1_000;
const OVERLAY_KEEP_ALIVE_LITE_MS = 4 * 60 * 1_000;
const OVERLAY_KEEP_ALIVE_NATIVE_MS = 90 * 1_000;
const OVERLAY_KEEP_ALIVE_LITE_NATIVE_MS = 60 * 1_000;

/** مدة إبقاء تبويب مثبت (تقويم/ملف) بعد مغادرته */
const LATCHED_TAB_IDLE_MS = 10 * 60 * 1_000;
const LATCHED_TAB_IDLE_LITE_MS = 5 * 60 * 1_000;
const LATCHED_TAB_IDLE_NATIVE_MS = 3 * 60 * 1_000;
const LATCHED_TAB_IDLE_LITE_NATIVE_MS = 2 * 60 * 1_000;

export function getOverlayKeepAliveIdleMs(): number {
    if (isCapacitorNativePlatform()) {
        return isLitePerformanceActive()
            ? OVERLAY_KEEP_ALIVE_LITE_NATIVE_MS
            : OVERLAY_KEEP_ALIVE_NATIVE_MS;
    }
    return isLitePerformanceActive() ? OVERLAY_KEEP_ALIVE_LITE_MS : OVERLAY_KEEP_ALIVE_MS;
}

export function getLatchedTabIdleReleaseMs(): number {
    if (isCapacitorNativePlatform()) {
        return isLitePerformanceActive()
            ? LATCHED_TAB_IDLE_LITE_NATIVE_MS
            : LATCHED_TAB_IDLE_NATIVE_MS;
    }
    return isLitePerformanceActive() ? LATCHED_TAB_IDLE_LITE_MS : LATCHED_TAB_IDLE_MS;
}

/**
 * يستدعي onRelease بعد بقاء `active=false` لمدة idleMs.
 * يُلغى المؤقت فور عودة active — للحفاظ على السرعة عند إعادة الفتح السريع.
 */
export function useKeepAliveIdleRelease(
    active: boolean,
    onRelease: () => void,
    idleMs = getOverlayKeepAliveIdleMs(),
): void {
    const releaseRef = useRef(onRelease);
    releaseRef.current = onRelease;

    useEffect(() => {
        if (active) return;
        const timer = window.setTimeout(() => releaseRef.current(), idleMs);
        return () => window.clearTimeout(timer);
    }, [active, idleMs]);
}
