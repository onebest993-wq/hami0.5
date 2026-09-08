import { debug } from '@/app/utils/debug';
import {
    reportRepositoryOpenToSentry,
    type RepositoryPerfReportContext,
} from '@/app/services/repository/repositorySentryReporting';

const MARK_PREFIX = 'hami:repository:';

type RepositoryPerfPhase =
    | 'open-request'
    | 'first-paint'
    | 'interactive'
    | 'zone-request'
    | 'zone-switched';

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
        for (const phase of [
            'open-request',
            'first-paint',
            'interactive',
            'zone-request',
            'zone-switched',
        ] as const) {
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

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getRepositoryOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestPerfMark(`${MARK_PREFIX}open-request`);
    const interactive = latestPerfMark(`${MARK_PREFIX}interactive`);
    if (!open || !interactive) return null;
    if (interactive.startTime < open.startTime) return null;
    return Math.round(interactive.startTime - open.startTime);
}

/** CR-7 ms zone-request → zone-switched (reopen-stale-report, CP-08/CP-09) */
export function getRepositoryZoneSwitchDeltaMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const reqEntries = performance.getEntriesByName(`${MARK_PREFIX}zone-request`, 'mark');
    const doneEntries = performance.getEntriesByName(`${MARK_PREFIX}zone-switched`, 'mark');
    const zoneReq = reqEntries.length > 0 ? reqEntries[reqEntries.length - 1] : null;
    const zoneDone = doneEntries.length > 0 ? doneEntries[doneEntries.length - 1] : null;
    if (!zoneReq || !zoneDone) return null;
    if (zoneDone.startTime < zoneReq.startTime) return null;
    return Math.round(zoneDone.startTime - zoneReq.startTime);
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
