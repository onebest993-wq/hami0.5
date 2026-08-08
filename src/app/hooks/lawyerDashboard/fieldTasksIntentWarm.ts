import {
    prefetchFieldTasksSheetModule,
    prefetchTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { hydrateFieldTasksShellForInstantOpen } from '@/app/runtime/fieldTasksBootHydrator';

/** Entry + ستارة — يمنع waterfall Suspense على أول ضغط */
function prefetchFieldTasksOpenChain(): void {
    prefetchFieldTasksSheetModule();
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry'
    ).catch(() => undefined);
}

function warmQuantumTasksDiskRead(): void {
    void import('@/app/utils/quantumTasksStorage')
        .then((m) => m.warmQuantumTasksDiskRead())
        .catch(() => undefined);
}

/** مسار تسخين الستارة فقط — لا يتنافس مع chunk الأجندة على أول فتح */
function warmFieldTasksSheetPipeline(forceHydrate: boolean): void {
    warmQuantumTasksDiskRead();
    prefetchFieldTasksOpenChain();
    void hydrateFieldTasksShellForInstantOpen(forceHydrate);
}

function deferManagerPrefetch(): void {
    if (typeof window === 'undefined') return;
    queueMicrotask(() => prefetchTasksManagerModule());
}

/** hover/لمس الدوك — ستارة + بيانات فقط؛ الأجندة عند «إدارة الكل» */
export function warmFieldTasksOnHover(): void {
    warmFieldTasksSheetPipeline(false);
}

/** فتح ستارة الميدان — ستارة أولاً؛ الأجندة بعد commit بلا منافسة على الشبكة */
export function warmFieldTasksOnOpen(): void {
    warmFieldTasksSheetPipeline(true);
    deferManagerPrefetch();
}

/** فتح مدير الأجندة — المسار الكامل */
export function warmFieldTasksManagerOnOpen(): void {
    warmFieldTasksSheetPipeline(true);
    prefetchTasksManagerModule();
}
