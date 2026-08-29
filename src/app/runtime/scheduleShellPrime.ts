/**
 * تسخين التقويم من داخل المضيف — بعد أن أصبح المقطع محمّلاً.
 *
 * لا نستورد `scheduleBootHydrator` هنا. ذلك الملف يقرأ لقطة الإعدادات
 * (~244 ك.ب) لسياسة prefetch قبل النقر. المضيف يعمل بعد الفتح؛ التسخين
 * هنا أحداث محلية + chunk السحابة فقط. سياسة prefetch تبقى في المُرطّب
 * ومسار hover (`scheduleIntentWarm`).
 */
import { prefetchScheduleHubModule } from '@/app/runtime/scheduleHubLoader';
import { runScheduleWarmCore } from '@/app/runtime/scheduleWarmCore';

export function primeScheduleForBoot(): void {
    prefetchScheduleHubModule();
}

/** تسخين بيانات عند arm/فتح — بلا إعادة سحب إعدادات التسخين */
export function primeScheduleForWarm(userId?: string | null): void {
    runScheduleWarmCore({ userId, prefetchCloud: 'when-user' });
}
