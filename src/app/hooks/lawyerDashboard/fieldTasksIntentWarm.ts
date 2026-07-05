import {
    prefetchFieldTasksSheetModule,
    prefetchTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { hydrateFieldTasksShellForInstantOpen } from '@/app/runtime/fieldTasksBootHydrator';

/** hover/idle: prefetch chunk الستارة + تهيئة للفتح الفوري */
export function warmFieldTasksOnHover(): void {
    prefetchFieldTasksSheetModule();
    void hydrateFieldTasksShellForInstantOpen();
}

/** عند فتح مهام الميدان — الستارة أولاً ثم الأجندة في الخلفية */
export function warmFieldTasksOnOpen(): void {
    prefetchFieldTasksSheetModule();
    void hydrateFieldTasksShellForInstantOpen(true);
    prefetchTasksManagerModule();
}
