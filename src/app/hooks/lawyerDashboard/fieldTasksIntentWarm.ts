import { warmTasksWorkspace } from '@/app/utils/lazyComponents';
import { prefetchFieldTasksHubModule } from '@/app/runtime/fieldTasksHubLoader';

/** hover/idle: prefetch chunk فقط — بلا mount React */
export function warmFieldTasksOnHover(): void {
    prefetchFieldTasksHubModule();
}

/** عند فتح مهام الميدان */
export function warmFieldTasksOnOpen(): void {
    warmFieldTasksOnHover();
    warmTasksWorkspace();
}
