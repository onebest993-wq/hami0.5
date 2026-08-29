import {
    prefetchFieldTasksSheetModule,
    prefetchTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { hydrateFieldTasksShellForInstantOpen } from '@/app/runtime/fieldTasksBootHydrator';

function warmQuantumTasksDiskRead(): void {
    void import('@/app/utils/quantumTasksStorage')
        .then((m) => m.warmQuantumTasksDiskRead())
        .catch(() => undefined);
}

/** مسار تسخين الستارة فقط — لا يتنافس مع chunk الأجندة على أول فتح */
function warmFieldTasksSheetPipeline(forceHydrate: boolean): void {
    warmQuantumTasksDiskRead();
    prefetchFieldTasksSheetModule();
    void hydrateFieldTasksShellForInstantOpen(forceHydrate);
}

/** hover/لمس الدوك — ستارة + بيانات فقط؛ الأجندة عند «إدارة الكل» */
export function warmFieldTasksOnHover(): void {
    warmFieldTasksSheetPipeline(false);
}

/** فتح ستارة الميدان — ستارة فقط */
export function warmFieldTasksOnOpen(): void {
    warmFieldTasksSheetPipeline(true);
}

/** فتح مدير الأجندة — المسار الكامل */
export function warmFieldTasksManagerOnOpen(): void {
    warmFieldTasksSheetPipeline(true);
    prefetchTasksManagerModule();
}
