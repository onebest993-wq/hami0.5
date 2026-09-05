/**
 * تثبيت Resolved لمداخل التنفيذ/الجزائي — من إقلاع التنفيذ بعد كشف اللوحة،
 * ومن موجة 0ms بعد الخفيف. لا من موجة الجدول. بلا استيراد برميل lazyEntries
 * (كان يجرّ منتدى/جدول/بحث عند تسخين الملف أو التنفيذ).
 *
 * لا يُحلَّل هنا: جدول (الموجة الثقيلة)، دعوى جديدة / أرشيف غير تنفيذي (نية).
 * التحليل متسلسل — لا ثلاثة مداخل تنفيذ + جزائي + غطاءين في مهمة واحدة.
 */
import { prefetchExecutionOverlayEntries } from '@/app/runtime/executionOverlayEntryLoader';
import { prefetchCriminalOverlayEntry } from '@/app/runtime/criminalOverlayEntryLoader';
import { runWarmSteps } from '@/app/runtime/yieldToMain';

export function stampMainViewOverlayEntryPreloads(): void {
    void runWarmSteps([
        () => prefetchExecutionOverlayEntries(),
        () => {
            prefetchCriminalOverlayEntry();
        },
        () =>
            import('@/app/components/lawyer/dashboard/overlayInstantChromeLazy').then((m) =>
                m.LazyExecutionArchiveInstantChrome.preload(),
            ),
        () =>
            import('@/app/components/lawyer/dashboard/overlayInstantChromeLazy').then((m) =>
                m.LazyCriminalDashboardBootChrome.preload(),
            ),
    ]);
}
