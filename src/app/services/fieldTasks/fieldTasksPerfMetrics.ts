import { debug } from '@/app/utils/debug';

const MARK_PREFIX = 'hami:field-tasks:';

export type FieldTasksPerfPhase = 'open-request' | 'first-paint' | 'interactive';

export function markFieldTasksPerfPhase(phase: FieldTasksPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearFieldTasksPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getFieldTasksOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportFieldTasksPerfIfDev(context?: string): void {
    if (!import.meta.env.DEV) return;
    const ms = getFieldTasksOpenToInteractiveMs();
    if (ms == null) return;
    debug.log(`[FieldTasksPerf] open→interactive ${ms}ms`, context ?? '');
}

export function reportFieldTasksPerf(context: { surface?: 'sheet' | 'manager' } = {}): void {
    const ms = getFieldTasksOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[FieldTasksPerf] open→interactive', ms, 'ms', context);
    }
}
