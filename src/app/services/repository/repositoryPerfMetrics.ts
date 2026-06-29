import { debug } from '@/app/utils/debug';
import {
    reportRepositoryOpenToSentry,
    type RepositoryPerfReportContext,
} from '@/app/services/repository/repositorySentryReporting';

const MARK_PREFIX = 'hami:repository:';

export type RepositoryPerfPhase = 'open-request' | 'first-paint' | 'interactive';

export type { RepositoryPerfReportContext };

export function markRepositoryPerfPhase(phase: RepositoryPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearRepositoryPerfMarks(): void {
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
export function getRepositoryOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportRepositoryPerfIfDev(context?: string): void {
    if (!import.meta.env.DEV) return;
    const ms = getRepositoryOpenToInteractiveMs();
    if (ms == null) return;
    debug.log(`[RepositoryPerf] open→interactive ${ms}ms`, context ?? '');
}

/** DEV: log — PROD (مع DSN): Sentry breadcrumb + metric */
export function reportRepositoryPerf(context: RepositoryPerfReportContext = {}): void {
    const ms = getRepositoryOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[RepositoryPerf] open→interactive', ms, 'ms', context);
    }
    reportRepositoryOpenToSentry(ms, context);
}
