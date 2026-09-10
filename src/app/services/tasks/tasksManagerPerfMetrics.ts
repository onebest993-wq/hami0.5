import { debug } from '@/app/utils/debug';

const MARK_PREFIX = 'hami:tasks-manager:';

type TasksManagerPerfPhase = 'open-request' | 'first-paint' | 'interactive';

export function markTasksManagerPerfPhase(phase: TasksManagerPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearTasksManagerPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

function latestPerfMark(name: string): PerformanceEntry | null {
    const entries = performance.getEntriesByName(name, 'mark');
    return entries.length > 0 ? entries[entries.length - 1] : null;
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getTasksManagerOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestPerfMark(`${MARK_PREFIX}open-request`);
    const interactive = latestPerfMark(`${MARK_PREFIX}interactive`);
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportTasksManagerPerf(context: { surface?: 'overlay' | 'manager' } = {}): void {
    const ms = getTasksManagerOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[TasksManagerPerf] open→interactive', ms, 'ms', context);
    }
}
