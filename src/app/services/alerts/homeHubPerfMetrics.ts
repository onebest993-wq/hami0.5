import { debug } from '@/app/utils/debug';
import {
    reportHomeHubOpenToSentry,
    type HomeHubSentryReportContext,
} from '@/app/services/alerts/homeHubSentryReporting';

const MARK_PREFIX = 'hami:home-hub:';

export type HomeHubPerfPhase = 'open-request' | 'first-paint' | 'interactive';

export type HomeHubPerfReportContext = {
    userId?: string;
    alertsTabCount?: number;
    pinsCount?: number;
    hadRadarCache?: boolean;
    hadAlertsCache?: boolean;
};

export function markHomeHubPerfPhase(phase: HomeHubPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearHomeHubPerfMarks(): void {
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
export function getHomeHubOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportHomeHubPerfIfDev(context?: HomeHubPerfReportContext | string): void {
    if (!import.meta.env.DEV) return;
    const ms = getHomeHubOpenToInteractiveMs();
    if (ms == null) return;
    debug.log(`[HomeHubPerf] open→interactive ${ms}ms`, context ?? '');
}

export function reportHomeHubPerf(context: HomeHubPerfReportContext = {}): void {
    const ms = getHomeHubOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[HomeHubPerf] open→interactive', ms, 'ms', context);
    }
    reportHomeHubOpenToSentry(ms, context as HomeHubSentryReportContext);
}
