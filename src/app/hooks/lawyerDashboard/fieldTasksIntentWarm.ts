import {
    prefetchFieldTasksSheetModule,
    prefetchTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { hydrateFieldTasksShellForInstantOpen } from '@/app/runtime/fieldTasksBootHydrator';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

/** Entry + ستارة — يمنع waterfall Suspense على أول ضغط (مثل المعاملات) */
function prefetchFieldTasksOpenChain(): void {
    prefetchFieldTasksSheetModule();
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry'
    ).catch(() => undefined);
}

/** مدير الأجندة بعد الخمول — لا يسرق عرض التنزيل من فتح الستارة */
function warmTasksManagerIdle(): void {
    scheduleIdleWork(() => prefetchTasksManagerModule(), { minDelayMs: 0, timeoutMs: 5_000 });
}

/** hover/idle: prefetch Entry + chunk الستارة + تهيئة للفتح الفوري */
export function warmFieldTasksOnHover(): void {
    prefetchFieldTasksOpenChain();
    void hydrateFieldTasksShellForInstantOpen();
}

/** عند فتح مهام الميدان — Entry + الستارة فوراً؛ المدير على idle */
export function warmFieldTasksOnOpen(): void {
    prefetchFieldTasksOpenChain();
    void hydrateFieldTasksShellForInstantOpen(true);
    warmTasksManagerIdle();
}
