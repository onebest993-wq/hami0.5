import {
    prefetchFieldTasksSheetModule,
    prefetchFieldTasksCurtainCardSurfaces,
    prefetchTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { hydrateFieldTasksShellForInstantOpen } from '@/app/runtime/fieldTasksBootHydrator';
import { warmQuantumTasksDiskRead } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';

/** مسار تسخين الستارة فقط — لا يتنافس مع chunk الأجندة على أول فتح */
function warmFieldTasksSheetCore(forceHydrate: boolean): void {
    warmQuantumTasksDiskRead();
    prefetchFieldTasksSheetModule();
    void hydrateFieldTasksShellForInstantOpen(forceHydrate);
}

function scheduleCurtainCardSurfacesAfterAgenda(): void {
    if (typeof window === 'undefined') {
        prefetchFieldTasksCurtainCardSurfaces();
        return;
    }
    const run = () => prefetchFieldTasksCurtainCardSurfaces();
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 900 });
    } else {
        window.setTimeout(run, 0);
    }
}

/** hover/لمس الدوك — ستارة + بطاقات الستارة؛ الأجندة لا تُحمَّل هنا */
export function warmFieldTasksOnHover(): void {
    warmFieldTasksSheetCore(false);
    prefetchFieldTasksCurtainCardSurfaces();
}

/** فتح ستارة الميدان — hydrate فوراً؛ بطاقات الستارة idle حتى لا تنافس Overlay */
export function warmFieldTasksOnOpen(): void {
    warmFieldTasksSheetCore(true);
    scheduleCurtainCardSurfacesAfterAgenda();
}

/** فتح مدير الأجندة — مقطع الأجندة فقط؛ الثانوي بعد أول تخطيط */
export function warmFieldTasksManagerOnOpen(): void {
    warmQuantumTasksDiskRead();
    prefetchTasksManagerModule();
}
