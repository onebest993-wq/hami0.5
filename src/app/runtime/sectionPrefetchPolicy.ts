import { isLitePerformanceActive, isNativeShellStampedOnDom } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

/**
 * سياسة تسخين الأقسام — عضو واحد في نواة المشروع بدل نسخ localOnly/prefetch/lite.
 * يقرأ اللقطة الخفيفة لا طبقة تطبيق الإعدادات (apply / إشعارات).
 */
export function isSectionBackgroundPrefetchAllowed(options?: { allowOnLite?: boolean }): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (!options?.allowOnLite && isLitePerformanceActive(s.performance.litePerformance)) {
            return false;
        }
    } catch {
        /* ignore */
    }
    return true;
}

/** تأخير idle بعد interactive — native غالباً 80ms؛ -1 = لا تُجدول. */
export function sectionBackgroundHydrateDelayMs(
    nativeDelayMs = 80,
    webDelayMs = 0,
    allowed = isSectionBackgroundPrefetchAllowed(),
): number {
    if (!allowed) return -1;
    if (isNativeShellStampedOnDom()) return nativeDelayMs;
    return webDelayMs;
}
