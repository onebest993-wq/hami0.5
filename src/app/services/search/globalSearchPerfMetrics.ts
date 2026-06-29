import { debug } from '@/app/utils/debug';
import {
    reportGlobalSearchOpenToSentry,
    type GlobalSearchPerfReportContext,
} from '@/app/services/search/globalSearchSentryReporting';

const MARK_PREFIX = 'hami:global-search:';

export type GlobalSearchPerfPhase = 'open-request' | 'chunk-ready' | 'first-paint' | 'interactive';

export type { GlobalSearchPerfReportContext };

export function markGlobalSearchPerfPhase(phase: GlobalSearchPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearGlobalSearchPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'chunk-ready', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

export function getGlobalSearchOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportGlobalSearchPerf(context: GlobalSearchPerfReportContext = {}): void {
    const ms = getGlobalSearchOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[GlobalSearchPerf] open→interactive', ms, 'ms', context);
    }
    reportGlobalSearchOpenToSentry(ms, context);
}
